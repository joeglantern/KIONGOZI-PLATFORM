-- Attach quizzes to specific modules (after that module) or leave null for end-of-course quiz.
ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES learning_modules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS quizzes_module_id_idx ON quizzes(module_id);
