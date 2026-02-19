-- ============================================
-- COURSE REVIEWS & RATINGS
-- ============================================

-- Drop if exists for clean re-run
DROP TABLE IF EXISTS course_reviews CASCADE;

CREATE TABLE course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, user_id) -- One review per user per course
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_course ON course_reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON course_reviews(user_id);

-- Enable RLS
ALTER TABLE course_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews
DROP POLICY IF EXISTS "Anyone can view reviews" ON course_reviews;
CREATE POLICY "Anyone can view reviews" ON course_reviews
  FOR SELECT USING (true);

-- Users can create their own reviews
DROP POLICY IF EXISTS "Users can create reviews" ON course_reviews;
CREATE POLICY "Users can create reviews" ON course_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
DROP POLICY IF EXISTS "Users can update own reviews" ON course_reviews;
CREATE POLICY "Users can update own reviews" ON course_reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own reviews
DROP POLICY IF EXISTS "Users can delete own reviews" ON course_reviews;
CREATE POLICY "Users can delete own reviews" ON course_reviews
  FOR DELETE USING (auth.uid() = user_id);
