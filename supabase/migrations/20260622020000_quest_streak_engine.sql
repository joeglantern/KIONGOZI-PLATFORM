-- Server-authoritative quests, daily goals, and timezone-aware streaks.
CREATE TABLE IF NOT EXISTS public.quest_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    title text NOT NULL,
    description text NOT NULL,
    quest_type text NOT NULL CHECK (quest_type IN ('daily','weekly','path','community')),
    metric text NOT NULL CHECK (metric IN ('intro_mission','module_completion','skill_completion','poll_submission','petition_signature')),
    target_count integer NOT NULL CHECK (target_count > 0),
    xp_reward integer NOT NULL CHECK (xp_reward BETWEEN 0 AND 1000),
    estimated_minutes integer NOT NULL DEFAULT 5 CHECK (estimated_minutes > 0),
    path_slug text REFERENCES public.learning_paths(slug) ON UPDATE CASCADE ON DELETE CASCADE,
    icon_name text NOT NULL DEFAULT 'target',
    sort_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_quests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    quest_template_id uuid NOT NULL REFERENCES public.quest_templates(id) ON DELETE CASCADE,
    period_key text NOT NULL,
    starts_at timestamptz NOT NULL,
    expires_at timestamptz,
    progress_count integer NOT NULL DEFAULT 0 CHECK (progress_count >= 0),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','expired')),
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, quest_template_id, period_key)
);

CREATE TABLE IF NOT EXISTS public.quest_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    metric text NOT NULL,
    source_id text NOT NULL,
    minutes_earned integer NOT NULL DEFAULT 0 CHECK (minutes_earned BETWEEN 0 AND 240),
    occurred_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, metric, source_id)
);

CREATE TABLE IF NOT EXISTS public.daily_learning_activity (
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity_date date NOT NULL,
    minutes_earned integer NOT NULL DEFAULT 0 CHECK (minutes_earned >= 0),
    action_count integer NOT NULL DEFAULT 0 CHECK (action_count >= 0),
    goal_minutes integer NOT NULL CHECK (goal_minutes IN (5,10,15)),
    goal_completed_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, activity_date)
);

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Africa/Nairobi',
    ADD COLUMN IF NOT EXISTS streak_freezes integer NOT NULL DEFAULT 1 CHECK (streak_freezes BETWEEN 0 AND 5),
    ADD COLUMN IF NOT EXISTS last_streak_recovery_at timestamptz;

ALTER TABLE public.quest_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_learning_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY quest_templates_read_active ON public.quest_templates FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY user_quests_read_own ON public.user_quests FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY quest_events_read_own ON public.quest_events FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY daily_activity_read_own ON public.daily_learning_activity FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

GRANT SELECT ON public.quest_templates, public.user_quests, public.quest_events, public.daily_learning_activity TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.quest_templates, public.user_quests, public.quest_events, public.daily_learning_activity FROM anon, authenticated;

INSERT INTO public.quest_templates (slug,title,description,quest_type,metric,target_count,xp_reward,estimated_minutes,icon_name,sort_order)
VALUES
('daily-learn','Make one learning move','Complete one lesson or mission today.','daily','module_completion',1,20,10,'book-open',1),
('daily-policy-voice','Use your voice','Respond to one Policy Pulse today.','daily','poll_submission',1,15,3,'vote',2),
('daily-community-action','Take civic action','Support one verified community petition.','daily','petition_signature',1,15,2,'users',3),
('weekly-momentum','Build weekly momentum','Complete three learning modules this week.','weekly','module_completion',3,75,30,'flame',10),
('weekly-community','Join the conversation','Complete two verified community actions this week.','weekly','poll_submission',2,50,8,'message-circle',11),
('path-skill-unlock','Unlock your next skill','Complete one skill node on your selected path.','path','skill_completion',1,100,20,'sparkles',20)
ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,target_count=EXCLUDED.target_count,xp_reward=EXCLUDED.xp_reward,estimated_minutes=EXCLUDED.estimated_minutes,is_active=true,updated_at=now();

CREATE OR REPLACE FUNCTION private.safe_timezone(p_timezone text) RETURNS text
LANGUAGE sql STABLE SET search_path='' AS $$
    SELECT CASE WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=p_timezone) THEN p_timezone ELSE 'Africa/Nairobi' END
$$;

