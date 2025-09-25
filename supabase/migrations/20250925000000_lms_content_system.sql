-- LMS Content Management System
-- Learning modules, categories, and progress tracking

-- 1) Module categories for content organization
CREATE TABLE IF NOT EXISTS public.module_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  color text DEFAULT '#10B981', -- Green by default for sustainability theme
  icon text DEFAULT '🌱',
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Default categories for Twin Green & Digital Transition
INSERT INTO public.module_categories (name, description, color, icon, display_order) VALUES
('Green Economy Fundamentals', 'Core concepts of sustainable business and environmental economics', '#10B981', '🌱', 1),
('Digital Skills', 'Essential technology and digital literacy skills', '#3B82F6', '💻', 2),
('Renewable Energy', 'Solar, wind, and sustainable energy technologies', '#F59E0B', '⚡', 3),
('Sustainable Agriculture', 'Climate-smart farming and food security', '#84CC16', '🌾', 4),
('Digital Entrepreneurship', 'Building online businesses and digital marketing', '#8B5CF6', '🚀', 5),
('Climate Adaptation', 'Preparing for and responding to climate change', '#06B6D4', '🌍', 6)
ON CONFLICT (name) DO NOTHING;

-- 2) Learning modules table
CREATE TABLE IF NOT EXISTS public.learning_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  content text NOT NULL, -- Rich text/markdown content
  category_id uuid REFERENCES public.module_categories(id) ON DELETE SET NULL,
  difficulty_level text NOT NULL DEFAULT 'beginner',
  estimated_duration_minutes integer DEFAULT 30,
  learning_objectives text[], -- Array of learning goals
  keywords text[], -- For search functionality
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  featured boolean DEFAULT false,
  view_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add constraints
ALTER TABLE public.learning_modules
ADD CONSTRAINT learning_modules_difficulty_chk CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced'));

ALTER TABLE public.learning_modules
ADD CONSTRAINT learning_modules_status_chk CHECK (status IN ('draft', 'published', 'archived'));

-- 3) User progress tracking
CREATE TABLE IF NOT EXISTS public.user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.learning_modules(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started',
  progress_percentage integer DEFAULT 0,
  time_spent_minutes integer DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  last_accessed_at timestamptz DEFAULT now(),
  notes text, -- User's personal notes
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(user_id, module_id)
);

-- Add constraints
ALTER TABLE public.user_progress
ADD CONSTRAINT user_progress_status_chk CHECK (status IN ('not_started', 'in_progress', 'completed', 'bookmarked'));

ALTER TABLE public.user_progress
ADD CONSTRAINT user_progress_percentage_chk CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

