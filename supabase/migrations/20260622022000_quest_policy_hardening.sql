-- Exclude anonymous-auth sessions and add the community quest category.
DROP POLICY IF EXISTS quest_templates_read_active ON public.quest_templates;
CREATE POLICY quest_templates_read_active ON public.quest_templates FOR SELECT TO authenticated
USING (is_active=true AND COALESCE((auth.jwt()->>'is_anonymous')::boolean,false)=false);

DROP POLICY IF EXISTS user_quests_read_own ON public.user_quests;
CREATE POLICY user_quests_read_own ON public.user_quests FOR SELECT TO authenticated
USING ((SELECT auth.uid())=user_id AND COALESCE((auth.jwt()->>'is_anonymous')::boolean,false)=false);

DROP POLICY IF EXISTS quest_events_read_own ON public.quest_events;
CREATE POLICY quest_events_read_own ON public.quest_events FOR SELECT TO authenticated
USING ((SELECT auth.uid())=user_id AND COALESCE((auth.jwt()->>'is_anonymous')::boolean,false)=false);

DROP POLICY IF EXISTS daily_activity_read_own ON public.daily_learning_activity;
CREATE POLICY daily_activity_read_own ON public.daily_learning_activity FOR SELECT TO authenticated
USING ((SELECT auth.uid())=user_id AND COALESCE((auth.jwt()->>'is_anonymous')::boolean,false)=false);

INSERT INTO public.quest_templates(slug,title,description,quest_type,metric,target_count,xp_reward,estimated_minutes,icon_name,sort_order)
VALUES('community-first-action','Make your first community move','Support one verified community petition and make your participation visible.','community','petition_signature',1,50,5,'users',30)
ON CONFLICT(slug) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,quest_type=EXCLUDED.quest_type,metric=EXCLUDED.metric,target_count=EXCLUDED.target_count,xp_reward=EXCLUDED.xp_reward,is_active=true,updated_at=now();

