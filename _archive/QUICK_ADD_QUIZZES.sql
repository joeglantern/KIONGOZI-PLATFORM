-- ============================================
-- QUICK ADD QUIZZES - Ready to Run!
-- ============================================
-- This creates 3 sample quizzes you can test immediately
-- Then follow the pattern to add more

-- ============================================
-- 1. HTML FUNDAMENTALS (2fc5f6be-0603-449b-afc2-22c890e4d3b4)
-- ============================================

INSERT INTO quizzes (module_id, title, description, passing_score, time_limit_minutes, max_attempts, show_correct_answers, is_required)
VALUES ('2fc5f6be-0603-449b-afc2-22c890e4d3b4', 'HTML Fundamentals Quiz', 'Test your HTML knowledge', 70, 15, 3, true, true);

INSERT INTO quiz_questions (quiz_id, question_text, question_type, points, order_index, explanation)
SELECT id, 'What does HTML stand for?', 'multiple_choice', 10, 1, 'HTML stands for HyperText Markup Language.'
FROM quizzes WHERE module_id = '2fc5f6be-0603-449b-afc2-22c890e4d3b4' ORDER BY created_at DESC LIMIT 1;

INSERT INTO quiz_answer_options (question_id, option_text, is_correct, order_index)
SELECT q.id, 'Hyper Tool Markup Language', false, 1 FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.module_id = '2fc5f6be-0603-449b-afc2-22c890e4d3b4' AND q.order_index = 1
UNION ALL
SELECT q.id, 'HyperText Markup Language', true, 2 FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.module_id = '2fc5f6be-0603-449b-afc2-22c890e4d3b4' AND q.order_index = 1
UNION ALL
SELECT q.id, 'High-Level Text Language', false, 3 FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.module_id = '2fc5f6be-0603-449b-afc2-22c890e4d3b4' AND q.order_index = 1
UNION ALL
SELECT q.id, 'Home Tool Markup Language', false, 4 FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.module_id = '2fc5f6be-0603-449b-afc2-22c890e4d3b4' AND q.order_index = 1;

-- Question 2
INSERT INTO quiz_questions (quiz_id, question_text, question_type, points, order_index, explanation)
SELECT id, 'Which tag is used for the largest heading?', 'multiple_choice', 10, 2, 'The <h1> tag is the largest heading.'
FROM quizzes WHERE module_id = '2fc5f6be-0603-449b-afc2-22c890e4d3b4' ORDER BY created_at DESC LIMIT 1;

INSERT INTO quiz_answer_options (question_id, option_text, is_correct, order_index)
SELECT q.id, '<heading>', false, 1 FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.module_id = '2fc5f6be-0603-449b-afc2-22c890e4d3b4' AND q.order_index = 2
UNION ALL
SELECT q.id, '<h1>', true, 2 FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.module_id = '2fc5f6be-0603-449b-afc2-22c890e4d3b4' AND q.order_index = 2
UNION ALL
SELECT q.id, '<h6>', false, 3 FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.module_id = '2fc5f6be-0603-449b-afc2-22c890e4d3b4' AND q.order_index = 2
UNION ALL
SELECT q.id, '<head>', false, 4 FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.module_id = '2fc5f6be-0603-449b-afc2-22c890e4d3b4' AND q.order_index = 2;

-- ============================================
-- 2. CSS BASICS (742d48c0-fbe6-4345-adfd-ee6ab899a01b)
-- ============================================

INSERT INTO quizzes (module_id, title, description, passing_score, time_limit_minutes, max_attempts, show_correct_answers, is_required)
VALUES ('742d48c0-fbe6-4345-adfd-ee6ab899a01b', 'CSS Styling Quiz', 'Test your CSS knowledge', 70, 15, 3, true, true);

INSERT INTO quiz_questions (quiz_id, question_text, question_type, points, order_index, explanation)
SELECT id, 'What does CSS stand for?', 'multiple_choice', 10, 1, 'CSS stands for Cascading Style Sheets.'
FROM quizzes WHERE module_id = '742d48c0-fbe6-4345-adfd-ee6ab899a01b' ORDER BY created_at DESC LIMIT 1;

INSERT INTO quiz_answer_options (question_id, option_text, is_correct, order_index)
SELECT q.id, 'Computer Style Sheets', false, 1 FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.module_id = '742d48c0-fbe6-4345-adfd-ee6ab899a01b' AND q.order_index = 1
UNION ALL
SELECT q.id, 'Cascading Style Sheets', true, 2 FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.module_id = '742d48c0-fbe6-4345-adfd-ee6ab899a01b' AND q.order_index = 1
UNION ALL
SELECT q.id, 'Creative Style System', false, 3 FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.module_id = '742d48c0-fbe6-4345-adfd-ee6ab899a01b' AND q.order_index = 1
UNION ALL
SELECT q.id, 'Colorful Style Sheets', false, 4 FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.module_id = '742d48c0-fbe6-4345-adfd-ee6ab899a01b' AND q.order_index = 1;

