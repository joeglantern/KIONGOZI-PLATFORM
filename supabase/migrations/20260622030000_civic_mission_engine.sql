-- Secure, resumable scenario missions with server-side answer validation.
CREATE TABLE public.learning_missions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE, title text NOT NULL,
 description text NOT NULL, path_id uuid NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
 node_id uuid UNIQUE REFERENCES public.skill_nodes(id) ON DELETE SET NULL, estimated_minutes integer NOT NULL,
 passing_score integer NOT NULL DEFAULT 80 CHECK(passing_score BETWEEN 1 AND 100), is_published boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.mission_steps (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mission_id uuid NOT NULL REFERENCES public.learning_missions(id) ON DELETE CASCADE,
 slug text NOT NULL, order_index integer NOT NULL, title text NOT NULL, prompt text NOT NULL, context text,
 learning_point text NOT NULL, UNIQUE(mission_id,slug), UNIQUE(mission_id,order_index)
);
CREATE TABLE public.mission_options (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), step_id uuid NOT NULL REFERENCES public.mission_steps(id) ON DELETE CASCADE,
 order_index integer NOT NULL, label text NOT NULL, feedback text NOT NULL, is_correct boolean NOT NULL DEFAULT false,
 UNIQUE(step_id,order_index)
);
CREATE TABLE public.mission_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 mission_id uuid NOT NULL REFERENCES public.learning_missions(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'in_progress' CHECK(status IN('in_progress','completed')),
 best_score integer NOT NULL DEFAULT 0 CHECK(best_score BETWEEN 0 AND 100), started_at timestamptz NOT NULL DEFAULT now(),
 last_activity_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz, UNIQUE(user_id,mission_id)
);
CREATE TABLE public.mission_responses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), attempt_id uuid NOT NULL REFERENCES public.mission_attempts(id) ON DELETE CASCADE,
 step_id uuid NOT NULL REFERENCES public.mission_steps(id) ON DELETE CASCADE, selected_option_id uuid NOT NULL REFERENCES public.mission_options(id) ON DELETE RESTRICT,
 is_correct boolean NOT NULL, response_count integer NOT NULL DEFAULT 1, responded_at timestamptz NOT NULL DEFAULT now(), UNIQUE(attempt_id,step_id)
);
CREATE TABLE public.mission_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 mission_id uuid NOT NULL REFERENCES public.learning_missions(id) ON DELETE CASCADE, attempt_id uuid REFERENCES public.mission_attempts(id) ON DELETE CASCADE,
 event_type text NOT NULL CHECK(event_type IN('started','answered','retried','mastered')), step_id uuid REFERENCES public.mission_steps(id) ON DELETE SET NULL,
 metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_missions ENABLE ROW LEVEL SECURITY; ALTER TABLE public.mission_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_options ENABLE ROW LEVEL SECURITY; ALTER TABLE public.mission_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_responses ENABLE ROW LEVEL SECURITY; ALTER TABLE public.mission_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY mission_attempts_read_own ON public.mission_attempts FOR SELECT TO authenticated USING(auth.uid()=user_id AND COALESCE((auth.jwt()->>'is_anonymous')::boolean,false)=false);
CREATE POLICY mission_responses_read_own ON public.mission_responses FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.mission_attempts a WHERE a.id=attempt_id AND a.user_id=auth.uid()) AND COALESCE((auth.jwt()->>'is_anonymous')::boolean,false)=false);
CREATE POLICY mission_events_read_own ON public.mission_events FOR SELECT TO authenticated USING(auth.uid()=user_id AND COALESCE((auth.jwt()->>'is_anonymous')::boolean,false)=false);
GRANT SELECT ON public.mission_attempts,public.mission_responses,public.mission_events TO authenticated;
REVOKE ALL ON public.learning_missions,public.mission_steps,public.mission_options FROM anon,authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.mission_attempts,public.mission_responses,public.mission_events FROM anon,authenticated;

