-- Require a course-level final quiz before course completion.
-- This is intentionally idempotent so it can run after live manual seeding.

WITH missing_courses AS (
  SELECT c.id, c.title
  FROM public.courses c
  WHERE c.deleted_at IS NULL
    AND c.status = 'published'
    AND NOT EXISTS (
      SELECT 1
      FROM public.quizzes q
      WHERE q.course_id = c.id
        AND q.module_id IS NULL
    )
),
inserted_quizzes AS (
  INSERT INTO public.quizzes (course_id, module_id, title, description, passing_score, time_limit_minutes)
  SELECT
    mc.id,
    NULL,
    mc.title || ' Final Check',
    'A short practical assessment to confirm the learner can apply the course ideas before completion',
    70,
    0
  FROM missing_courses mc
  RETURNING id, course_id
),
quiz_context AS (
  SELECT iq.id AS quiz_id, c.title AS course_title
  FROM inserted_quizzes iq
  JOIN public.courses c ON c.id = iq.course_id
),
question_seed AS (
  SELECT
    qc.quiz_id,
    v.order_index,
    replace(v.question_text, '{{course}}', qc.course_title) AS question_text
  FROM quiz_context qc
  CROSS JOIN LATERAL (
    VALUES
      (1, 'You have completed {{course}}. What is the strongest next step before claiming you are ready to act on it?'),
      (2, 'A peer asks why {{course}} matters in their community. What is the best answer?'),
      (3, 'Which example best shows that a learner has applied {{course}} instead of only reading it?'),
      (4, 'Before making a public recommendation after {{course}}, what should you check first?'),
      (5, 'Your first attempt to use ideas from {{course}} does not work. What is the best response?'),
      (6, 'What should you keep as proof that you completed {{course}} and are ready for the next step?')
  ) AS v(order_index, question_text)
),
inserted_questions AS (
  INSERT INTO public.quiz_questions (quiz_id, question_text, question_type, order_index, points)
  SELECT quiz_id, question_text, 'multiple_choice', order_index, 10
  FROM question_seed
  RETURNING id, order_index
),
option_seed AS (
  SELECT
    iq.id AS question_id,
    v.option_index,
    v.option_text,
    v.is_correct
  FROM inserted_questions iq
  CROSS JOIN LATERAL (
    VALUES
      (1, 1, 'Summarize the main idea, choose one realistic action, and note the evidence or people needed', true),
      (1, 2, 'Post that you are now an expert and wait for people to contact you', false),
      (1, 3, 'Skip planning and start with the biggest possible public action', false),
      (1, 4, 'Only reread the course notes without choosing a real next step', false),
      (2, 1, 'Connect the lesson to a real local problem, who is affected, and a practical first step', true),
      (2, 2, 'Use technical terms so the answer sounds more advanced', false),
      (2, 3, 'Tell them it matters because the platform says it is important', false),
      (2, 4, 'Avoid examples because community situations are too complicated', false),
      (3, 1, 'Testing a small action, collecting feedback, and improving the plan', true),
      (3, 2, 'Finishing the slides quickly without discussing the ideas', false),
      (3, 3, 'Memorizing definitions but avoiding real situations', false),
      (3, 4, 'Waiting until every detail is perfect before doing anything', false),
      (4, 1, 'Facts, stakeholders, risks, and whether the recommendation is realistic', true),
      (4, 2, 'Whether the message sounds impressive enough', false),
      (4, 3, 'Only whether your friends agree with you', false),
      (4, 4, 'The fastest way to publish it before anyone asks questions', false),
      (5, 1, 'Review what happened, ask for feedback, adjust, and try a smaller next step', true),
      (5, 2, 'Assume the course was wrong and abandon the idea completely', false),
      (5, 3, 'Repeat the same approach without changing anything', false),
      (5, 4, 'Blame the community for not understanding your plan', false),
      (6, 1, 'A short action plan with evidence, roles, timeline, and next review date', true),
      (6, 2, 'Only a screenshot of the course page', false),
      (6, 3, 'A long copied passage from the course material', false),
      (6, 4, 'A promise to come back later without any concrete action', false)
  ) AS v(question_order, option_index, option_text, is_correct)
  WHERE v.question_order = iq.order_index
)
INSERT INTO public.quiz_options (question_id, option_text, is_correct)
SELECT question_id, option_text, is_correct
FROM option_seed
ORDER BY question_id, option_index;

