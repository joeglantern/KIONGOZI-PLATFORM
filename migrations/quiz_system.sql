-- Clean up if re-running
DROP TABLE IF EXISTS quiz_attempts CASCADE;
DROP TABLE IF EXISTS quiz_options CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;

-- Create quizzes table
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    module_id UUID, -- Optional link to a module (no FK constraint since modules table may not exist)
    title TEXT NOT NULL,
    description TEXT,
    passing_score INTEGER DEFAULT 70, -- Percentage required to pass
    time_limit_minutes INTEGER DEFAULT 0, -- 0 means no limit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz_questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'multiple_choice', -- 'multiple_choice', 'true_false', etc.
    order_index INTEGER DEFAULT 0,
    points INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz_options table
CREATE TABLE IF NOT EXISTS quiz_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz_attempts table
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL, -- The final score achieved
    passed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Policies for Quizzes
CREATE POLICY "Quizzes are viewable by everyone" ON quizzes
    FOR SELECT USING (true);

CREATE POLICY "Instructors can insert quizzes" ON quizzes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = quizzes.course_id 
            AND courses.author_id = auth.uid()
        )
    );

CREATE POLICY "Instructors can update their quizzes" ON quizzes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = quizzes.course_id 
            AND courses.author_id = auth.uid()
        )
    );

CREATE POLICY "Instructors can delete their quizzes" ON quizzes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = quizzes.course_id 
            AND courses.author_id = auth.uid()
        )
    );

-- Policies for Questions (inherit from quiz permissions)
CREATE POLICY "Questions viewable by everyone" ON quiz_questions
    FOR SELECT USING (true);

CREATE POLICY "Instructors can manage questions" ON quiz_questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM quizzes
            JOIN courses ON quizzes.course_id = courses.id
            WHERE quizzes.id = quiz_questions.quiz_id
            AND courses.author_id = auth.uid()
        )
    );

-- Policies for Options (inherit from quiz permissions)
CREATE POLICY "Options viewable by everyone" ON quiz_options
    FOR SELECT USING (true);

CREATE POLICY "Instructors can manage options" ON quiz_options
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM quiz_questions
            JOIN quizzes ON quiz_questions.quiz_id = quizzes.id
            JOIN courses ON quizzes.course_id = courses.id
            WHERE quiz_questions.id = quiz_options.question_id
            AND courses.author_id = auth.uid()
        )
    );

-- Policies for Attempts
CREATE POLICY "Users can view their own attempts" ON quiz_attempts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Instructors can view attempts for their courses" ON quiz_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM quizzes
            JOIN courses ON quizzes.course_id = courses.id
            WHERE quizzes.id = quiz_attempts.quiz_id
            AND courses.author_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own attempts" ON quiz_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);
