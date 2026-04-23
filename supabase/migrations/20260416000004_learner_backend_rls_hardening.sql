-- Backend/RLS hardening for learner-facing tables.
-- This tightens client-side access to progress, bookmarks, reviews, and quiz data.

DO $$
DECLARE
    target_table text;
    policy_record record;
BEGIN
    FOREACH target_table IN ARRAY ARRAY[
        'user_progress',
        'user_bookmarks',
        'course_reviews',
        'quizzes',
        'quiz_questions',
        'quiz_options',
        'quiz_attempts'
    ]
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);

        FOR policy_record IN
            SELECT policyname
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = target_table
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, target_table);
        END LOOP;
    END LOOP;
END
$$;

-- ─────────────────────────────────────────────
-- user_progress
-- ─────────────────────────────────────────────
CREATE POLICY "Users can view eligible progress rows"
ON public.user_progress FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = user_progress.course_id
          AND (
              c.author_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.profiles p
                  WHERE p.id = auth.uid()
                    AND p.role = 'admin'
              )
          )
    )
);

CREATE POLICY "Users can insert their own eligible progress rows"
ON public.user_progress FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1
        FROM public.course_modules cm
        JOIN public.courses c ON c.id = cm.course_id
        WHERE cm.course_id = user_progress.course_id
          AND cm.module_id = user_progress.module_id
          AND (
              c.author_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.profiles p
                  WHERE p.id = auth.uid()
                    AND p.role = 'admin'
              )
              OR EXISTS (
                  SELECT 1
                  FROM public.course_enrollments e
                  WHERE e.course_id = user_progress.course_id
                    AND e.user_id = auth.uid()
                    AND e.status IN ('active', 'completed')
              )
          )
    )
);

CREATE POLICY "Users can update their own eligible progress rows"
ON public.user_progress FOR UPDATE
TO authenticated
USING (
    auth.uid() = user_id
)
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1
        FROM public.course_modules cm
        JOIN public.courses c ON c.id = cm.course_id
        WHERE cm.course_id = user_progress.course_id
          AND cm.module_id = user_progress.module_id
          AND (
              c.author_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.profiles p
                  WHERE p.id = auth.uid()
                    AND p.role = 'admin'
              )
              OR EXISTS (
                  SELECT 1
                  FROM public.course_enrollments e
                  WHERE e.course_id = user_progress.course_id
                    AND e.user_id = auth.uid()
                    AND e.status IN ('active', 'completed')
              )
          )
    )
);

CREATE POLICY "Users can delete their own progress rows"
ON public.user_progress FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- user_bookmarks
-- ─────────────────────────────────────────────
CREATE POLICY "Users can view their own bookmarks"
ON public.user_bookmarks FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks"
ON public.user_bookmarks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookmarks"
ON public.user_bookmarks FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
ON public.user_bookmarks FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- course_reviews
-- ─────────────────────────────────────────────
CREATE POLICY "Course reviews are viewable by everyone"
ON public.course_reviews FOR SELECT
USING (true);

CREATE POLICY "Enrolled users can write their own reviews"
ON public.course_reviews FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1
        FROM public.course_enrollments e
        WHERE e.course_id = course_reviews.course_id
          AND e.user_id = auth.uid()
          AND e.status IN ('active', 'completed')
    )
);

CREATE POLICY "Users can update their own enrolled reviews"
ON public.course_reviews FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1
        FROM public.course_enrollments e
        WHERE e.course_id = course_reviews.course_id
          AND e.user_id = auth.uid()
          AND e.status IN ('active', 'completed')
    )
);

CREATE POLICY "Users can delete their own reviews or admins can moderate"
ON public.course_reviews FOR DELETE
TO authenticated
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'admin'
    )
);

-- ─────────────────────────────────────────────
-- quizzes
-- ─────────────────────────────────────────────
CREATE POLICY "Eligible users can view quizzes"
ON public.quizzes FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = quizzes.course_id
          AND (
              c.author_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.profiles p
                  WHERE p.id = auth.uid()
                    AND p.role = 'admin'
              )
              OR EXISTS (
                  SELECT 1
                  FROM public.course_enrollments e
                  WHERE e.course_id = quizzes.course_id
                    AND e.user_id = auth.uid()
                    AND e.status IN ('active', 'completed')
              )
          )
    )
);

CREATE POLICY "Course authors can create quizzes"
ON public.quizzes FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = quizzes.course_id
          AND (
              c.author_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.profiles p
                  WHERE p.id = auth.uid()
                    AND p.role = 'admin'
              )
          )
    )
);

CREATE POLICY "Course authors can update quizzes"
ON public.quizzes FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = quizzes.course_id
          AND (
              c.author_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.profiles p
                  WHERE p.id = auth.uid()
                    AND p.role = 'admin'
              )
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = quizzes.course_id
          AND (
              c.author_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.profiles p
                  WHERE p.id = auth.uid()
                    AND p.role = 'admin'
              )
          )
    )
);