-- 4) Module tags for better content discovery
CREATE TABLE IF NOT EXISTS public.module_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.learning_modules(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(module_id, tag)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_learning_modules_category ON public.learning_modules(category_id);
CREATE INDEX IF NOT EXISTS idx_learning_modules_status ON public.learning_modules(status);
CREATE INDEX IF NOT EXISTS idx_learning_modules_author ON public.learning_modules(author_id);
CREATE INDEX IF NOT EXISTS idx_learning_modules_published ON public.learning_modules(published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_learning_modules_featured ON public.learning_modules(featured, published_at DESC) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_learning_modules_keywords ON public.learning_modules USING GIN(keywords);

CREATE INDEX IF NOT EXISTS idx_user_progress_user ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_module ON public.user_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_status ON public.user_progress(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_progress_completed ON public.user_progress(user_id, completed_at) WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_module_tags_module ON public.module_tags(module_id);
CREATE INDEX IF NOT EXISTS idx_module_tags_tag ON public.module_tags(tag);

-- Enable RLS
ALTER TABLE public.module_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for module_categories (public read, moderator+ write)
CREATE POLICY module_categories_select_all ON public.module_categories
FOR SELECT USING (true); -- Public readable

CREATE POLICY module_categories_insert_moderator ON public.module_categories
FOR INSERT WITH CHECK (public.jwt_role() IN ('admin', 'moderator', 'content_editor', 'org_admin'));

CREATE POLICY module_categories_update_moderator ON public.module_categories
FOR UPDATE USING (public.jwt_role() IN ('admin', 'moderator', 'content_editor', 'org_admin'));

CREATE POLICY module_categories_delete_moderator ON public.module_categories
FOR DELETE USING (public.jwt_role() IN ('admin', 'org_admin'));

-- RLS Policies for learning_modules (public read published, moderator+ write)
CREATE POLICY learning_modules_select_published ON public.learning_modules
FOR SELECT USING (
  status = 'published'
  OR author_id = auth.uid()
  OR public.jwt_role() IN ('admin', 'moderator', 'content_editor', 'org_admin')
);

CREATE POLICY learning_modules_insert_moderator ON public.learning_modules
FOR INSERT WITH CHECK (
  public.jwt_role() IN ('admin', 'moderator', 'content_editor', 'org_admin')
  AND author_id = auth.uid()
);

CREATE POLICY learning_modules_update_author ON public.learning_modules
FOR UPDATE USING (
  author_id = auth.uid()
  OR public.jwt_role() IN ('admin', 'moderator', 'org_admin')
);

CREATE POLICY learning_modules_delete_author ON public.learning_modules
FOR DELETE USING (
  author_id = auth.uid()
  OR public.jwt_role() IN ('admin', 'org_admin')
);

-- RLS Policies for user_progress (user owns their progress)
CREATE POLICY user_progress_select_owner ON public.user_progress
FOR SELECT USING (
  user_id = auth.uid()
  OR public.jwt_role() IN ('admin', 'moderator', 'org_admin')
);

CREATE POLICY user_progress_insert_owner ON public.user_progress
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY user_progress_update_owner ON public.user_progress
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY user_progress_delete_owner ON public.user_progress
FOR DELETE USING (
  user_id = auth.uid()
  OR public.jwt_role() IN ('admin', 'org_admin')
);

-- RLS Policies for module_tags (follow module permissions)
CREATE POLICY module_tags_select_all ON public.module_tags
FOR SELECT USING (true);

CREATE POLICY module_tags_insert_moderator ON public.module_tags
FOR INSERT WITH CHECK (public.jwt_role() IN ('admin', 'moderator', 'content_editor', 'org_admin'));

CREATE POLICY module_tags_update_moderator ON public.module_tags
FOR UPDATE USING (public.jwt_role() IN ('admin', 'moderator', 'content_editor', 'org_admin'));

CREATE POLICY module_tags_delete_moderator ON public.module_tags
FOR DELETE USING (public.jwt_role() IN ('admin', 'moderator', 'org_admin'));

-- Updated at triggers
CREATE TRIGGER set_module_categories_updated_at
BEFORE UPDATE ON public.module_categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_learning_modules_updated_at
BEFORE UPDATE ON public.learning_modules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_user_progress_updated_at
BEFORE UPDATE ON public.user_progress
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helper functions
CREATE OR REPLACE FUNCTION public.increment_module_view_count(module_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.learning_modules
  SET view_count = view_count + 1
  WHERE id = module_id AND status = 'published';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_user_progress_status(
  p_user_id uuid,
  p_module_id uuid,
  p_status text DEFAULT 'in_progress',
  p_progress_percentage integer DEFAULT NULL,
  p_time_spent_minutes integer DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_progress (
    user_id,
    module_id,
    status,
    progress_percentage,
    time_spent_minutes,
    started_at,
    completed_at,
    last_accessed_at
  )
  VALUES (
    p_user_id,
    p_module_id,
    p_status,
    COALESCE(p_progress_percentage, CASE WHEN p_status = 'completed' THEN 100 ELSE 0 END),
    COALESCE(p_time_spent_minutes, 0),
    CASE WHEN p_status != 'not_started' THEN now() ELSE NULL END,
    CASE WHEN p_status = 'completed' THEN now() ELSE NULL END,
    now()
  )
  ON CONFLICT (user_id, module_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    progress_percentage = COALESCE(EXCLUDED.progress_percentage, user_progress.progress_percentage),
    time_spent_minutes = COALESCE(EXCLUDED.time_spent_minutes, user_progress.time_spent_minutes),
    started_at = CASE
      WHEN user_progress.started_at IS NULL AND EXCLUDED.status != 'not_started'
      THEN now()
      ELSE user_progress.started_at
    END,
    completed_at = CASE
      WHEN EXCLUDED.status = 'completed'
      THEN now()
      ELSE user_progress.completed_at
    END,
    last_accessed_at = now(),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;