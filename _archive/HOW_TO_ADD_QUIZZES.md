# 📝 How to Add Quizzes to Your LMS

## ✅ Quiz Feature is Now Active!

The quiz component has been integrated into your module viewer. Now you just need to add quizzes to your database.

---

## 🚀 Quick Start (3 Steps)

### Step 1: Get a Module ID

Run this query in Supabase SQL Editor to see your modules:

```sql
SELECT id, title FROM learning_modules LIMIT 10;
```

Copy one of the `id` values (it looks like: `550e8400-e29b-41d4-a716-446655440000`)

---

### Step 2: Create a Test Quiz

1. Open the file: `create-test-quiz.sql`
2. Replace `YOUR_MODULE_ID_HERE` with the module ID you copied
3. Copy the ENTIRE file contents
4. Paste into Supabase SQL Editor
5. Click "Run"

This creates a quiz with:
- ✅ 5 questions (multiple choice and true/false)
- ✅ 15 minute time limit
- ✅ 70% passing score
- ✅ 3 attempts allowed

---

### Step 3: Test the Quiz

1. Go to your LMS: `http://localhost:3001`
2. Navigate to the module you added the quiz to
3. Scroll to the bottom of the module content
4. You should see: **"Test Your Knowledge"** section
5. Click "Start Quiz" and try it out!

---

## 📍 Where Quizzes Appear

Quizzes automatically appear at the **bottom of each module** that has a quiz attached:

```
┌─────────────────────────────────────┐
│  Module Title                       │
│  ─────────────────────────────────  │
│                                     │
│  Module content (text, images,      │
│  videos, etc.)                      │
│                                     │
│  ...                                │
│                                     │
├─────────────────────────────────────┤
│  🌟 TEST YOUR KNOWLEDGE            │  ← Quiz appears here!
│                                     │
│  [Quiz interface with questions]    │
│                                     │
└─────────────────────────────────────┘
│  Previous Module | Next Module      │
└─────────────────────────────────────┘
```

---

## 🎯 Quiz Features

When students take a quiz, they get:

✅ **Progress Bar** - Shows which question they're on
✅ **Timer** - Countdown if time limit is set
✅ **Navigation** - Previous/Next buttons
✅ **Review** - See correct answers after submission
✅ **Scoring** - Instant pass/fail feedback
✅ **Retry** - Can retake if they fail (up to max attempts)

---

## 🎨 What It Looks Like

### Quiz Start Screen
```
┌──────────────────────────────────────────┐
│  🌟 Test Your Knowledge                  │
│  ──────────────────────────────────────  │
│                                          │
│  Module Knowledge Check                  │
│  Test your understanding of key concepts │
│                                          │
│  ⏰ Time Limit: 15 minutes               │
│  📊 Passing Score: 70%                   │
│  🎯 Attempts: 0 / 3                      │
│                                          │
│  [ Start Quiz ]                          │
│                                          │
└──────────────────────────────────────────┘
```

### Taking Quiz
```
┌──────────────────────────────────────────┐
│  Module Knowledge Check    ⏰ 12:30      │
│  ████████░░░░░░ 40% (Question 2 of 5)   │
│  ──────────────────────────────────────  │
│                                          │
│  What is the primary benefit of          │
│  renewable energy?                       │
│                                          │
│  ○ Lower cost than fossil fuels          │
│  ● Environmentally friendly with         │
│    minimal emissions                     │
│  ○ Easier to transport                   │
│  ○ Available only in certain regions     │
│                                          │
│  [ Previous ]        [ Next Question ]   │
│                                          │
└──────────────────────────────────────────┘
```

### Results Screen
```
┌──────────────────────────────────────────┐
│           🎉 Congratulations!            │
│  ──────────────────────────────────────  │
│                                          │
│         You scored 80%                   │
│                                          │
│  Points Earned: 40 / 50                  │
│  Time Spent: 8:23                        │
│                                          │
│  ✓ Question 1: Correct                   │
│  ✓ Question 2: Correct                   │
│  ✗ Question 3: Incorrect                 │
│  ✓ Question 4: Correct                   │
│  ✓ Question 5: Correct                   │
│                                          │
│  [ View Detailed Review ]                │
│  [ Retake Quiz ]                         │
│                                          │
└──────────────────────────────────────────┘
```

---

## 🔧 Adding More Quizzes

To add quizzes to other modules, use this template:

