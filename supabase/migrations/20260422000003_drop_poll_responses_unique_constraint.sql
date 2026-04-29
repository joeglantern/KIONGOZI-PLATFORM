-- The unique constraint on (question_id, user_id) blocks multiple-choice questions
-- where a user legitimately submits multiple rows for the same question (one per selected option).
ALTER TABLE poll_responses DROP CONSTRAINT IF EXISTS poll_responses_question_id_user_id_key;
