-- ============================================
-- CREATE TEST QUIZ
-- ============================================
-- This script creates a sample quiz for testing
-- Replace 'YOUR_MODULE_ID_HERE' with an actual module ID from your database

-- First, let's see what modules you have
-- Run this query first to get a module ID:
-- SELECT id, title FROM learning_modules LIMIT 5;

-- Then replace the module_id below with one of those IDs

-- ============================================
-- INSERT TEST QUIZ
-- ============================================

-- Create a quiz for a module
INSERT INTO quizzes (
  module_id,
  title,
  description,
  passing_score,
  time_limit_minutes,
  max_attempts,
  show_correct_answers,
  randomize_questions,
  is_required
) VALUES (
  'YOUR_MODULE_ID_HERE',  -- Replace with actual module ID
  'Module Knowledge Check',
  'Test your understanding of the key concepts covered in this module',
  70,  -- 70% to pass
  15,  -- 15 minute time limit
  3,   -- Max 3 attempts
  true, -- Show correct answers after submission
  false, -- Don't randomize questions
  true  -- Required to complete module
) RETURNING id;

-- ============================================
-- INSERT TEST QUESTIONS
-- ============================================

-- Question 1: Multiple Choice
INSERT INTO quiz_questions (
  quiz_id,
  question_text,
  question_type,
  points,
  order_index,
  explanation
) VALUES (
  (SELECT id FROM quizzes WHERE title = 'Module Knowledge Check' ORDER BY created_at DESC LIMIT 1),
  'What is the primary benefit of renewable energy?',
  'multiple_choice',
  10,
  1,
  'Renewable energy sources produce minimal greenhouse gas emissions compared to fossil fuels, making them better for the environment.'
) RETURNING id;

-- Answer options for Question 1
INSERT INTO quiz_answer_options (question_id, option_text, is_correct, order_index) VALUES
  ((SELECT id FROM quiz_questions WHERE question_text LIKE '%primary benefit%' ORDER BY created_at DESC LIMIT 1), 'Lower cost than fossil fuels', false, 1),
  ((SELECT id FROM quiz_questions WHERE question_text LIKE '%primary benefit%' ORDER BY created_at DESC LIMIT 1), 'Environmentally friendly with minimal emissions', true, 2),
  ((SELECT id FROM quiz_questions WHERE question_text LIKE '%primary benefit%' ORDER BY created_at DESC LIMIT 1), 'Easier to transport', false, 3),
  ((SELECT id FROM quiz_questions WHERE question_text LIKE '%primary benefit%' ORDER BY created_at DESC LIMIT 1), 'Available only in certain regions', false, 4);

-- Question 2: Multiple Choice
INSERT INTO quiz_questions (
  quiz_id,
  question_text,
  question_type,
  points,
  order_index,
  explanation
) VALUES (
  (SELECT id FROM quizzes WHERE title = 'Module Knowledge Check' ORDER BY created_at DESC LIMIT 1),
  'Which of the following is a renewable energy source?',
  'multiple_choice',
  10,
  2,
  'Solar energy is a renewable energy source because it comes from the sun, which is naturally replenished daily.'
) RETURNING id;

-- Answer options for Question 2
INSERT INTO quiz_answer_options (question_id, option_text, is_correct, order_index) VALUES
  ((SELECT id FROM quiz_questions WHERE question_text LIKE '%renewable energy source%' ORDER BY created_at DESC LIMIT 1), 'Coal', false, 1),
  ((SELECT id FROM quiz_questions WHERE question_text LIKE '%renewable energy source%' ORDER BY created_at DESC LIMIT 1), 'Natural Gas', false, 2),
  ((SELECT id FROM quiz_questions WHERE question_text LIKE '%renewable energy source%' ORDER BY created_at DESC LIMIT 1), 'Solar Energy', true, 3),
  ((SELECT id FROM quiz_questions WHERE question_text LIKE '%renewable energy source%' ORDER BY created_at DESC LIMIT 1), 'Oil', false, 4);

-- Question 3: True/False
INSERT INTO quiz_questions (
  quiz_id,
  question_text,
  question_type,
  points,
  order_index,
  explanation
) VALUES (
  (SELECT id FROM quizzes WHERE title = 'Module Knowledge Check' ORDER BY created_at DESC LIMIT 1),
  'Solar panels can only generate electricity during daytime.',
  'true_false',
  10,
  3,
  'Solar panels require sunlight to generate electricity, so they only work during daytime. However, battery storage systems can store energy for nighttime use.'
) RETURNING id;