WITH module_counts AS (
  SELECT ce.id AS enrollment_id, count(cm.module_id)::int AS module_count
  FROM public.course_enrollments ce
  LEFT JOIN public.course_modules cm ON cm.course_id = ce.course_id
  WHERE ce.status IN ('active', 'completed')
  GROUP BY ce.id
),
completed_module_counts AS (
  SELECT ce.id AS enrollment_id, count(DISTINCT up.module_id)::int AS completed_module_count
  FROM public.course_enrollments ce
  LEFT JOIN public.course_modules cm ON cm.course_id = ce.course_id
  LEFT JOIN public.user_progress up
    ON up.course_id = ce.course_id
   AND up.module_id = cm.module_id
   AND up.user_id = ce.user_id
   AND up.status = 'completed'
  WHERE ce.status IN ('active', 'completed')
  GROUP BY ce.id
),
scorm_counts AS (
  SELECT ce.id AS enrollment_id, count(sp.id)::int AS scorm_count
  FROM public.course_enrollments ce
  LEFT JOIN public.scorm_packages sp ON sp.course_id = ce.course_id AND sp.status = 'active'
  WHERE ce.status IN ('active', 'completed')
  GROUP BY ce.id
),
completed_scorm_counts AS (
  SELECT ce.id AS enrollment_id, count(DISTINCT sr.package_id)::int AS completed_scorm_count
  FROM public.course_enrollments ce
  LEFT JOIN public.scorm_packages sp ON sp.course_id = ce.course_id AND sp.status = 'active'
  LEFT JOIN public.scorm_registrations sr
    ON sr.package_id = sp.id
   AND sr.user_id = ce.user_id
   AND sr.lesson_status IN ('completed', 'passed')
  WHERE ce.status IN ('active', 'completed')
  GROUP BY ce.id
),
final_quizzes AS (
  SELECT DISTINCT ON (course_id) course_id, id AS quiz_id
  FROM public.quizzes
  WHERE module_id IS NULL
  ORDER BY course_id, created_at ASC
),
final_passes AS (
  SELECT ce.id AS enrollment_id, bool_or(qa.passed) AS final_quiz_passed
  FROM public.course_enrollments ce
  LEFT JOIN final_quizzes fq ON fq.course_id = ce.course_id
  LEFT JOIN public.quiz_attempts qa ON qa.quiz_id = fq.quiz_id AND qa.user_id = ce.user_id AND qa.passed = true
  WHERE ce.status IN ('active', 'completed')
  GROUP BY ce.id
),
calc AS (
  SELECT
    ce.id,
    coalesce(ce.progress_percentage, 0) AS old_progress,
    (coalesce(mc.module_count, 0) + coalesce(sc.scorm_count, 0) + CASE WHEN fq.quiz_id IS NOT NULL THEN 1 ELSE 0 END) AS total_items,
    (coalesce(cmc.completed_module_count, 0) + coalesce(csc.completed_scorm_count, 0) + CASE WHEN coalesce(fp.final_quiz_passed, false) THEN 1 ELSE 0 END) AS completed_items
  FROM public.course_enrollments ce
  LEFT JOIN module_counts mc ON mc.enrollment_id = ce.id
  LEFT JOIN completed_module_counts cmc ON cmc.enrollment_id = ce.id
  LEFT JOIN scorm_counts sc ON sc.enrollment_id = ce.id
  LEFT JOIN completed_scorm_counts csc ON csc.enrollment_id = ce.id
  LEFT JOIN final_quizzes fq ON fq.course_id = ce.course_id
  LEFT JOIN final_passes fp ON fp.enrollment_id = ce.id
  WHERE ce.status IN ('active', 'completed')
),
normalized AS (
  SELECT
    *,
    CASE
      WHEN total_items > 0 THEN round((completed_items::numeric / total_items::numeric) * 100)::int
      ELSE 0
    END AS new_progress
  FROM calc
)
UPDATE public.course_enrollments ce
SET
  progress_percentage = n.new_progress,
  status = CASE WHEN n.new_progress = 100 THEN 'completed' WHEN ce.status = 'completed' THEN 'active' ELSE ce.status END,
  completed_at = CASE WHEN n.new_progress = 100 THEN coalesce(ce.completed_at, now()) ELSE NULL END,
  updated_at = now()
FROM normalized n
WHERE ce.id = n.id
  AND (
    coalesce(ce.progress_percentage, 0) IS DISTINCT FROM n.new_progress
    OR ce.status IS DISTINCT FROM (CASE WHEN n.new_progress = 100 THEN 'completed' WHEN ce.status = 'completed' THEN 'active' ELSE ce.status END)
    OR (n.new_progress < 100 AND ce.completed_at IS NOT NULL)
    OR (n.new_progress = 100 AND ce.completed_at IS NULL)
  );
