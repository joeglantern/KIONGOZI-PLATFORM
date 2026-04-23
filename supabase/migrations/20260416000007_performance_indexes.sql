-- Performance indexes for commonly queried patterns
CREATE INDEX IF NOT EXISTS idx_user_progress_user_status ON user_progress(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_course ON user_progress(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_status ON course_enrollments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_user ON quiz_attempts(quiz_id, user_id);
CREATE INDEX IF NOT EXISTS idx_scorm_registrations_pkg_user ON scorm_registrations(package_id, user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