-- Answer options for Question 3
INSERT INTO quiz_answer_options (question_id, option_text, is_correct, order_index) VALUES
  ((SELECT id FROM quiz_questions WHERE question_text LIKE '%Solar panels%' ORDER BY created_at DESC LIMIT 1), 'True', true, 1),
  ((SELECT id FROM quiz_questions WHERE question_text LIKE '%Solar panels%' ORDER BY created_at DESC LIMIT 1), 'False', false, 2);

-- Question 4: Multiple Choice
INSERT INTO quiz_questions (
  quiz_id,
  question_text,
  question_type,
  points,
  order_index,
  explanation
) VALUES (
  (SELECT id FROM quizzes WHERE title = 'Module Knowledge Check' ORDER BY created_at DESC LIMIT 1),
  'What does "sustainable development" mean?',
  'multiple_choice',
  10,
  4,
  'Sustainable development meets the needs of the present without compromising the ability of future generations to meet their own needs.'
) RETURNING id;

-- Answer options for Question 4
INSERT INTO quiz_answer_options (question_id, option_text, is_correct, order_index) VALUES
  ((SELECT id FROM quiz_questions WHERE question_text LIKE '%sustainable development%' ORDER BY created_at DESC LIMIT 1), 'Development that uses only modern technology', false, 1),
  ((SELECT id FROM quiz_questions WHERE question_text LIKE '%sustainable development%' ORDER BY created_at DESC LIMIT 1), 'Development that meets present needs without harming future generations', true, 2),
  ((SELECT id FROM quiz_questions WHERE question_text LIKE '%sustainable development%' ORDER BY created_at DESC LIMIT 1), 'Development focused only on economic growth', false, 3),
  ((SELECT id FROM quiz_questions WHERE question_text LIKE '%sustainable development%' ORDER BY created_at DESC LIMIT 1), 'Development that prioritizes speed over quality', false, 4);

-- Question 5: Multiple Choice
INSERT INTO quiz_questions (
  quiz_id,
  question_text,
  question_type,
  points,
  order_index,
  explanation
) VALUES (
  (SELECT id FROM quizzes WHERE title = 'Module Knowledge Check' ORDER BY created_at DESC LIMIT 1),
  'Which technology is commonly used to store renewable energy for later use?',
  'multiple_choice',
  10,
  5,
  'Battery storage systems are the most common technology for storing excess renewable energy to use when the sun isn''t shining or wind isn''t blowing.'
) RETURNING id;

-- Answer options for Question 5
INSERT INTO quiz_answer_options (question_id, option_text, is_correct, order_index) VALUES
  ((SELECT id FROM quiz_questions WHERE question_text LIKE '%store renewable energy%' ORDER BY created_at DESC LIMIT 1), 'Gas turbines', false, 1),
  ((SELECT id FROM quiz_questions WHERE question_text LIKE '%store renewable energy%' ORDER BY created_at DESC LIMIT 1), 'Battery storage systems', true, 2),
  ((SELECT id FROM quiz_questions WHERE question_text LIKE '%store renewable energy%' ORDER BY created_at DESC LIMIT 1), 'Diesel generators', false, 3),
  ((SELECT id FROM quiz_questions WHERE question_text LIKE '%store renewable energy%' ORDER BY created_at DESC LIMIT 1), 'Water heaters', false, 4);

-- ============================================
-- VERIFY QUIZ CREATION
-- ============================================

-- Check the quiz was created
SELECT
  q.id,
  q.title,
  q.description,
  q.passing_score,
  COUNT(qq.id) as question_count
FROM quizzes q
LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
WHERE q.title = 'Module Knowledge Check'
GROUP BY q.id, q.title, q.description, q.passing_score
ORDER BY q.created_at DESC
LIMIT 1;

-- Check questions and answers
SELECT
  qq.order_index,
  qq.question_text,
  qq.question_type,
  qq.points,
  COUNT(qao.id) as option_count
FROM quiz_questions qq
LEFT JOIN quiz_answer_options qao ON qao.question_id = qq.id
WHERE qq.quiz_id = (SELECT id FROM quizzes WHERE title = 'Module Knowledge Check' ORDER BY created_at DESC LIMIT 1)
GROUP BY qq.id, qq.order_index, qq.question_text, qq.question_type, qq.points
ORDER BY qq.order_index;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Test quiz created successfully!';
  RAISE NOTICE '📝 Quiz: Module Knowledge Check';
  RAISE NOTICE '❓ 5 questions with multiple choice and true/false';
  RAISE NOTICE '⏰ 15 minute time limit, 70%% passing score';
  RAISE NOTICE '🎯 Ready to test on your module!';
END $$;
