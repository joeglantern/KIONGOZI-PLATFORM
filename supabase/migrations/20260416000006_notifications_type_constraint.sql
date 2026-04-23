-- Broaden notifications.type CHECK constraint to include every type emitted
-- by our triggers. The previous constraint rejected 'new_course', which
-- caused course-publish to fail with: new row for relation "notifications"
-- violates check constraint "notifications_type_check".

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN (
    'message',
    'badge_earned',
    'certificate',
    'new_course',
    'level_up',
    'enrollment',
    'module_completed',
    'course_completed',
    'quiz_passed',
    'quiz_failed',
    'system'
));
