-- Migration: Badge and Streak Tracking
-- Adds detailed gamification systems

-- 1. Create Badges Table
CREATE TABLE public.badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    xp_reward INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- Everyone can read badges
CREATE POLICY "Badges are viewable by everyone." 
ON public.badges FOR SELECT USING (true);

-- Only admins can modify badges
CREATE POLICY "Admins can insert badges." 
ON public.badges FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update badges." 
ON public.badges FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete badges." 
ON public.badges FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 2. Create User Badges Junction Table
CREATE TABLE public.user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Users can see anyone's earned badges
CREATE POLICY "User badges are viewable by everyone." 
ON public.user_badges FOR SELECT USING (true);

-- Only the server (service role) or admins should typically award badges
CREATE POLICY "Users can see their own awards."
ON public.user_badges FOR SELECT USING (auth.uid() = user_id);

-- 3. Add Streak Tracking to Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_action_date TIMESTAMP WITH TIME ZONE;

-- 4. Initial Seed Data (Core Badges)
INSERT INTO public.badges (name, description, icon, xp_reward) VALUES 
('Civic Starter', 'Completed your first action or course module.', '🌱', 50),
('Town Hall Attendee', 'RSVPed and attended your first Town Hall.', '🎤', 100),
('Advocate', 'Signed 5 petitions.', '✍️', 150),
('Consistent Contributor', 'Maintained a 7-day action streak.', '🔥', 200)
ON CONFLICT (name) DO NOTHING;
