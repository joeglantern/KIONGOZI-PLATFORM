-- Make reward writes server-authoritative and idempotent.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.reward_claims (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action_type text NOT NULL,
    action_id text NOT NULL,
    xp_awarded integer NOT NULL CHECK (xp_awarded BETWEEN 0 AND 1000),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, action_type, action_id)
);

ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reward_claims_select_own ON public.reward_claims;
CREATE POLICY reward_claims_select_own
ON public.reward_claims FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.reward_claims FROM anon, authenticated;
GRANT SELECT ON public.reward_claims TO authenticated;

CREATE TABLE IF NOT EXISTS public.intro_mission_completions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mission_key text NOT NULL,
    selected_answer text NOT NULL,
    is_correct boolean NOT NULL,
    completed_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, mission_key)
);

ALTER TABLE public.intro_mission_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS intro_mission_select_own ON public.intro_mission_completions;
CREATE POLICY intro_mission_select_own
ON public.intro_mission_completions FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.intro_mission_completions FROM anon, authenticated;
GRANT SELECT ON public.intro_mission_completions TO authenticated;

CREATE OR REPLACE FUNCTION private.award_once(
    p_user_id uuid,
    p_action_type text,
    p_action_id text,
    p_xp integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_claim public.reward_claims%ROWTYPE;
    v_total integer;
    v_level integer;
BEGIN
    IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;
    IF p_xp < 0 OR p_xp > 1000 THEN
        RAISE EXCEPTION 'Invalid reward';
    END IF;

    INSERT INTO public.reward_claims (user_id, action_type, action_id, xp_awarded)
    VALUES (p_user_id, p_action_type, p_action_id, p_xp)
    ON CONFLICT (user_id, action_type, action_id) DO NOTHING
    RETURNING * INTO v_claim;

    IF v_claim.id IS NULL THEN
        SELECT COALESCE(total_xp, 0), COALESCE(level, 1)
        INTO v_total, v_level
        FROM public.profiles WHERE id = p_user_id;
        RETURN jsonb_build_object('awarded', false, 'xp_awarded', 0, 'total_xp', v_total, 'level', v_level);
    END IF;

    PERFORM set_config('app.reward_write', '1', true);
    UPDATE public.profiles
    SET total_xp = COALESCE(total_xp, 0) + p_xp,
        level = GREATEST(1, FLOOR(SQRT((COALESCE(total_xp, 0) + p_xp) / 50.0))),
        last_action_date = now(),
        updated_at = now()
    WHERE id = p_user_id
    RETURNING total_xp, level INTO v_total, v_level;

    INSERT INTO public.user_activities (user_id, activity_type, details)
    VALUES (p_user_id, 'xp_awarded', jsonb_build_object(
        'action_type', p_action_type,
        'action_id', p_action_id,
        'xp', p_xp
    ));

    RETURN jsonb_build_object('awarded', true, 'xp_awarded', p_xp, 'total_xp', v_total, 'level', v_level);
END;
$$;

CREATE OR REPLACE FUNCTION private.claim_intro_mission_internal(
    p_mission_key text,
    p_answer text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user uuid := auth.uid();
    v_correct boolean;
    v_result jsonb;
BEGIN
    IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
    IF p_mission_key <> 'county-youth-centre' THEN RAISE EXCEPTION 'Unknown mission'; END IF;
    IF p_answer NOT IN ('check-budget-records', 'post-accusation', 'wait-for-update') THEN
        RAISE EXCEPTION 'Invalid answer';
    END IF;

    v_correct := p_answer = 'check-budget-records';
    INSERT INTO public.intro_mission_completions (user_id, mission_key, selected_answer, is_correct)
    VALUES (v_user, p_mission_key, p_answer, v_correct)
    ON CONFLICT (user_id, mission_key) DO NOTHING;

    SELECT private.award_once(v_user, 'intro_mission', p_mission_key, CASE WHEN v_correct THEN 25 ELSE 10 END)
    INTO v_result;
    RETURN v_result || jsonb_build_object('correct', v_correct);
END;
$$;

CREATE OR REPLACE FUNCTION private.claim_module_completion_internal(p_module_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
    IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.user_progress
        WHERE user_id = v_user AND module_id = p_module_id AND status = 'completed'
    ) THEN RAISE EXCEPTION 'Completed module not found'; END IF;
    RETURN private.award_once(v_user, 'module_completion', p_module_id::text, 100);
END;
$$;

CREATE OR REPLACE FUNCTION private.claim_petition_signature_internal(p_petition_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
    IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.social_petition_signatures
        WHERE user_id = v_user AND petition_id = p_petition_id
    ) THEN RAISE EXCEPTION 'Petition signature not found'; END IF;
    RETURN private.award_once(v_user, 'petition_signature', p_petition_id::text, 50);
END;
$$;

CREATE OR REPLACE FUNCTION private.claim_poll_submission_internal(p_poll_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
    IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.poll_submissions
        WHERE user_id = v_user AND poll_id = p_poll_id
    ) THEN RAISE EXCEPTION 'Poll submission not found'; END IF;
    RETURN private.award_once(v_user, 'poll_submission', p_poll_id::text, 20);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_intro_mission(p_mission_key text, p_answer text)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.claim_intro_mission_internal(p_mission_key, p_answer) $$;

CREATE OR REPLACE FUNCTION public.claim_module_completion(p_module_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.claim_module_completion_internal(p_module_id) $$;

CREATE OR REPLACE FUNCTION public.claim_petition_signature(p_petition_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.claim_petition_signature_internal(p_petition_id) $$;

CREATE OR REPLACE FUNCTION public.claim_poll_submission(p_poll_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.claim_poll_submission_internal(p_poll_id) $$;

REVOKE ALL ON FUNCTION public.claim_intro_mission(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_module_completion(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_petition_signature(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_poll_submission(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_intro_mission(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_module_completion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_petition_signature(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_poll_submission(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.claim_intro_mission_internal(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.claim_module_completion_internal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.claim_petition_signature_internal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.claim_poll_submission_internal(uuid) TO authenticated;
REVOKE ALL ON FUNCTION private.award_once(uuid, text, text, integer) FROM PUBLIC, anon, authenticated;

-- The legacy arbitrary-amount RPC remains available only to trusted server code.
REVOKE ALL ON FUNCTION public.award_lms_action(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_lms_action(uuid, integer) TO service_role;
ALTER FUNCTION public.award_lms_action(uuid, integer) SET search_path = public, pg_temp;

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
           NEW.role IS DISTINCT FROM OLD.role OR
           NEW.status IS DISTINCT FROM OLD.status
       ) THEN
        RAISE EXCEPTION 'Protected profile fields can only be updated by trusted reward services';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_reward_fields ON public.profiles;
CREATE TRIGGER guard_profile_reward_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.guard_profile_reward_fields();

REVOKE ALL ON FUNCTION private.guard_profile_reward_fields() FROM PUBLIC, anon, authenticated;