-- Insert a genuine mission node between evidence literacy and the first course.
UPDATE public.skill_nodes SET order_index=order_index+100 WHERE path_id=(SELECT id FROM public.learning_paths WHERE slug='civic') AND order_index>=2;
UPDATE public.skill_nodes SET order_index=order_index-99 WHERE path_id=(SELECT id FROM public.learning_paths WHERE slug='civic') AND order_index>=102;
INSERT INTO public.skill_nodes(path_id,slug,title,description,node_type,order_index,xp_reward,estimated_minutes,target_href,prerequisite_node_id)
SELECT p.id,'county-budget-detective','County Budget Detective','Investigate a stalled youth project using evidence, budget reasoning, and responsible public action.','mission',2,125,8,'/missions/county-budget-detective',first.id
FROM public.learning_paths p JOIN public.skill_nodes first ON first.path_id=p.id AND first.slug='evidence-first' WHERE p.slug='civic'
ON CONFLICT(path_id,slug) DO UPDATE SET order_index=2,title=EXCLUDED.title,description=EXCLUDED.description,target_href=EXCLUDED.target_href,prerequisite_node_id=EXCLUDED.prerequisite_node_id,updated_at=now();
UPDATE public.skill_nodes n SET prerequisite_node_id=prev.id FROM public.skill_nodes prev
WHERE n.path_id=prev.path_id AND n.path_id=(SELECT id FROM public.learning_paths WHERE slug='civic') AND n.order_index=prev.order_index+1;

INSERT INTO public.learning_missions(slug,title,description,path_id,node_id,estimated_minutes,passing_score,is_published)
SELECT 'county-budget-detective','County Budget Detective','Investigate a stalled youth centre and decide how to turn public records into responsible action.',p.id,n.id,8,80,true
FROM public.learning_paths p JOIN public.skill_nodes n ON n.path_id=p.id AND n.slug='county-budget-detective' WHERE p.slug='civic';

WITH data(slug,ord,title,prompt,context,learning_point) AS (VALUES
('find-evidence',1,'Start with evidence','Which source gives you the strongest starting point?','A youth centre received KSh 10 million, but construction stopped.','Approved budgets and procurement records turn a broad concern into questions officials must answer.'),
('read-numbers',2,'Read the numbers','The approved budget is KSh 10m. Records show KSh 6m paid and engineers estimate KSh 3m of visible work. What is the clearest evidence-based concern?','Numbers do not prove theft by themselves. They help identify the gap that requires explanation.','Compare approved, paid, and delivered value before drawing conclusions.'),
('verify-source',3,'Test a claim','A viral post says all KSh 10m was stolen. What should you do?','Fast-moving claims can mobilize attention but may also damage a credible investigation.','Corroboration protects both accuracy and the legitimacy of public action.'),
('choose-action',4,'Choose responsible action','You have the budget, payment record, photos, and project timeline. What is the strongest next move?','Effective accountability combines evidence, a specific request, and an appropriate public channel.','Ask precise questions, publish sources, and request a dated corrective response.'),
('active-recall',5,'Lock in the skill','Which sequence best describes evidence-led accountability?','Recall strengthens the chance that you can use this method outside the lesson.','Start with records, compare delivery, verify claims, then take proportionate action.')
)
INSERT INTO public.mission_steps(mission_id,slug,order_index,title,prompt,context,learning_point)
SELECT m.id,d.slug,d.ord,d.title,d.prompt,d.context,d.learning_point FROM data d CROSS JOIN public.learning_missions m WHERE m.slug='county-budget-detective';

WITH data(step_slug,ord,label,feedback,correct) AS (VALUES
('find-evidence',1,'A neighbour’s voice note','Useful as a lead, but it is not yet verifiable public evidence.',false),
('find-evidence',2,'The approved budget and procurement records','Correct. These establish what was authorized, who was responsible, and what should have happened.',true),
('find-evidence',3,'A politician’s campaign speech','A speech may frame the issue, but it cannot establish project delivery facts.',false),
('read-numbers',1,'KSh 3m is definitely stolen','The gap needs explanation, but the figures alone do not prove theft.',false),
('read-numbers',2,'There is a KSh 3m delivery gap that requires documentation','Correct. This is precise, evidence-based, and open to further verification.',true),
('read-numbers',3,'The project is probably complete','Visible work valued at KSh 3m does not support that conclusion.',false),
('verify-source',1,'Share it immediately','Speed would amplify an unverified allegation and weaken your credibility.',false),
('verify-source',2,'Compare it with payment records and request corroboration','Correct. Verify the claim before repeating it as fact.',true),
('verify-source',3,'Ignore every social media claim','Claims can provide leads. The skill is verification, not automatic dismissal.',false),
('choose-action',1,'Publish the evidence and request a specific public response','Correct. Your evidence supports a focused question and a clear accountability request.',true),
('choose-action',2,'Threaten everyone named in the records','Threats create risk and distract from the evidence.',false),
('choose-action',3,'Keep the findings private forever','Responsible publication and formal participation are how evidence can create change.',false),
('active-recall',1,'Accuse, trend, investigate, correct','Starting with accusation reverses the evidence-led process.',false),
('active-recall',2,'Wait, assume, share, forget','This sequence produces neither evidence nor accountable action.',false),
('active-recall',3,'Find records, compare delivery, verify claims, act proportionately','Correct. That is the reusable accountability loop.',true)
)
INSERT INTO public.mission_options(step_id,order_index,label,feedback,is_correct)
SELECT s.id,d.ord,d.label,d.feedback,d.correct FROM data d JOIN public.mission_steps s ON s.slug=d.step_slug JOIN public.learning_missions m ON m.id=s.mission_id AND m.slug='county-budget-detective';

