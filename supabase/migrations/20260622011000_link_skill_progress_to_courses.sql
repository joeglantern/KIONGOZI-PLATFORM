-- Link curriculum nodes to real courses and advance them from verified module progress.
ALTER TABLE public.skill_nodes
    ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;

WITH path_courses AS (
    SELECT DISTINCT ON (p.id)
        p.id AS path_id,
        p.slug AS path_slug,
        c.id AS course_id
    FROM public.learning_paths p
    JOIN public.module_categories mc ON mc.name = p.category_name
    JOIN public.courses c ON c.category_id = mc.id
    WHERE c.status = 'published' AND c.deleted_at IS NULL
    ORDER BY p.id, c.featured DESC NULLS LAST, c.created_at ASC
)
UPDATE public.skill_nodes n
SET course_id = pc.course_id,
    target_href = '/courses/' || pc.course_id::text,
    updated_at = now()
FROM path_courses pc
WHERE n.path_id = pc.path_id
  AND n.node_type = 'course'
  AND n.order_index = (
      SELECT MIN(n2.order_index) FROM public.skill_nodes n2
      WHERE n2.path_id = pc.path_id AND n2.node_type = 'course'
  );

CREATE INDEX IF NOT EXISTS idx_skill_nodes_course_id ON public.skill_nodes(course_id) WHERE course_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.claim_module_completion_internal(p_module_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_user uuid := auth.uid();
    v_course uuid;
    v_node public.skill_nodes%ROWTYPE;
    v_required integer;
    v_completed integer;
    v_percentage integer;
    v_reward jsonb;
    v_bonus jsonb;
    v_total_awarded integer;
BEGIN
    IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

    SELECT COALESCE(up.course_id, cm.course_id)
    INTO v_course
    FROM public.user_progress up
    LEFT JOIN public.course_modules cm ON cm.module_id = up.module_id
    WHERE up.user_id = v_user AND up.module_id = p_module_id AND up.status = 'completed'
    LIMIT 1;

    IF v_course IS NULL THEN RAISE EXCEPTION 'Completed module not found'; END IF;

    SELECT private.award_once(v_user, 'module_completion', p_module_id::text, 100) INTO v_reward;
    v_total_awarded := COALESCE((v_reward->>'xp_awarded')::integer, 0);

    SELECT * INTO v_node FROM public.skill_nodes
    WHERE course_id = v_course AND is_published = true
    ORDER BY order_index LIMIT 1;

    IF v_node.id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_required
        FROM public.course_modules
        WHERE course_id = v_course AND COALESCE(is_required, true) = true;

        SELECT COUNT(DISTINCT cm.module_id) INTO v_completed
        FROM public.course_modules cm
        JOIN public.user_progress up ON up.module_id = cm.module_id
        WHERE cm.course_id = v_course
          AND COALESCE(cm.is_required, true) = true
          AND up.user_id = v_user
          AND up.status = 'completed';

        v_percentage := CASE WHEN v_required = 0 THEN 0 ELSE LEAST(100, FLOOR(v_completed * 100.0 / v_required))::integer END;

        INSERT INTO public.user_skill_progress (user_id, node_id, status, progress_percentage, started_at, completed_at)
        VALUES (
            v_user,
            v_node.id,
            CASE WHEN v_percentage = 100 THEN 'completed' ELSE 'in_progress' END,
            v_percentage,
            now(),
            CASE WHEN v_percentage = 100 THEN now() ELSE NULL END
        )
        ON CONFLICT (user_id, node_id) DO UPDATE SET
            status = EXCLUDED.status,
            progress_percentage = EXCLUDED.progress_percentage,
            started_at = COALESCE(public.user_skill_progress.started_at, EXCLUDED.started_at),
            completed_at = COALESCE(public.user_skill_progress.completed_at, EXCLUDED.completed_at),
            updated_at = now();

        IF v_percentage = 100 THEN
            SELECT private.award_once(v_user, 'skill_node_completion', v_node.id::text, v_node.xp_reward) INTO v_bonus;
            v_total_awarded := v_total_awarded + COALESCE((v_bonus->>'xp_awarded')::integer, 0);
        END IF;
    END IF;

    RETURN v_reward || jsonb_build_object(
        'xp_awarded', v_total_awarded,
        'skill_node_id', v_node.id,
        'skill_progress', COALESCE(v_percentage, 0),
        'skill_completed', COALESCE(v_percentage = 100, false)
    );
END;
$$;