CREATE POLICY "Course authors can delete quizzes"
ON public.quizzes FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = quizzes.course_id
          AND (
              c.author_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.profiles p
                  WHERE p.id = auth.uid()
                    AND p.role = 'admin'
              )
          )
    )
);

-- ─────────────────────────────────────────────
-- quiz_questions
-- ─────────────────────────────────────────────
CREATE POLICY "Course authors can view quiz questions"
ON public.quiz_questions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.quizzes q
        JOIN public.courses c ON c.id = q.course_id
        WHERE q.id = quiz_questions.quiz_id
          AND (
              c.author_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.profiles p
                  WHERE p.id = auth.uid()
                    AND p.role = 'admin'
              )
          )
    )
);

CREATE POLICY "Course authors can create quiz questions"
ON public.quiz_questions FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.quizzes q
        JOIN public.courses c ON c.id = q.course_id
        WHERE q.id = quiz_questions.quiz_id
          AND (
              c.author_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.profiles p
                  WHERE p.id = auth.uid()
                    AND p.role = 'admin'
              )
          )
    )
);

CREATE POLICY "Course authors can update quiz questions"
ON public.quiz_questions FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.quizzes q
        JOIN public.courses c ON c.id = q.course_id
        WHERE q.id = quiz_questions.quiz_id
          AND (
              c.author_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.profiles p
                  WHERE p.id = auth.uid()
                    AND p.role = 'admin'
              )
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.quizzes q
        JOIN public.courses c ON c.id = q.course_id
        WHERE q.id = quiz_questions.quiz_id
          AND (
              c.author_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.profiles p
                  WHERE p.id = auth.uid()
                    AND p.role = 'admin'
              )
          )
    )
);

CREATE POLICY "Course authors can delete quiz questions"
ON public.quiz_questions FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.quizzes q
        JOIN public.courses c ON c.id = q.course_id
        WHERE q.id = quiz_questions.quiz_id
          AND (
              c.author_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.profiles p
                  WHERE p.id = auth.uid()
                    AND p.role = 'admin'
              )
          )
    )
);

-- ─────────────────────────────────────────────
-- quiz_options
-- ─────────────────────────────────────────────
CREATE POLICY "Course authors can view quiz options"
ON public.quiz_options FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.quiz_questions qq
        JOIN public.quizzes q ON q.id = qq.quiz_id
        JOIN public.courses c ON c.id = q.course_id
        WHERE qq.id = quiz_options.question_id
          AND (
              c.author_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.profiles p
                  WHERE p.id = auth.uid()
                    AND p.role = 'admin'
              )
          )
    )
);

CREATE POLICY "Course authors can create quiz options"
ON public.quiz_options FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.quiz_questions qq
        JOIN public.quizzes q ON q.id = qq.quiz_id
        JOIN public.courses c ON c.id = q.course_id
        WHERE qq.id = quiz_options.question_id
          AND (
              c.author_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.profiles p
                  WHERE p.id = auth.uid()
                    AND p.role = 'admin'
              )
          )
    )
);

CREATE POLICY "Course authors can update quiz options"
ON public.quiz_options FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.quiz_questions qq
        JOIN public.quizzes q ON q.id = qq.quiz_id
        JOIN public.courses c ON c.id = q.course_id
        WHERE qq.id = quiz_options.question_id
          AND (
              c.author_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.profiles p
                  WHERE p.id = auth.uid()
                    AND p.role = 'admin'
              )
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.quiz_questions qq
        JOIN public.quizzes q ON q.id = qq.quiz_id
        JOIN public.courses c ON c.id = q.course_id
        WHERE qq.id = quiz_options.question_id
          AND (
              c.author_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.profiles p
                  WHERE p.id = auth.uid()
                    AND p.role = 'admin'
              )
          )
    )
);

CREATE POLICY "Course authors can delete quiz options"
ON public.quiz_options FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.quiz_questions qq
        JOIN public.quizzes q ON q.id = qq.quiz_id
        JOIN public.courses c ON c.id = q.course_id
        WHERE qq.id = quiz_options.question_id
          AND (
              c.author_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.profiles p
                  WHERE p.id = auth.uid()
                    AND p.role = 'admin'
              )
          )
    )
);

-- ─────────────────────────────────────────────
-- quiz_attempts
-- ─────────────────────────────────────────────
CREATE POLICY "Users can view their own quiz attempts and course authors can review them"
ON public.quiz_attempts FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1
        FROM public.quizzes q
        JOIN public.courses c ON c.id = q.course_id
        WHERE q.id = quiz_attempts.quiz_id
          AND (
              c.author_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.profiles p
                  WHERE p.id = auth.uid()
                    AND p.role = 'admin'
              )
          )
    )
);