CREATE OR REPLACE FUNCTION private.get_mission_internal(p_slug text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=auth.uid(); v_m public.learning_missions%ROWTYPE; v_attempt public.mission_attempts%ROWTYPE; v_steps jsonb;
BEGIN IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO v_m FROM public.learning_missions WHERE slug=p_slug AND is_published=true; IF v_m.id IS NULL THEN RAISE EXCEPTION 'Mission not found'; END IF;
 INSERT INTO public.mission_attempts(user_id,mission_id) VALUES(v_user,v_m.id) ON CONFLICT(user_id,mission_id) DO UPDATE SET last_activity_at=now() RETURNING * INTO v_attempt;
 IF NOT EXISTS(SELECT 1 FROM public.mission_events WHERE attempt_id=v_attempt.id AND event_type='started') THEN INSERT INTO public.mission_events(user_id,mission_id,attempt_id,event_type) VALUES(v_user,v_m.id,v_attempt.id,'started'); END IF;
 SELECT jsonb_agg(jsonb_build_object('id',s.id,'slug',s.slug,'order_index',s.order_index,'title',s.title,'prompt',s.prompt,'context',s.context,'options',(SELECT jsonb_agg(jsonb_build_object('id',o.id,'order_index',o.order_index,'label',o.label) ORDER BY o.order_index) FROM public.mission_options o WHERE o.step_id=s.id),'selected_option_id',(SELECT r.selected_option_id FROM public.mission_responses r WHERE r.attempt_id=v_attempt.id AND r.step_id=s.id),'is_correct',(SELECT r.is_correct FROM public.mission_responses r WHERE r.attempt_id=v_attempt.id AND r.step_id=s.id)) ORDER BY s.order_index) INTO v_steps FROM public.mission_steps s WHERE s.mission_id=v_m.id;
 RETURN jsonb_build_object('id',v_m.id,'slug',v_m.slug,'title',v_m.title,'description',v_m.description,'estimated_minutes',v_m.estimated_minutes,'passing_score',v_m.passing_score,'attempt_id',v_attempt.id,'status',v_attempt.status,'best_score',v_attempt.best_score,'steps',v_steps);
END; $$;

CREATE OR REPLACE FUNCTION private.submit_mission_answer_internal(p_step uuid,p_option uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=auth.uid(); v_attempt public.mission_attempts%ROWTYPE; v_option public.mission_options%ROWTYPE; v_step public.mission_steps%ROWTYPE; v_previous boolean; v_answered integer; v_total integer; v_correct integer;
BEGIN IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO v_step FROM public.mission_steps WHERE id=p_step; SELECT * INTO v_option FROM public.mission_options WHERE id=p_option AND step_id=p_step; IF v_option.id IS NULL THEN RAISE EXCEPTION 'Invalid answer'; END IF;
 SELECT a.* INTO v_attempt FROM public.mission_attempts a JOIN public.learning_missions m ON m.id=a.mission_id WHERE a.user_id=v_user AND a.mission_id=v_step.mission_id; IF v_attempt.id IS NULL OR v_attempt.status='completed' THEN RAISE EXCEPTION 'Active attempt not found'; END IF;
 SELECT EXISTS(SELECT 1 FROM public.mission_responses WHERE attempt_id=v_attempt.id AND step_id=p_step) INTO v_previous;
 INSERT INTO public.mission_responses(attempt_id,step_id,selected_option_id,is_correct) VALUES(v_attempt.id,p_step,p_option,v_option.is_correct) ON CONFLICT(attempt_id,step_id) DO UPDATE SET selected_option_id=EXCLUDED.selected_option_id,is_correct=EXCLUDED.is_correct,response_count=public.mission_responses.response_count+1,responded_at=now();
 INSERT INTO public.mission_events(user_id,mission_id,attempt_id,event_type,step_id,metadata) VALUES(v_user,v_attempt.mission_id,v_attempt.id,CASE WHEN v_previous THEN 'retried' ELSE 'answered' END,p_step,jsonb_build_object('correct',v_option.is_correct));
 SELECT count(*),count(*) FILTER(WHERE r.is_correct) INTO v_answered,v_correct FROM public.mission_responses r WHERE r.attempt_id=v_attempt.id; SELECT count(*) INTO v_total FROM public.mission_steps WHERE mission_id=v_attempt.mission_id;
 RETURN jsonb_build_object('correct',v_option.is_correct,'feedback',v_option.feedback,'learning_point',v_step.learning_point,'answered',v_answered,'total',v_total,'score',floor(v_correct*100.0/v_total));
END; $$;

CREATE OR REPLACE FUNCTION private.complete_mission_internal(p_attempt uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=auth.uid(); v_a public.mission_attempts%ROWTYPE; v_m public.learning_missions%ROWTYPE; v_total integer; v_correct integer; v_score integer; v_reward jsonb;
BEGIN SELECT * INTO v_a FROM public.mission_attempts WHERE id=p_attempt AND user_id=v_user; IF v_a.id IS NULL THEN RAISE EXCEPTION 'Attempt not found'; END IF; SELECT * INTO v_m FROM public.learning_missions WHERE id=v_a.mission_id;
 SELECT count(*) INTO v_total FROM public.mission_steps WHERE mission_id=v_m.id; SELECT count(*) FILTER(WHERE r.is_correct) INTO v_correct FROM public.mission_responses r JOIN public.mission_steps s ON s.id=r.step_id WHERE r.attempt_id=v_a.id AND s.mission_id=v_m.id; IF (SELECT count(*) FROM public.mission_responses WHERE attempt_id=v_a.id)<v_total THEN RAISE EXCEPTION 'Answer every step first'; END IF;
 v_score:=floor(v_correct*100.0/v_total); UPDATE public.mission_attempts SET best_score=GREATEST(best_score,v_score),last_activity_at=now() WHERE id=v_a.id;
 IF v_score<v_m.passing_score THEN RETURN jsonb_build_object('mastered',false,'score',v_score,'passing_score',v_m.passing_score); END IF;
 UPDATE public.mission_attempts SET status='completed',best_score=GREATEST(best_score,v_score),completed_at=COALESCE(completed_at,now()),last_activity_at=now() WHERE id=v_a.id;
 INSERT INTO public.user_skill_progress(user_id,node_id,status,progress_percentage,started_at,completed_at) VALUES(v_user,v_m.node_id,'completed',100,v_a.started_at,now()) ON CONFLICT(user_id,node_id) DO UPDATE SET status='completed',progress_percentage=100,completed_at=COALESCE(public.user_skill_progress.completed_at,now()),updated_at=now();
 SELECT private.award_once(v_user,'skill_node_completion',v_m.node_id::text,(SELECT xp_reward FROM public.skill_nodes WHERE id=v_m.node_id)) INTO v_reward;
 IF NOT EXISTS(SELECT 1 FROM public.mission_events WHERE attempt_id=v_a.id AND event_type='mastered') THEN INSERT INTO public.mission_events(user_id,mission_id,attempt_id,event_type,metadata) VALUES(v_user,v_m.id,v_a.id,'mastered',jsonb_build_object('score',v_score)); END IF;
 RETURN jsonb_build_object('mastered',true,'score',v_score,'passing_score',v_m.passing_score,'xp_awarded',COALESCE((v_reward->>'xp_awarded')::integer,0));
END; $$;

CREATE FUNCTION public.get_learning_mission(p_slug text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT private.get_mission_internal(p_slug)$$;
CREATE FUNCTION public.submit_mission_answer(p_step uuid,p_option uuid) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT private.submit_mission_answer_internal(p_step,p_option)$$;
CREATE FUNCTION public.complete_learning_mission(p_attempt uuid) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT private.complete_mission_internal(p_attempt)$$;
REVOKE ALL ON FUNCTION public.get_learning_mission(text),public.submit_mission_answer(uuid,uuid),public.complete_learning_mission(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_learning_mission(text),public.submit_mission_answer(uuid,uuid),public.complete_learning_mission(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_mission_internal(text),private.submit_mission_answer_internal(uuid,uuid),private.complete_mission_internal(uuid) TO authenticated;
CREATE INDEX idx_mission_events_mission_type ON public.mission_events(mission_id,event_type,created_at);

