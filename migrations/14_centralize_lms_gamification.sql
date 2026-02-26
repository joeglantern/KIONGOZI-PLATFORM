-- Migration: Centralize LMS gamification in the database
-- This completely replaces the need for the frontend to manually query, calculate, and update XP, ensuring race conditions cannot happen.

-- 1. Create a function to award XP for LMS actions (module completion, quiz passing)
CREATE OR REPLACE FUNCTION public.award_lms_action(user_uuid UUID, xp_amount INT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_usr_xp INT;
    new_usr_xp INT;
    new_usr_lvl INT;
    total_completed_modules INT;
    result jsonb;
BEGIN
    -- Lock the row for update to prevent race conditions during rapid module completion
    SELECT total_xp
    INTO current_usr_xp
    FROM public.profiles
    WHERE id = user_uuid
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;

    -- Update XP
    new_usr_xp := COALESCE(current_usr_xp, 0) + xp_amount;

    -- Calculate level (Square root formula: Level = floor(sqrt(totalXp / 50)))
    new_usr_lvl := GREATEST(1, FLOOR(SQRT(GREATEST(0, new_usr_xp) / 50)));

    -- Save Profile
    UPDATE public.profiles
    SET 
        total_xp = new_usr_xp,
        level = new_usr_lvl
    WHERE id = user_uuid;

    -- Update Streak (reuse the logic we already trust)
    PERFORM public.award_civic_action(user_uuid, 0);

    -- Check Badges implicitly via RPC

    -- 1. Modules Completed Badges
    SELECT COUNT(*) INTO total_completed_modules
    FROM public.user_progress
    WHERE user_id = user_uuid AND status = 'completed';

    -- "First Steps"
    IF total_completed_modules >= 1 THEN
        INSERT INTO public.user_badges (user_id, badge_id)
        SELECT user_uuid, id FROM public.badges WHERE name = 'First Steps'
        ON CONFLICT DO NOTHING;
    END IF;

    -- "Knowledge Seeker"
    IF total_completed_modules >= 5 THEN
        INSERT INTO public.user_badges (user_id, badge_id)
        SELECT user_uuid, id FROM public.badges WHERE name = 'Knowledge Seeker'
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- "Module Master"
     IF total_completed_modules >= 20 THEN
        INSERT INTO public.user_badges (user_id, badge_id)
        SELECT user_uuid, id FROM public.badges WHERE name = 'Module Master'
        ON CONFLICT DO NOTHING;
    END IF;

    -- Returns a success object
    result := jsonb_build_object(
        'success', true,
        'new_xp', new_usr_xp,
        'new_lvl', new_usr_lvl
    );

    RETURN result;
END;
$$;