-- Question 2
INSERT INTO quiz_questions (quiz_id, question_text, question_type, points, order_index, explanation)
SELECT id, 'Which property changes text color?', 'multiple_choice', 10, 2, 'The color property sets text color.'
FROM quizzes WHERE module_id = '742d48c0-fbe6-4345-adfd-ee6ab899a01b' ORDER BY created_at DESC LIMIT 1;

INSERT INTO quiz_answer_options (question_id, option_text, is_correct, order_index)
SELECT q.id, 'text-color', false, 1 FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.module_id = '742d48c0-fbe6-4345-adfd-ee6ab899a01b' AND q.order_index = 2
UNION ALL
SELECT q.id, 'color', true, 2 FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.module_id = '742d48c0-fbe6-4345-adfd-ee6ab899a01b' AND q.order_index = 2
UNION ALL
SELECT q.id, 'font-color', false, 3 FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.module_id = '742d48c0-fbe6-4345-adfd-ee6ab899a01b' AND q.order_index = 2
UNION ALL
SELECT q.id, 'text-style', false, 4 FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.module_id = '742d48c0-fbe6-4345-adfd-ee6ab899a01b' AND q.order_index = 2;

-- ============================================
-- 3. DOCKER FUNDAMENTALS (301e2044-2cf5-47f1-a652-df524daa68e2)
-- ============================================

INSERT INTO quizzes (module_id, title, description, passing_score, time_limit_minutes, max_attempts, show_correct_answers, is_required)
VALUES ('301e2044-2cf5-47f1-a652-df524daa68e2', 'Docker Fundamentals Quiz', 'Test your Docker knowledge', 70, 15, 3, true, true);

INSERT INTO quiz_questions (quiz_id, question_text, question_type, points, order_index, explanation)
SELECT id, 'What is Docker?', 'multiple_choice', 10, 1, 'Docker is a platform for containerizing applications.'
FROM quizzes WHERE module_id = '301e2044-2cf5-47f1-a652-df524daa68e2' ORDER BY created_at DESC LIMIT 1;

INSERT INTO quiz_answer_options (question_id, option_text, is_correct, order_index)
SELECT q.id, 'A programming language', false, 1 FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.module_id = '301e2044-2cf5-47f1-a652-df524daa68e2' AND q.order_index = 1
UNION ALL
SELECT q.id, 'A containerization platform', true, 2 FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.module_id = '301e2044-2cf5-47f1-a652-df524daa68e2' AND q.order_index = 1
UNION ALL
SELECT q.id, 'A database', false, 3 FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.module_id = '301e2044-2cf5-47f1-a652-df524daa68e2' AND q.order_index = 1
UNION ALL
SELECT q.id, 'A web server', false, 4 FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.module_id = '301e2044-2cf5-47f1-a652-df524daa68e2' AND q.order_index = 1;

-- Question 2
INSERT INTO quiz_questions (quiz_id, question_text, question_type, points, order_index, explanation)
SELECT id, 'What is a Docker container?', 'multiple_choice', 10, 2, 'A container is a lightweight package with all dependencies.'
FROM quizzes WHERE module_id = '301e2044-2cf5-47f1-a652-df524daa68e2' ORDER BY created_at DESC LIMIT 1;

INSERT INTO quiz_answer_options (question_id, option_text, is_correct, order_index)
SELECT q.id, 'A virtual machine', false, 1 FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.module_id = '301e2044-2cf5-47f1-a652-df524daa68e2' AND q.order_index = 2
UNION ALL
SELECT q.id, 'A lightweight package', true, 2 FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.module_id = '301e2044-2cf5-47f1-a652-df524daa68e2' AND q.order_index = 2
UNION ALL
SELECT q.id, 'A programming language', false, 3 FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.module_id = '301e2044-2cf5-47f1-a652-df524daa68e2' AND q.order_index = 2
UNION ALL
SELECT q.id, 'A cloud service', false, 4 FROM quiz_questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE qz.module_id = '301e2044-2cf5-47f1-a652-df524daa68e2' AND q.order_index = 2;

-- ============================================
-- VERIFY
-- ============================================

SELECT
  lm.title as module,
  q.title as quiz,
  COUNT(qq.id) as questions
FROM quizzes q
JOIN learning_modules lm ON lm.id = q.module_id
LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
WHERE q.created_at > NOW() - INTERVAL '1 minute'
GROUP BY lm.title, q.title;
