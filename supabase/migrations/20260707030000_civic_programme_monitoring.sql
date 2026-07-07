-- Community Project Monitoring Tool — pivot to Kenya's named green/digital
-- transition programmes, additive to the existing generic public_projects
-- system (which stays as-is for freeform community-submitted projects).

CREATE TABLE IF NOT EXISTS public.civic_programmes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    slug text NOT NULL UNIQUE,
    name text NOT NULL,
    category text NOT NULL,
    icon_name text NOT NULL DEFAULT 'clipboard',
    overview text NOT NULL,
    why_monitor text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.civic_programme_questions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    programme_id uuid REFERENCES public.civic_programmes(id) ON DELETE CASCADE NOT NULL,
    question_order integer NOT NULL,
    question_text text NOT NULL,
    response_type text NOT NULL DEFAULT 'text' CHECK (response_type IN ('yesno', 'text')),
    requires_photo boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.civic_programme_responses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    programme_id uuid REFERENCES public.civic_programmes(id) ON DELETE CASCADE NOT NULL,
    question_id uuid REFERENCES public.civic_programme_questions(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    county text,
    ward text,
    response_bool boolean,
    response_text text,
    photo_url text,
    created_at timestamptz DEFAULT now(),
    CHECK (response_bool IS NOT NULL OR response_text IS NOT NULL OR photo_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_civic_programme_questions_programme ON public.civic_programme_questions(programme_id);
CREATE INDEX IF NOT EXISTS idx_civic_programme_responses_programme ON public.civic_programme_responses(programme_id);
CREATE INDEX IF NOT EXISTS idx_civic_programme_responses_question ON public.civic_programme_responses(question_id);

CREATE TABLE IF NOT EXISTS public.programme_briefs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    programme_id uuid REFERENCES public.civic_programmes(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    generated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_programme_briefs_programme ON public.programme_briefs(programme_id);

-- Seed the 4 named programmes.
INSERT INTO public.civic_programmes (slug, name, category, icon_name, overview, why_monitor, sort_order) VALUES
('climateworx-mtaani', 'ClimateWorX Mtaani Programme', 'Green Jobs', 'leaf',
    'A national green jobs programme recruiting young people into climate and environmental work in their local wards — the most relatable green project for youth today.',
    'Thousands of young people have already interacted with ClimateWorX or know someone who has. Public conversation already covers recruitment transparency, payment delays, political interference, selection criteria, working conditions, and inclusion of women and persons with disabilities — youth already discuss this extensively on social media, making citizen-generated accountability especially powerful here.',
    1),
('ajira-digital', 'Ajira Digital Programme', 'Digital Skills', 'laptop',
    'A government initiative that equips young people with digital skills and connects them to online work — freelancing, digital marketing, data entry, content creation, virtual assistance, and other digital jobs.',
    'Although thousands of youth have been trained, many report challenges transitioning from training to earning a sustainable income. Monitoring community experiences can help improve programme effectiveness and accountability.',
    2),
('kjet', 'Kenya Jobs and Economic Transformation (KJET) Project', 'Economic Transformation', 'briefcase-business',
    'Supports job creation and economic opportunities through entrepreneurship development, innovation, business incubation, digital transformation, green enterprises, and skills development for youth and MSMEs.',
    'Many youth are unaware of KJET opportunities, while others question whether support reaches deserving beneficiaries. Monitoring can increase transparency and document the real impact of KJET-supported interventions at community level.',
    3),
('hustler-fund', 'Hustler Fund Youth Enterprises', 'Financial Inclusion', 'wallet',
    'Provides affordable credit to individuals and youth-owned businesses to support entrepreneurship, business growth, and financial inclusion, increasing access to capital for small enterprises that often struggle to obtain conventional financing.',
    'While the fund has reached millions of borrowers, young entrepreneurs continue to raise concerns about loan limits, repayment terms, business growth support, and whether the fund is translating into sustainable enterprises.',
    4)
ON CONFLICT (slug) DO NOTHING;

-- Seed questions per programme, in the exact order given in the spec.
INSERT INTO public.civic_programme_questions (programme_id, question_order, question_text, response_type, requires_photo)
SELECT id, 1, 'Has ClimateWorX reached your ward?', 'yesno', false FROM public.civic_programmes WHERE slug = 'climateworx-mtaani'
UNION ALL SELECT id, 2, 'Were recruitment processes fair?', 'yesno', false FROM public.civic_programmes WHERE slug = 'climateworx-mtaani'
UNION ALL SELECT id, 3, 'Were workers paid on time?', 'yesno', false FROM public.civic_programmes WHERE slug = 'climateworx-mtaani'
UNION ALL SELECT id, 4, 'Were enough youth recruited?', 'yesno', false FROM public.civic_programmes WHERE slug = 'climateworx-mtaani'
UNION ALL SELECT id, 5, 'Were women and persons with disabilities included?', 'yesno', false FROM public.civic_programmes WHERE slug = 'climateworx-mtaani'
UNION ALL SELECT id, 6, 'Upload photos of activities.', 'text', true FROM public.civic_programmes WHERE slug = 'climateworx-mtaani'

UNION ALL SELECT id, 1, 'Has an Ajira Digital training been conducted in your area?', 'yesno', false FROM public.civic_programmes WHERE slug = 'ajira-digital'
UNION ALL SELECT id, 2, 'Did the training provide practical digital skills that prepared youth for online work?', 'yesno', false FROM public.civic_programmes WHERE slug = 'ajira-digital'
UNION ALL SELECT id, 3, 'Were participants supported to access online work platforms after completing the training?', 'yesno', false FROM public.civic_programmes WHERE slug = 'ajira-digital'
UNION ALL SELECT id, 4, 'What challenges have youth experienced in benefiting from the programme?', 'text', false FROM public.civic_programmes WHERE slug = 'ajira-digital'
UNION ALL SELECT id, 5, 'Upload photos or share evidence of training sessions or success stories.', 'text', true FROM public.civic_programmes WHERE slug = 'ajira-digital'

UNION ALL SELECT id, 1, 'Is there a KJET-supported project or enterprise operating in your community?', 'yesno', false FROM public.civic_programmes WHERE slug = 'kjet'
UNION ALL SELECT id, 2, 'Have young people benefited from KJET training, grants, incubation, or business support?', 'yesno', false FROM public.civic_programmes WHERE slug = 'kjet'
UNION ALL SELECT id, 3, 'Has the project created employment or business opportunities for local youth?', 'yesno', false FROM public.civic_programmes WHERE slug = 'kjet'
UNION ALL SELECT id, 4, 'Are women, persons with disabilities, and marginalized youth benefiting equally?', 'yesno', false FROM public.civic_programmes WHERE slug = 'kjet'
UNION ALL SELECT id, 5, 'Upload photos or provide updates on project implementation.', 'text', true FROM public.civic_programmes WHERE slug = 'kjet'

UNION ALL SELECT id, 1, 'Have youth-owned businesses in your community benefited from the Hustler Fund?', 'yesno', false FROM public.civic_programmes WHERE slug = 'hustler-fund'
UNION ALL SELECT id, 2, 'Has the funding helped businesses grow or create employment?', 'yesno', false FROM public.civic_programmes WHERE slug = 'hustler-fund'
UNION ALL SELECT id, 3, 'What challenges have beneficiaries experienced when accessing or repaying the fund?', 'text', false FROM public.civic_programmes WHERE slug = 'hustler-fund'
UNION ALL SELECT id, 4, 'Are young women, persons with disabilities, and vulnerable youth accessing the fund equitably?', 'yesno', false FROM public.civic_programmes WHERE slug = 'hustler-fund'
UNION ALL SELECT id, 5, 'Share your experience or upload evidence of businesses supported through the Hustler Fund.', 'text', true FROM public.civic_programmes WHERE slug = 'hustler-fund'
ON CONFLICT DO NOTHING;

ALTER TABLE public.civic_programmes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read programmes" ON public.civic_programmes;
CREATE POLICY "Public read programmes" ON public.civic_programmes FOR SELECT USING (true);

ALTER TABLE public.civic_programme_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read programme questions" ON public.civic_programme_questions;
CREATE POLICY "Public read programme questions" ON public.civic_programme_questions FOR SELECT USING (true);

ALTER TABLE public.civic_programme_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read programme responses" ON public.civic_programme_responses;
CREATE POLICY "Public read programme responses" ON public.civic_programme_responses FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated create programme responses" ON public.civic_programme_responses;
CREATE POLICY "Authenticated create programme responses" ON public.civic_programme_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owner delete own programme response" ON public.civic_programme_responses;
CREATE POLICY "Owner delete own programme response" ON public.civic_programme_responses FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.programme_briefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read published programme briefs" ON public.programme_briefs;
CREATE POLICY "Public read published programme briefs" ON public.programme_briefs FOR SELECT USING (
    status = 'published'
    OR auth.uid() = generated_by
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
DROP POLICY IF EXISTS "Authenticated create programme briefs" ON public.programme_briefs;
CREATE POLICY "Authenticated create programme briefs" ON public.programme_briefs FOR INSERT WITH CHECK (auth.uid() = generated_by);
DROP POLICY IF EXISTS "Manage own programme briefs" ON public.programme_briefs;
CREATE POLICY "Manage own programme briefs" ON public.programme_briefs FOR UPDATE USING (
    auth.uid() = generated_by OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