```sql
-- Get your module ID first
SELECT id, title FROM learning_modules WHERE title LIKE '%your search%';

-- Create quiz
INSERT INTO quizzes (module_id, title, description, passing_score, time_limit_minutes, max_attempts)
VALUES ('YOUR_MODULE_ID', 'Quiz Title', 'Quiz description', 70, 15, 3)
RETURNING id;

-- Add a question
INSERT INTO quiz_questions (quiz_id, question_text, question_type, points, order_index)
VALUES (
  (SELECT id FROM quizzes WHERE title = 'Quiz Title' ORDER BY created_at DESC LIMIT 1),
  'Your question here?',
  'multiple_choice',
  10,
  1
) RETURNING id;

-- Add answer options (one should have is_correct = true)
INSERT INTO quiz_answer_options (question_id, option_text, is_correct, order_index) VALUES
  ((SELECT id FROM quiz_questions ORDER BY created_at DESC LIMIT 1), 'Option 1', false, 1),
  ((SELECT id FROM quiz_questions ORDER BY created_at DESC LIMIT 1), 'Option 2', true, 2),
  ((SELECT id FROM quiz_questions ORDER BY created_at DESC LIMIT 1), 'Option 3', false, 3),
  ((SELECT id FROM quiz_questions ORDER BY created_at DESC LIMIT 1), 'Option 4', false, 4);
```

---

## 📊 Quiz Settings Explained

When creating a quiz, you can customize these settings:

| Setting | Description | Example |
|---------|-------------|---------|
| `passing_score` | Percentage needed to pass | `70` = 70% |
| `time_limit_minutes` | Time limit (NULL = no limit) | `15` or `NULL` |
| `max_attempts` | Max tries (NULL = unlimited) | `3` or `NULL` |
| `show_correct_answers` | Show answers after submit | `true` or `false` |
| `randomize_questions` | Shuffle question order | `true` or `false` |
| `is_required` | Must pass to complete module | `true` or `false` |

---

## 🎓 Best Practices

### For Better Quizzes:

1. **5-10 questions** per quiz is ideal
2. **Mix question types** (multiple choice, true/false)
3. **Add explanations** - Students learn from mistakes
4. **Set reasonable time limits** - 1-2 minutes per question
5. **Allow retakes** - Learning is about growth!
6. **Make it challenging but fair** - 70-80% passing score

### Question Writing Tips:

✅ **DO:**
- Keep questions clear and concise
- Use real-world scenarios
- Focus on key concepts
- Add helpful explanations

❌ **DON'T:**
- Use trick questions
- Make questions too easy
- Create confusing wording
- Forget to test your quiz!

---

## 🐛 Troubleshooting

### Quiz not showing?

1. **Check module ID** - Make sure the quiz is attached to the right module
2. **Refresh page** - Clear browser cache
3. **Check database** - Run query to verify quiz exists:
   ```sql
   SELECT q.*, COUNT(qq.id) as question_count
   FROM quizzes q
   LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
   WHERE q.module_id = 'YOUR_MODULE_ID'
   GROUP BY q.id;
   ```

### Quiz loads but no questions?

Check if questions were created:
```sql
SELECT qq.*, COUNT(qao.id) as option_count
FROM quiz_questions qq
LEFT JOIN quiz_answer_options qao ON qao.question_id = qq.id
WHERE qq.quiz_id = 'YOUR_QUIZ_ID'
GROUP BY qq.id;
```

### Timer not working?

Make sure `time_limit_minutes` is set (not NULL):
```sql
UPDATE quizzes SET time_limit_minutes = 15 WHERE id = 'YOUR_QUIZ_ID';
```

---

## 📝 Example: Creating a Custom Quiz

Here's a complete example for a "Docker Fundamentals" quiz:

```sql
-- 1. Find your module
SELECT id, title FROM learning_modules WHERE title LIKE '%Docker%';

-- 2. Create the quiz
INSERT INTO quizzes (module_id, title, description, passing_score, time_limit_minutes, max_attempts, show_correct_answers)
VALUES (
  '1234-5678-9012-3456',  -- Your actual module ID
  'Docker Fundamentals Quiz',
  'Test your understanding of Docker basics',
  75,
  20,
  3,
  true
) RETURNING id;

-- 3. Add questions (repeat for each question)
INSERT INTO quiz_questions (quiz_id, question_text, question_type, points, order_index, explanation)
VALUES (
  (SELECT id FROM quizzes WHERE title = 'Docker Fundamentals Quiz'),
  'What is a Docker container?',
  'multiple_choice',
  10,
  1,
  'A Docker container is a lightweight, standalone package that includes everything needed to run an application.'
) RETURNING id;

-- 4. Add answer options
INSERT INTO quiz_answer_options (question_id, option_text, is_correct, order_index) VALUES
  ((SELECT id FROM quiz_questions ORDER BY created_at DESC LIMIT 1), 'A virtual machine', false, 1),
  ((SELECT id FROM quiz_questions ORDER BY created_at DESC LIMIT 1), 'A lightweight package for applications', true, 2),
  ((SELECT id FROM quiz_questions ORDER BY created_at DESC LIMIT 1), 'A programming language', false, 3),
  ((SELECT id FROM quiz_questions ORDER BY created_at DESC LIMIT 1), 'A cloud service', false, 4);
```

---

## 🎉 You're All Set!

Your quiz system is ready to use! Follow the steps above to add quizzes to your modules.

**Need help?** Check the main documentation:
- [NEW_FEATURES_IMPLEMENTATION.md](./NEW_FEATURES_IMPLEMENTATION.md)
- [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md)

Happy quiz creating! 📝✨