CREATE OR REPLACE FUNCTION private.ensure_user_quests(p_user uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_tz text; v_date date; v_week text; v_inserted integer;
BEGIN
    IF p_user IS NULL OR p_user <> auth.uid() THEN RAISE EXCEPTION 'Not authorized'; END IF;
    SELECT private.safe_timezone(timezone) INTO v_tz FROM public.profiles WHERE id=p_user;
    v_date := (now() AT TIME ZONE v_tz)::date;
    v_week := to_char(v_date, 'IYYY-"W"IW');

    INSERT INTO public.user_quests(user_id,quest_template_id,period_key,starts_at,expires_at)
    SELECT p_user,q.id,
      CASE q.quest_type WHEN 'daily' THEN v_date::text WHEN 'weekly' THEN v_week ELSE 'ever' END,
      CASE q.quest_type WHEN 'daily' THEN v_date::timestamp AT TIME ZONE v_tz WHEN 'weekly' THEN date_trunc('week',v_date::timestamp) AT TIME ZONE v_tz ELSE now() END,
      CASE q.quest_type WHEN 'daily' THEN (v_date+1)::timestamp AT TIME ZONE v_tz WHEN 'weekly' THEN (date_trunc('week',v_date::timestamp)+interval '7 day') AT TIME ZONE v_tz ELSE NULL END
    FROM public.quest_templates q
    JOIN public.profiles p ON p.id=p_user
    WHERE q.is_active=true AND (q.path_slug IS NULL OR q.path_slug=p.focus_path)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;

    UPDATE public.user_quests SET status='expired',updated_at=now()
    WHERE user_id=p_user AND status='active' AND expires_at IS NOT NULL AND expires_at<=now();
    RETURN v_inserted;
END; $$;

CREATE OR REPLACE FUNCTION private.record_quest_event(p_user uuid,p_metric text,p_source_id text,p_minutes integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_tz text; v_date date; v_goal integer; v_last date; v_new_streak integer; v_event uuid; v_q record; v_reward jsonb; v_completed integer:=0;
BEGIN
    IF p_user IS NULL OR p_user<>auth.uid() THEN RAISE EXCEPTION 'Not authorized'; END IF;
    IF p_metric NOT IN ('intro_mission','module_completion','skill_completion','poll_submission','petition_signature') THEN RAISE EXCEPTION 'Invalid metric'; END IF;
    PERFORM private.ensure_user_quests(p_user);
    INSERT INTO public.quest_events(user_id,metric,source_id,minutes_earned) VALUES(p_user,p_metric,p_source_id,LEAST(240,GREATEST(0,p_minutes))) ON CONFLICT DO NOTHING RETURNING id INTO v_event;
    IF v_event IS NULL THEN RETURN jsonb_build_object('recorded',false,'quests_completed',0); END IF;

    SELECT private.safe_timezone(timezone),COALESCE(daily_goal_minutes,10),(last_action_date AT TIME ZONE private.safe_timezone(timezone))::date
    INTO v_tz,v_goal,v_last FROM public.profiles WHERE id=p_user;
    v_date := (now() AT TIME ZONE v_tz)::date;
    INSERT INTO public.daily_learning_activity(user_id,activity_date,minutes_earned,action_count,goal_minutes)
    VALUES(p_user,v_date,LEAST(240,GREATEST(0,p_minutes)),1,v_goal)
    ON CONFLICT(user_id,activity_date) DO UPDATE SET minutes_earned=public.daily_learning_activity.minutes_earned+EXCLUDED.minutes_earned,action_count=public.daily_learning_activity.action_count+1,goal_minutes=EXCLUDED.goal_minutes,updated_at=now();
    UPDATE public.daily_learning_activity SET goal_completed_at=COALESCE(goal_completed_at,now()) WHERE user_id=p_user AND activity_date=v_date AND minutes_earned>=goal_minutes;

    v_new_streak := CASE WHEN v_last=v_date THEN NULL WHEN v_last=v_date-1 THEN NULL ELSE 1 END;
    PERFORM set_config('app.reward_write','1',true);
    UPDATE public.profiles SET
      current_streak=CASE WHEN v_last=v_date THEN current_streak WHEN v_last=v_date-1 THEN COALESCE(current_streak,0)+1 ELSE 1 END,
      longest_streak=GREATEST(COALESCE(longest_streak,0),CASE WHEN v_last=v_date THEN COALESCE(current_streak,0) WHEN v_last=v_date-1 THEN COALESCE(current_streak,0)+1 ELSE 1 END),
      last_action_date=now(),updated_at=now()
    WHERE id=p_user;

    FOR v_q IN
      UPDATE public.user_quests uq SET progress_count=LEAST(q.target_count,uq.progress_count+1),status=CASE WHEN uq.progress_count+1>=q.target_count THEN 'completed' ELSE 'active' END,completed_at=CASE WHEN uq.progress_count+1>=q.target_count THEN COALESCE(uq.completed_at,now()) ELSE NULL END,updated_at=now()
      FROM public.quest_templates q WHERE uq.quest_template_id=q.id AND uq.user_id=p_user AND uq.status='active' AND q.metric=p_metric AND (uq.expires_at IS NULL OR uq.expires_at>now())
      RETURNING uq.id,q.title,q.xp_reward,uq.status
    LOOP
      IF v_q.status='completed' THEN
        SELECT private.award_once(p_user,'quest_completion',v_q.id::text,v_q.xp_reward) INTO v_reward;
        IF COALESCE((v_reward->>'awarded')::boolean,false) THEN
          v_completed:=v_completed+1;
          INSERT INTO public.notifications(user_id,type,title,message,link,metadata) VALUES(p_user,'system','Quest complete: '||v_q.title,'Your reward is secured. Choose your next mission.','/dashboard',jsonb_build_object('kind','quest_completed','quest_id',v_q.id,'xp',v_q.xp_reward));
        END IF;
      END IF;
    END LOOP;
    RETURN jsonb_build_object('recorded',true,'quests_completed',v_completed);
END; $$;

CREATE OR REPLACE FUNCTION private.recover_streak_internal() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=auth.uid(); v_tz text; v_date date; v_last date; v_freezes integer; v_recovered timestamptz;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT private.safe_timezone(timezone),(last_action_date AT TIME ZONE private.safe_timezone(timezone))::date,streak_freezes,last_streak_recovery_at INTO v_tz,v_last,v_freezes,v_recovered FROM public.profiles WHERE id=v_user;
  v_date:=(now() AT TIME ZONE v_tz)::date;
  IF v_freezes<1 OR v_last<>v_date-2 OR (v_recovered IS NOT NULL AND v_recovered>now()-interval '30 days') THEN RAISE EXCEPTION 'Streak recovery is not available'; END IF;
  PERFORM set_config('app.reward_write','1',true);
  UPDATE public.profiles SET streak_freezes=streak_freezes-1,last_action_date=((v_date-1)::timestamp AT TIME ZONE v_tz),last_streak_recovery_at=now(),updated_at=now() WHERE id=v_user;
  RETURN jsonb_build_object('recovered',true,'freezes_remaining',v_freezes-1);
END; $$;

CREATE OR REPLACE FUNCTION public.ensure_my_quests() RETURNS integer LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.ensure_user_quests(auth.uid()) $$;
CREATE OR REPLACE FUNCTION public.recover_my_streak() RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.recover_streak_internal() $$;
REVOKE ALL ON FUNCTION public.ensure_my_quests() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.recover_my_streak() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_quests(),public.recover_my_streak() TO authenticated;
GRANT EXECUTE ON FUNCTION private.ensure_user_quests(uuid),private.recover_streak_internal() TO authenticated;
REVOKE ALL ON FUNCTION private.record_quest_event(uuid,text,text,integer),private.safe_timezone(text) FROM PUBLIC,anon,authenticated;

-- Attach verified product actions to the shared quest pipeline.
CREATE OR REPLACE FUNCTION private.claim_petition_signature_internal(p_petition_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=auth.uid(); v_result jsonb;
BEGIN IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.social_petition_signatures WHERE user_id=v_user AND petition_id=p_petition_id) THEN RAISE EXCEPTION 'Petition signature not found'; END IF;
 SELECT private.award_once(v_user,'petition_signature',p_petition_id::text,50) INTO v_result;
 PERFORM private.record_quest_event(v_user,'petition_signature',p_petition_id::text,2);
 RETURN v_result; END; $$;

CREATE OR REPLACE FUNCTION private.claim_poll_submission_internal(p_poll_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=auth.uid(); v_result jsonb;
BEGIN IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.poll_submissions WHERE user_id=v_user AND poll_id=p_poll_id) THEN RAISE EXCEPTION 'Poll submission not found'; END IF;
 SELECT private.award_once(v_user,'poll_submission',p_poll_id::text,20) INTO v_result;
 PERFORM private.record_quest_event(v_user,'poll_submission',p_poll_id::text,3);
 RETURN v_result; END; $$;

CREATE INDEX IF NOT EXISTS idx_user_quests_user_status ON public.user_quests(user_id,status,expires_at);
CREATE INDEX IF NOT EXISTS idx_quest_events_user_time ON public.quest_events(user_id,occurred_at DESC);

-- Every verified reward claim feeds the quest pipeline exactly once.
CREATE OR REPLACE FUNCTION private.on_verified_reward_claim() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_metric text; v_minutes integer;
BEGIN
  v_metric:=CASE NEW.action_type
    WHEN 'intro_mission' THEN 'intro_mission'
    WHEN 'module_completion' THEN 'module_completion'
    WHEN 'skill_node_completion' THEN 'skill_completion'
    WHEN 'poll_submission' THEN 'poll_submission'
    WHEN 'petition_signature' THEN 'petition_signature'
    ELSE NULL END;
  IF v_metric IS NULL THEN RETURN NEW; END IF;
  v_minutes:=CASE v_metric WHEN 'module_completion' THEN 10 WHEN 'skill_completion' THEN 5 WHEN 'poll_submission' THEN 3 WHEN 'petition_signature' THEN 2 ELSE 3 END;
  PERFORM private.record_quest_event(NEW.user_id,v_metric,NEW.action_id,v_minutes);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS reward_claim_quest_event ON public.reward_claims;
CREATE TRIGGER reward_claim_quest_event AFTER INSERT ON public.reward_claims
FOR EACH ROW EXECUTE FUNCTION private.on_verified_reward_claim();
REVOKE ALL ON FUNCTION private.on_verified_reward_claim() FROM PUBLIC,anon,authenticated;
