-- Youth Fund Transparency Tracker, citizen accountability layer.
-- Adds the 5 fixed accountability questions, response storage, and an
-- AI-generated accountability brief per fund (mirrors the Policy Pulse
-- policy_briefs pattern, scoped to funds).

-- Bugfix: the fund comment form has attached an optional evidence photo
-- (image_url) since it was built, but the column was never migrated, 
-- any comment submitted with a photo has been silently failing to insert.
ALTER TABLE public.fund_comments ADD COLUMN IF NOT EXISTS image_url text;

CREATE TABLE IF NOT EXISTS public.fund_accountability_questions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    question_order integer NOT NULL,
    question_text text NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fund_accountability_responses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    fund_id uuid REFERENCES public.public_funds(id) ON DELETE CASCADE NOT NULL,
    question_id uuid REFERENCES public.fund_accountability_questions(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    county text,
    response_text text NOT NULL,
    evidence_image_url text,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fund_accountability_responses_fund ON public.fund_accountability_responses(fund_id);
CREATE INDEX IF NOT EXISTS idx_fund_accountability_responses_question ON public.fund_accountability_responses(question_id);

CREATE TABLE IF NOT EXISTS public.fund_briefs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    fund_id uuid REFERENCES public.public_funds(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    generated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fund_briefs_fund ON public.fund_briefs(fund_id);

INSERT INTO public.fund_accountability_questions (question_order, question_text) VALUES
(1, 'Have you or someone you know ever applied for this youth fund? Describe your experience, including any challenges faced during the application process.'),
(2, 'Based on your community''s experience, do you believe this fund is reaching the young people who need it most? Explain your answer.'),
(3, 'What information about this fund should government agencies publish to improve transparency and public trust?'),
(4, 'Have you observed any delays, irregularities or unfair practices in the allocation or disbursement of this fund? Please describe what happened.'),
(5, 'What improvements would make green and digital funding opportunities more accessible and inclusive for youth, women and persons with disabilities?')
ON CONFLICT DO NOTHING;

ALTER TABLE public.fund_accountability_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read accountability questions" ON public.fund_accountability_questions;
CREATE POLICY "Public read accountability questions" ON public.fund_accountability_questions FOR SELECT USING (true);

ALTER TABLE public.fund_accountability_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read accountability responses" ON public.fund_accountability_responses;
CREATE POLICY "Public read accountability responses" ON public.fund_accountability_responses FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated create accountability responses" ON public.fund_accountability_responses;
CREATE POLICY "Authenticated create accountability responses" ON public.fund_accountability_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owner delete own accountability response" ON public.fund_accountability_responses;
CREATE POLICY "Owner delete own accountability response" ON public.fund_accountability_responses FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.fund_briefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read published fund briefs" ON public.fund_briefs;
CREATE POLICY "Public read published fund briefs" ON public.fund_briefs FOR SELECT USING (
    status = 'published'
    OR auth.uid() = generated_by
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
DROP POLICY IF EXISTS "Authenticated create fund briefs" ON public.fund_briefs;
CREATE POLICY "Authenticated create fund briefs" ON public.fund_briefs FOR INSERT WITH CHECK (auth.uid() = generated_by);
DROP POLICY IF EXISTS "Manage own fund briefs" ON public.fund_briefs;
CREATE POLICY "Manage own fund briefs" ON public.fund_briefs FOR UPDATE USING (
    auth.uid() = generated_by OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
