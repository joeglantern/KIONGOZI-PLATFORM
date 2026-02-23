-- Create impact_points table for geographic tracking
CREATE TABLE IF NOT EXISTS public.impact_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'Tree Planting', 'Town Hall', 'Clean Up', 'Other'
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.impact_points ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read access to impact points"
ON public.impact_points FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow authenticated users to insert impact points"
ON public.impact_points FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_impact_points_location ON public.impact_points (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_impact_points_category ON public.impact_points (category);
