-- Personalized onboarding and database-backed learning paths.
CREATE TABLE IF NOT EXISTS public.learning_paths (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
    title text NOT NULL,
    description text NOT NULL,
    outcome text NOT NULL,
    icon_name text NOT NULL,
    accent_color text NOT NULL,
    category_name text,
    sort_order integer NOT NULL DEFAULT 0,
    is_published boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.skill_nodes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    path_id uuid NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
    slug text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    node_type text NOT NULL CHECK (node_type IN ('mission', 'course', 'quiz', 'project', 'milestone')),
    order_index integer NOT NULL,
    xp_reward integer NOT NULL DEFAULT 0 CHECK (xp_reward BETWEEN 0 AND 1000),
    estimated_minutes integer CHECK (estimated_minutes IS NULL OR estimated_minutes > 0),
    target_href text NOT NULL DEFAULT '/courses' CHECK (target_href LIKE '/%'),
    prerequisite_node_id uuid REFERENCES public.skill_nodes(id) ON DELETE SET NULL,
    is_published boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (path_id, slug),
    UNIQUE (path_id, order_index)
);

CREATE TABLE IF NOT EXISTS public.user_skill_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    node_id uuid NOT NULL REFERENCES public.skill_nodes(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_progress', 'completed')),
    progress_percentage integer NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    started_at timestamptz,
    completed_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, node_id),
    CHECK ((status = 'completed' AND progress_percentage = 100) OR status <> 'completed')
);

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS onboarding_goal text,
    ADD COLUMN IF NOT EXISTS learning_interests text[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS county text,
    ADD COLUMN IF NOT EXISTS institution_name text,
    ADD COLUMN IF NOT EXISTS daily_goal_minutes integer,
    ADD COLUMN IF NOT EXISTS focus_path text,
    ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

DO $$ BEGIN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_onboarding_goal_check
    CHECK (onboarding_goal IS NULL OR onboarding_goal IN ('career', 'community', 'project', 'credential', 'explore'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_daily_goal_check
    CHECK (daily_goal_minutes IS NULL OR daily_goal_minutes IN (5, 10, 15));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_focus_path_fkey
    FOREIGN KEY (focus_path) REFERENCES public.learning_paths(slug) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skill_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS learning_paths_read_published ON public.learning_paths;
CREATE POLICY learning_paths_read_published ON public.learning_paths
FOR SELECT TO anon, authenticated USING (is_published = true);

DROP POLICY IF EXISTS skill_nodes_read_published ON public.skill_nodes;
CREATE POLICY skill_nodes_read_published ON public.skill_nodes
FOR SELECT TO anon, authenticated USING (
    is_published = true AND EXISTS (
        SELECT 1 FROM public.learning_paths p WHERE p.id = path_id AND p.is_published = true
    )
);

DROP POLICY IF EXISTS user_skill_progress_read_own ON public.user_skill_progress;
CREATE POLICY user_skill_progress_read_own ON public.user_skill_progress
FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

GRANT SELECT ON public.learning_paths, public.skill_nodes TO anon, authenticated;
GRANT SELECT ON public.user_skill_progress TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.learning_paths, public.skill_nodes FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_skill_progress FROM anon, authenticated;

INSERT INTO public.learning_paths (slug, title, description, outcome, icon_name, accent_color, category_name, sort_order)
VALUES
('civic', 'Civic Leadership', 'Learn how public decisions are made and how to participate effectively.', 'Read budgets, evaluate policy, and lead accountable community action.', 'vote', '#ff6633', 'Civic Participation', 1),
('green', 'Green Economy', 'Connect climate knowledge to practical projects and green opportunities.', 'Design climate action and understand pathways into the green economy.', 'leaf', '#10b981', 'Green Economy Fundamentals', 2),
('digital', 'Digital Skills', 'Build practical digital confidence for work and community problem-solving.', 'Use digital tools and create technology for real local needs.', 'zap', '#0ea5e9', 'Digital Skills', 3),
('entrepreneurship', 'Entrepreneurship', 'Turn useful ideas into tested solutions people can support.', 'Validate ideas, communicate value, and launch responsible ventures.', 'lightbulb', '#f59e0b', 'Digital Entrepreneurship', 4)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    outcome = EXCLUDED.outcome,
    icon_name = EXCLUDED.icon_name,
    accent_color = EXCLUDED.accent_color,
    category_name = EXCLUDED.category_name,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

WITH seed(path_slug, node_slug, title, description, node_type, order_index, xp_reward, estimated_minutes, target_href) AS (
    VALUES
    ('civic','evidence-first','Spot the Evidence','Separate claims from verifiable public evidence.','mission',1,25,3,'/'),
    ('civic','county-budget-basics','Read a County Budget','Find the numbers, timelines, and responsibilities that matter.','course',2,100,15,'/courses'),
    ('civic','policy-choice','Policy Choice Simulation','Practice weighing trade-offs before taking a public position.','quiz',3,150,10,'/community/policy-pulse'),
    ('civic','public-project-audit','Audit a Public Project','Apply your skills to a visible community project.','project',4,250,30,'/impact-map'),
    ('green','green-foundations','Green Economy Foundations','Connect climate challenges to practical economic opportunities.','course',1,100,15,'/courses'),
    ('green','climate-action-plan','Design a Climate Action','Turn a local climate problem into an achievable plan.','mission',2,125,12,'/courses'),
    ('green','community-campaign','Build Community Support','Practice communicating climate action to different audiences.','quiz',3,150,10,'/community'),
    ('green','green-impact-project','Launch a Green Project','Document a real environmental action on the impact map.','project',4,250,30,'/impact-map'),
    ('digital','digital-foundations','Digital Foundations','Build confidence with essential digital tools and online safety.','course',1,100,15,'/courses'),
    ('digital','problem-to-prototype','Problem to Prototype','Translate a community need into a simple digital solution.','mission',2,125,15,'/courses'),
    ('digital','civic-tech-simulation','Civic Tech Simulation','Choose the right technology for an accountability challenge.','quiz',3,150,10,'/community/policy-pulse'),
    ('digital','builder-project','Build for Your Community','Create and document a practical digital project.','project',4,250,30,'/impact-map'),
    ('entrepreneurship','venture-foundations','Venture Foundations','Understand problems, customers, and responsible value creation.','course',1,100,15,'/courses'),
    ('entrepreneurship','validate-an-idea','Validate an Idea','Test assumptions before investing time and money.','mission',2,125,15,'/courses'),
    ('entrepreneurship','pitch-simulation','Pitch Simulation','Practice explaining value clearly and handling questions.','quiz',3,150,10,'/community'),
    ('entrepreneurship','venture-showcase','Launch Your Showcase','Publish evidence of a tested solution and its impact.','project',4,250,30,'/impact-map')
)
INSERT INTO public.skill_nodes (path_id, slug, title, description, node_type, order_index, xp_reward, estimated_minutes, target_href)
SELECT p.id, s.node_slug, s.title, s.description, s.node_type, s.order_index, s.xp_reward, s.estimated_minutes, s.target_href
FROM seed s JOIN public.learning_paths p ON p.slug = s.path_slug
ON CONFLICT (path_id, slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    node_type = EXCLUDED.node_type,
    order_index = EXCLUDED.order_index,
    xp_reward = EXCLUDED.xp_reward,
    estimated_minutes = EXCLUDED.estimated_minutes,
    target_href = EXCLUDED.target_href,
    updated_at = now();

UPDATE public.skill_nodes current_node
SET prerequisite_node_id = previous_node.id
FROM public.skill_nodes previous_node
WHERE current_node.path_id = previous_node.path_id
  AND current_node.order_index = previous_node.order_index + 1;

-- Existing intro mission completions become genuine civic skill progress.
INSERT INTO public.user_skill_progress (user_id, node_id, status, progress_percentage, started_at, completed_at)
SELECT c.user_id, n.id, 'completed', 100, c.completed_at, c.completed_at
FROM public.intro_mission_completions c
JOIN public.learning_paths p ON p.slug = 'civic'
JOIN public.skill_nodes n ON n.path_id = p.id AND n.slug = 'evidence-first'
ON CONFLICT (user_id, node_id) DO UPDATE SET
    status = 'completed', progress_percentage = 100, completed_at = EXCLUDED.completed_at, updated_at = now();

CREATE OR REPLACE FUNCTION private.claim_intro_mission_internal(p_mission_key text, p_answer text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_user uuid := auth.uid();
    v_correct boolean;
    v_result jsonb;
    v_node uuid;
BEGIN
    IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
    IF p_mission_key <> 'county-youth-centre' THEN RAISE EXCEPTION 'Unknown mission'; END IF;
    IF p_answer NOT IN ('check-budget-records', 'post-accusation', 'wait-for-update') THEN RAISE EXCEPTION 'Invalid answer'; END IF;
    v_correct := p_answer = 'check-budget-records';

    INSERT INTO public.intro_mission_completions (user_id, mission_key, selected_answer, is_correct)
    VALUES (v_user, p_mission_key, p_answer, v_correct)
    ON CONFLICT (user_id, mission_key) DO NOTHING;

    SELECT n.id INTO v_node FROM public.skill_nodes n
    JOIN public.learning_paths p ON p.id = n.path_id
    WHERE p.slug = 'civic' AND n.slug = 'evidence-first';

    IF v_node IS NOT NULL THEN
        INSERT INTO public.user_skill_progress (user_id, node_id, status, progress_percentage, started_at, completed_at)
        VALUES (v_user, v_node, 'completed', 100, now(), now())
        ON CONFLICT (user_id, node_id) DO UPDATE SET
            status = 'completed', progress_percentage = 100, completed_at = COALESCE(public.user_skill_progress.completed_at, now()), updated_at = now();
    END IF;

    SELECT private.award_once(v_user, 'intro_mission', p_mission_key, CASE WHEN v_correct THEN 25 ELSE 10 END) INTO v_result;
    RETURN v_result || jsonb_build_object('correct', v_correct);
END;
$$;

CREATE INDEX IF NOT EXISTS idx_skill_nodes_path_order ON public.skill_nodes(path_id, order_index);
CREATE INDEX IF NOT EXISTS idx_user_skill_progress_user ON public.user_skill_progress(user_id);

