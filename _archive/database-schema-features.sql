-- ============================================
-- KIONGOZI LMS - NEW FEATURES DATABASE SCHEMA
-- ============================================
-- Features: Quizzes, Certificates, Comments, Notes, Reviews, Advanced Search
-- Created: 2026-02-13
-- ============================================

-- ============================================
-- 1. QUIZZES & ASSESSMENTS
-- ============================================

-- Quiz definitions
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES learning_modules(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  passing_score INTEGER DEFAULT 70, -- Percentage needed to pass
  time_limit_minutes INTEGER, -- NULL = no time limit
  max_attempts INTEGER DEFAULT 3, -- NULL = unlimited
  show_correct_answers BOOLEAN DEFAULT true,
  randomize_questions BOOLEAN DEFAULT false,
  is_required BOOLEAN DEFAULT false, -- Required to complete module
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL, -- 'multiple_choice', 'true_false', 'short_answer'
  points INTEGER DEFAULT 1,
  order_index INTEGER NOT NULL,
  explanation TEXT, -- Shown after answer
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Answer options (for multiple choice)
CREATE TABLE IF NOT EXISTS quiz_answer_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User quiz attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  score DECIMAL(5,2), -- Percentage score
  points_earned INTEGER,
  total_points INTEGER,
  time_spent_seconds INTEGER,
  status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
  passed BOOLEAN,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User answers to quiz questions
CREATE TABLE IF NOT EXISTS quiz_user_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES quiz_answer_options(id) ON DELETE SET NULL, -- For multiple choice
  answer_text TEXT, -- For short answer
  is_correct BOOLEAN,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for quizzes
CREATE INDEX IF NOT EXISTS idx_quizzes_module_id ON quizzes(module_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_quiz ON quiz_attempts(user_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_status ON quiz_attempts(status);

-- ============================================
-- 2. CERTIFICATES
-- ============================================

-- Certificate templates
CREATE TABLE IF NOT EXISTS certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  background_color VARCHAR(50) DEFAULT '#ffffff',
  border_color VARCHAR(50) DEFAULT '#c9975b',
  logo_url TEXT,
  signature_url TEXT,
  template_html TEXT, -- Custom HTML template
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User certificates
CREATE TABLE IF NOT EXISTS user_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  template_id UUID REFERENCES certificate_templates(id) ON DELETE SET NULL,
  certificate_number VARCHAR(100) UNIQUE NOT NULL, -- e.g., "KIONGOZI-2026-001234"
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL = never expires
  verification_code VARCHAR(100) UNIQUE NOT NULL, -- For public verification
  pdf_url TEXT, -- Generated PDF URL
  metadata JSONB, -- Additional data (completion date, grade, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for certificates
CREATE INDEX IF NOT EXISTS idx_user_certificates_user_id ON user_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_user_certificates_course_id ON user_certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_user_certificates_verification ON user_certificates(verification_code);

-- ============================================
-- 3. DISCUSSION FORUMS / COMMENTS
-- ============================================

-- Discussion threads (for modules/courses)
CREATE TABLE IF NOT EXISTS discussion_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES learning_modules(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Thread replies/comments
CREATE TABLE IF NOT EXISTS discussion_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES discussion_threads(id) ON DELETE CASCADE,
  parent_reply_id UUID REFERENCES discussion_replies(id) ON DELETE CASCADE, -- For nested replies
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_solution BOOLEAN DEFAULT false, -- Mark as helpful answer
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reply votes (upvote/downvote)
CREATE TABLE IF NOT EXISTS discussion_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id UUID REFERENCES discussion_replies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type VARCHAR(10) NOT NULL, -- 'upvote', 'downvote'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(reply_id, user_id)
);

-- Indexes for discussions
CREATE INDEX IF NOT EXISTS idx_discussion_threads_course ON discussion_threads(course_id);
CREATE INDEX IF NOT EXISTS idx_discussion_threads_module ON discussion_threads(module_id);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_thread ON discussion_replies(thread_id);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_user ON discussion_replies(user_id);

-- ============================================
-- 4. NOTES & BOOKMARKS
-- ============================================

-- User notes (for modules)
CREATE TABLE IF NOT EXISTS user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  module_id UUID REFERENCES learning_modules(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  highlight_text TEXT, -- Text that was highlighted
  timestamp_seconds INTEGER, -- For video/audio notes
  color VARCHAR(50) DEFAULT '#ffeb3b', -- Highlight color
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User bookmarks
CREATE TABLE IF NOT EXISTS user_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES learning_modules(id) ON DELETE CASCADE,
  bookmark_type VARCHAR(50) DEFAULT 'module', -- 'module', 'course', 'section'
  notes TEXT, -- Optional note about why bookmarked
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for notes and bookmarks
CREATE INDEX IF NOT EXISTS idx_user_notes_user_module ON user_notes(user_id, module_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id ON user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_module ON user_bookmarks(module_id);

-- ============================================
-- 5. COURSE REVIEWS & RATINGS
-- ============================================

-- Course reviews
CREATE TABLE IF NOT EXISTS course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_title VARCHAR(255),
  review_text TEXT,
  is_verified_completion BOOLEAN DEFAULT false, -- Only if they completed course
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, user_id) -- One review per user per course
);

-- Review helpful votes
CREATE TABLE IF NOT EXISTS review_helpful_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES course_reviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- Indexes for reviews
CREATE INDEX IF NOT EXISTS idx_course_reviews_course_id ON course_reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_rating ON course_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_course_reviews_verified ON course_reviews(is_verified_completion);

-- ============================================
-- 6. ADVANCED SEARCH & FILTERS
-- ============================================

-- Course tags for better search
CREATE TABLE IF NOT EXISTS course_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(50) DEFAULT '#3b82f6',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Course-Tag relationship
CREATE TABLE IF NOT EXISTS course_tag_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES course_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, tag_id)
);

-- User search history (for personalization)
CREATE TABLE IF NOT EXISTS user_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  search_type VARCHAR(50) DEFAULT 'courses', -- 'courses', 'modules', 'all'
  results_found INTEGER DEFAULT 0,
  clicked_result_id UUID, -- Track which result they clicked
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for search
CREATE INDEX IF NOT EXISTS idx_course_tags_slug ON course_tags(slug);
CREATE INDEX IF NOT EXISTS idx_course_tag_mappings_course ON course_tag_mappings(course_id);
CREATE INDEX IF NOT EXISTS idx_course_tag_mappings_tag ON course_tag_mappings(tag_id);
CREATE INDEX IF NOT EXISTS idx_user_search_history_user ON user_search_history(user_id);

-- Full-text search indexes (PostgreSQL specific)
CREATE INDEX IF NOT EXISTS idx_courses_fulltext ON courses USING gin(to_tsvector('english', title || ' ' || description));
CREATE INDEX IF NOT EXISTS idx_modules_fulltext ON learning_modules USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Update thread reply count
CREATE OR REPLACE FUNCTION update_thread_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE discussion_threads
    SET reply_count = reply_count + 1
    WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE discussion_threads
    SET reply_count = GREATEST(reply_count - 1, 0)
    WHERE id = OLD.thread_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_thread_reply_count
AFTER INSERT OR DELETE ON discussion_replies
FOR EACH ROW EXECUTE FUNCTION update_thread_reply_count();

-- Update review helpful count
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE course_reviews
    SET helpful_count = helpful_count + 1
    WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE course_reviews
    SET helpful_count = GREATEST(helpful_count - 1, 0)
    WHERE id = OLD.review_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_review_helpful_count
AFTER INSERT OR DELETE ON review_helpful_votes
FOR EACH ROW EXECUTE FUNCTION update_review_helpful_count();

-- Update reply upvotes
CREATE OR REPLACE FUNCTION update_reply_upvotes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE discussion_replies
    SET upvotes = upvotes + (CASE WHEN NEW.vote_type = 'upvote' THEN 1 ELSE -1 END)
    WHERE id = NEW.reply_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE discussion_replies
    SET upvotes = upvotes - (CASE WHEN OLD.vote_type = 'upvote' THEN 1 ELSE -1 END)
    WHERE id = OLD.reply_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reply_upvotes
AFTER INSERT OR DELETE ON discussion_votes
FOR EACH ROW EXECUTE FUNCTION update_reply_upvotes();

-- Update tag usage count
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE course_tags
    SET usage_count = usage_count + 1
    WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE course_tags
    SET usage_count = GREATEST(usage_count - 1, 0)
    WHERE id = OLD.tag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tag_usage_count
AFTER INSERT OR DELETE ON course_tag_mappings
FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answer_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_tag_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_search_history ENABLE ROW LEVEL SECURITY;

-- Quizzes: Everyone can view, only enrolled users can attempt
CREATE POLICY "Anyone can view quizzes" ON quizzes FOR SELECT USING (true);
CREATE POLICY "Anyone can view quiz questions" ON quiz_questions FOR SELECT USING (true);
CREATE POLICY "Anyone can view answer options" ON quiz_answer_options FOR SELECT USING (true);

-- Quiz attempts: Users can only view/manage their own attempts
CREATE POLICY "Users can view own attempts" ON quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own attempts" ON quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own attempts" ON quiz_attempts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own answers" ON quiz_user_answers FOR SELECT USING (
  attempt_id IN (SELECT id FROM quiz_attempts WHERE user_id = auth.uid())
);
CREATE POLICY "Users can create own answers" ON quiz_user_answers FOR INSERT WITH CHECK (
  attempt_id IN (SELECT id FROM quiz_attempts WHERE user_id = auth.uid())
);

-- Certificates: Users can view own certificates, verification codes are public
CREATE POLICY "Anyone can view certificates for verification" ON user_certificates FOR SELECT USING (true);
CREATE POLICY "Users can view own certificates" ON user_certificates FOR SELECT USING (auth.uid() = user_id);

-- Certificate templates: Everyone can view
CREATE POLICY "Anyone can view certificate templates" ON certificate_templates FOR SELECT USING (true);

-- Discussions: Everyone can view, authenticated users can post
CREATE POLICY "Anyone can view threads" ON discussion_threads FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create threads" ON discussion_threads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own threads" ON discussion_threads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own threads" ON discussion_threads FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view replies" ON discussion_replies FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create replies" ON discussion_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own replies" ON discussion_replies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own replies" ON discussion_replies FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can vote" ON discussion_votes FOR ALL USING (auth.uid() = user_id);

-- Notes: Users can only access their own notes
CREATE POLICY "Users can manage own notes" ON user_notes FOR ALL USING (auth.uid() = user_id);

-- Bookmarks: Users can only access their own bookmarks
CREATE POLICY "Users can manage own bookmarks" ON user_bookmarks FOR ALL USING (auth.uid() = user_id);

-- Reviews: Everyone can view, authenticated users can create/manage own
CREATE POLICY "Anyone can view reviews" ON course_reviews FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create reviews" ON course_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON course_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON course_reviews FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can vote on reviews" ON review_helpful_votes FOR ALL USING (auth.uid() = user_id);

-- Tags: Everyone can view
CREATE POLICY "Anyone can view tags" ON course_tags FOR SELECT USING (true);
CREATE POLICY "Anyone can view tag mappings" ON course_tag_mappings FOR SELECT USING (true);

-- Search history: Users can only access their own
CREATE POLICY "Users can manage own search history" ON user_search_history FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- SAMPLE DATA (OPTIONAL)
-- ============================================

-- Insert default certificate template
INSERT INTO certificate_templates (name, description, is_default)
VALUES (
  'Kiongozi Standard Certificate',
  'Default certificate template for course completion',
  true
) ON CONFLICT DO NOTHING;

-- Insert some common tags
INSERT INTO course_tags (name, slug, color, description) VALUES
  ('Green Technology', 'green-tech', '#10b981', 'Courses focused on sustainable and green technologies'),
  ('Digital Skills', 'digital-skills', '#3b82f6', 'Essential digital and tech skills'),
  ('Beginner Friendly', 'beginner', '#f59e0b', 'Great for beginners with no prior experience'),
  ('Certification', 'certification', '#8b5cf6', 'Includes official certification upon completion'),
  ('Hands-on', 'hands-on', '#ef4444', 'Practical, project-based learning')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Kiongozi LMS Feature Tables Created Successfully!';
  RAISE NOTICE '📊 Features: Quizzes, Certificates, Discussions, Notes, Reviews, Search';
  RAISE NOTICE '🔒 Row Level Security (RLS) enabled on all tables';
  RAISE NOTICE '🎯 Ready to implement frontend components!';
END $$;
