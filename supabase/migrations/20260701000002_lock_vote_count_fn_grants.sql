-- The vote-count trigger function was made SECURITY DEFINER (so it can bypass
-- the tightened poll_options RLS and still increment on every vote). It is only
-- ever invoked by the AFTER INSERT trigger on poll_responses, no role needs to
-- call it directly. Revoke EXECUTE so it is not exposed as a callable
-- SECURITY DEFINER function (satisfies the anon_security_definer advisor).
-- Trigger firing does not require EXECUTE, so vote counting is unaffected.
REVOKE ALL ON FUNCTION public.increment_option_vote_count() FROM PUBLIC, anon, authenticated;
