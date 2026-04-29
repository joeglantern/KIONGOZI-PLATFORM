-- Trigger functions that UPDATE counter columns need SECURITY DEFINER so they run
-- as the function owner (postgres) and bypass RLS on the target tables.
-- Without this, the authenticated role's RLS blocks the UPDATE even inside a trigger.

CREATE OR REPLACE FUNCTION increment_option_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.option_id IS NOT NULL THEN
        UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = NEW.option_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION increment_poll_response_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE policy_polls SET response_count = response_count + 1 WHERE id = NEW.poll_id;
    RETURN NEW;
END;
$$;
