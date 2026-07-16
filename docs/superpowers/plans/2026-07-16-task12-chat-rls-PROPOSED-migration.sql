-- ============================================================================
-- PROPOSED (NOT YET APPLIED), Kiongozi UX audit 2026-07-16, Critical #12
-- chat_participants RLS hardening
--
-- ⚠️  DO NOT `supabase db push` THIS FILE AS-IS. It lives in docs/ (not
--     supabase/migrations/) ON PURPOSE so it cannot auto-apply untested.
--     It MUST be verified against the LIVE Kiongozi database and smoke-tested
--     before being promoted into supabase/migrations/ and applied.
--
-- Why it could not be applied/verified in the audit-fix session:
--   * The only Supabase MCP connected in that session pointed at a DIFFERENT
--     project (oqylcvpkrjcozthdaavr), not Kiongozi (jdncfyagppohtksogzkx). So
--     the LIVE policy state could not be read and this change could not be
--     tested. The repo may not match live (someone may have hand-edited
--     policies in the dashboard), VERIFY FIRST with:
--         select policyname, cmd, qual, with_check
--         from pg_policies where tablename = 'chat_participants';
--
-- ============================================================================
-- CONFIRMED PROBLEM (from the repo)
--   migrations/fix_all_issues.sql:164-165 defines:
--     CREATE POLICY "Participants management" ON chat_participants
--       FOR ALL USING (auth.role() = 'authenticated');
--   => ANY authenticated user can INSERT/SELECT/UPDATE/DELETE ANY row, i.e.
--      self-join ANY room (course or private DM). The message-visibility
--      policies gate on chat_participants membership, so this makes that gate
--      bypassable, a user can read/post in any room by first inserting
--      themselves as a participant.
--   Nothing in the canonical supabase/migrations/ folder supersedes this.
--
-- KEY FINDING that changes the fix shape (differs from the audit's assumption):
--   get_course_chat_room(p_course_id) [SECURITY DEFINER, fix_all_issues.sql:118]
--   does NOT insert the caller as a participant and does NOT check enrollment, 
--   it only finds/creates the room and returns its id. The course-room JOIN is
--   therefore a RAW CLIENT-SIDE INSERT into chat_participants (governed by the
--   permissive policy above). There is NO enrollment gate anywhere today.
--   => Simply restricting INSERT to (auth.uid() = user_id) is NOT enough: a user
--      could still self-join any room, just not add other people. The gate has
--      to be enrollment-aware, OR the insert has to move into an enrollment-
--      checking SECURITY DEFINER RPC.
--
--   get_private_chat_room / create_private_chat [SECURITY DEFINER] DO insert
--   both participants inside the function, so they bypass RLS and keep working
--   regardless of the tightened policy. Private-DM joins are therefore fine.
--
-- ============================================================================
-- OPTION A (pure RLS, no client change), enrollment-scoped INSERT.
-- Preferred if verified to not recurse and to match the real schema.
-- ============================================================================

-- SELECT: a user may see participant rows for rooms they belong to.
-- NOTE: a self-referential subquery on chat_participants inside its OWN RLS
-- SELECT policy can cause infinite recursion in Postgres. If that happens,
-- fall back to `USING (user_id = auth.uid())` (each user sees only their own
-- participation rows) and fetch co-participant display data via a SECURITY
-- DEFINER RPC instead. VERIFY which is needed against the live DB.
DROP POLICY IF EXISTS "Participants management" ON chat_participants;

CREATE POLICY "View participants of rooms you are in"
  ON chat_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_participants self
      WHERE self.room_id = chat_participants.room_id
        AND self.user_id = auth.uid()
    )
  );

-- INSERT: you may only add YOURSELF, and only to:
--   * a course 'group' room whose course you have an active/completed
--     enrollment in, OR
--   * (private rooms are created by the SECURITY DEFINER RPC, which bypasses
--     RLS, so no direct-client private insert is needed here.)
CREATE POLICY "Join course rooms you are enrolled in"
  ON chat_participants FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM chat_rooms r
      JOIN course_enrollments e
        ON e.course_id = r.course_id
       AND e.user_id = auth.uid()
       AND e.status IN ('active', 'completed')
      WHERE r.id = chat_participants.room_id
        AND r.type = 'group'
        AND r.course_id IS NOT NULL
    )
  );

-- Optional: allow a participant to update ONLY their own row (e.g. last_read_at
-- from the unread-indicator work in Phase 2), and delete only their own row.
CREATE POLICY "Update your own participation"
  ON chat_participants FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Leave rooms (delete your own participation)"
  ON chat_participants FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- OPTION B (move the gate into an RPC), if Option A's INSERT policy proves
-- awkward or the client insert path is hard to change to satisfy it.
-- Replace the client's direct `insert into chat_participants` for course rooms
-- with a SECURITY DEFINER RPC that (1) checks course_enrollments for the caller,
-- (2) inserts the participant, and set the chat_participants INSERT policy to
-- `WITH CHECK (false)` so ALL joins must go through enrollment-checking RPCs.
-- This requires a matching client change (ChatWindow / course discussion tab).
-- ============================================================================

-- VERIFICATION CHECKLIST before promoting to supabase/migrations/ and applying:
--   [ ] Read live pg_policies for chat_participants, confirm the permissive
--       "Participants management" policy is actually still live.
--   [ ] Confirm column/type assumptions: chat_rooms(type, course_id),
--       course_enrollments(user_id, course_id, status enum values).
--   [ ] Apply on a branch/staging DB, then verify as a real enrolled student:
--         - opening a course's discussion tab still joins + shows messages
--         - a NON-enrolled user can no longer self-insert into that room
--         - private DMs (created via the definer RPC) still work
--         - RoomList still renders co-participant names (SELECT policy OK, no
--           recursion error)
--   [ ] Only then move this into supabase/migrations/<timestamp>_...sql.
