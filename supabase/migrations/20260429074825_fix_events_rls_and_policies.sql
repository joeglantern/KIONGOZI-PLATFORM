-- ============================================================
-- Fix event RLS policies
-- Problems fixed:
--   1. "Anyone can view rsvps" leaks attendance lists (privacy risk for protests etc.)
--   2. No UPDATE/DELETE policy on social_event_rsvps — users couldn't un-RSVP or change status
--   3. No UPDATE/DELETE policy on social_events — creators couldn't edit/delete their events
-- ============================================================

-- ── social_event_rsvps ──────────────────────────────────────

-- Drop the over-permissive public read policy
DROP POLICY IF EXISTS "Anyone can view rsvps" ON social_event_rsvps;

-- Users can only see their own RSVPs, or the event host can see all RSVPs for their event
CREATE POLICY "Users can view own rsvps or event host sees all"
    ON social_event_rsvps FOR SELECT
    USING (
        auth.uid() = user_id
        OR auth.uid() = (SELECT created_by FROM social_events WHERE id = event_id)
    );

-- Users can change their RSVP status (going <-> interested)
CREATE POLICY "Users can update own rsvps"
    ON social_event_rsvps FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can remove their RSVP
CREATE POLICY "Users can delete own rsvps"
    ON social_event_rsvps FOR DELETE
    USING (auth.uid() = user_id);

-- ── social_events ───────────────────────────────────────────

-- Event creators can edit their own events (title, description, recording_url, etc.)
CREATE POLICY "Creators can update own events"
    ON social_events FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Event creators can delete their own events
CREATE POLICY "Creators can delete own events"
    ON social_events FOR DELETE
    USING (auth.uid() = created_by);