-- Migration: Admin Analytics RPC

-- Function to get a high-level overview of platform metrics for the Admin Dashboard
CREATE OR REPLACE FUNCTION public.get_admin_analytics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_users INT;
    new_users_7d INT;
    active_petitions INT;
    total_signatures INT;
    total_course_enrollments INT;
    active_town_halls INT;
    recent_signups jsonb;
    result jsonb;
BEGIN
    -- 1. User Metrics
    SELECT COUNT(*) INTO total_users FROM public.profiles;
    
    SELECT COUNT(*) INTO new_users_7d 
    FROM public.profiles 
    WHERE created_at >= now() - interval '7 days';

    -- Get last 5 signups
    SELECT json_agg(row_to_json(t)) INTO recent_signups
    FROM (
        SELECT id, username, first_name, last_name, created_at, role 
        FROM public.profiles 
        ORDER BY created_at DESC 
        LIMIT 5
    ) t;

    -- 2. Civic Metrics
    SELECT COUNT(*) INTO active_petitions 
    FROM public.social_petitions 
    WHERE status = 'active';

    SELECT COUNT(*) INTO total_signatures 
    FROM public.social_petition_signatures;

    SELECT COUNT(*) INTO active_town_halls
    FROM public.social_events
    WHERE end_time >= now();

    -- 3. Learning Metrics
    SELECT COUNT(*) INTO total_course_enrollments
    FROM public.lms_user_progress;

    -- Build resulting JSON payload
    result := jsonb_build_object(
        'users', jsonb_build_object(
            'total', total_users,
            'new_7d', new_users_7d,
            'recent', COALESCE(recent_signups, '[]'::jsonb)
        ),
        'civic', jsonb_build_object(
            'active_petitions', active_petitions,
            'total_signatures', total_signatures,
            'upcoming_town_halls', active_town_halls
        ),
        'learning', jsonb_build_object(
            'total_enrollments', total_course_enrollments
        )
    );

    RETURN result;
END;
$$;
