-- Align published learning paths with existing published course inventory.
-- Non-destructive: updates path metadata and course-node targets only.

UPDATE public.learning_paths
SET
  category_name = 'Climate Advocacy',
  updated_at = now()
WHERE slug = 'green'
  AND category_name = 'Green Economy Fundamentals';

WITH green_course AS (
  SELECT id
  FROM public.courses
  WHERE status = 'published'
    AND title = 'Introduction to Climate Science'
  ORDER BY created_at ASC
  LIMIT 1
)
UPDATE public.skill_nodes sn
SET
  course_id = green_course.id,
  target_href = '/courses/' || green_course.id::text,
  updated_at = now()
FROM public.learning_paths lp, green_course
WHERE sn.path_id = lp.id
  AND lp.slug = 'green'
  AND sn.slug = 'green-foundations';

WITH digital_course AS (
  SELECT id
  FROM public.courses
  WHERE status = 'published'
    AND title IN ('AI-Powered Civic Tech', 'Digital Government & Open Data')
  ORDER BY
    CASE title
      WHEN 'AI-Powered Civic Tech' THEN 0
      ELSE 1
    END,
    created_at ASC
  LIMIT 1
)
UPDATE public.skill_nodes sn
SET
  course_id = digital_course.id,
  target_href = '/courses/' || digital_course.id::text,
  updated_at = now()
FROM public.learning_paths lp, digital_course
WHERE sn.path_id = lp.id
  AND lp.slug = 'digital'
  AND sn.slug = 'digital-foundations';
