-- Extend the protected profile-field guard to streak recovery inventory.
CREATE OR REPLACE FUNCTION private.guard_profile_reward_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF auth.role() <> 'service_role'
       AND COALESCE(current_setting('app.reward_write', true), '') <> '1'
       AND (
           NEW.total_xp IS DISTINCT FROM OLD.total_xp OR
           NEW.level IS DISTINCT FROM OLD.level OR
           NEW.current_streak IS DISTINCT FROM OLD.current_streak OR
           NEW.longest_streak IS DISTINCT FROM OLD.longest_streak OR
           NEW.last_action_date IS DISTINCT FROM OLD.last_action_date OR
           NEW.streak_freezes IS DISTINCT FROM OLD.streak_freezes OR
           NEW.last_streak_recovery_at IS DISTINCT FROM OLD.last_streak_recovery_at OR
           NEW.role IS DISTINCT FROM OLD.role OR
           NEW.status IS DISTINCT FROM OLD.status
       ) THEN
        RAISE EXCEPTION 'Protected profile fields can only be updated by trusted reward services';
    END IF;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.guard_profile_reward_fields() FROM PUBLIC, anon, authenticated;

