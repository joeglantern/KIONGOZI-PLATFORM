-- Migration: Award XP and Badges RPC

-- 1. Function to cleanly award XP and track Streaks
CREATE OR REPLACE FUNCTION public.award_civic_action(user_uuid UUID, xp_amount INT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_usr_xp INT;
    new_usr_xp INT;
    last_action date;
    current_streak_cnt INT;
    longest_streak_cnt INT;
    today date;
    yesterday date;
    new_badge_awarded boolean := false;
    awarded_badge_name text := null;
    result jsonb;
BEGIN
    today := current_date;
    yesterday := today - interval '1 day';

    -- Lock the row for update to prevent race conditions
    SELECT total_xp, last_action_date::date, current_streak, longest_streak
    INTO current_usr_xp, last_action, current_streak_cnt, longest_streak_cnt
    FROM public.profiles
    WHERE id = user_uuid
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;

    -- Calculate Streak
    IF last_action = today THEN
        -- Streak unchanged
    ELSIF last_action = yesterday THEN
        -- Streak extends
        current_streak_cnt := COALESCE(current_streak_cnt, 0) + 1;
    ELSE
        -- Streak broken
        current_streak_cnt := 1;
    END IF;

    IF current_streak_cnt > COALESCE(longest_streak_cnt, 0) THEN
        longest_streak_cnt := current_streak_cnt;
    END IF;

    -- Update XP
    new_usr_xp := COALESCE(current_usr_xp, 0) + xp_amount;

    -- Save Profile
    UPDATE public.profiles
    SET 
        total_xp = new_usr_xp,
        current_streak = current_streak_cnt,
        longest_streak = longest_streak_cnt,
        last_action_date = now()
    WHERE id = user_uuid;

    -- 2. Naive auto-awarding of primitive badges based on total XP or Streak
    -- To keep it performant, we only check unawarded badges for this user
    
    -- "Consistent Contributor" (Streak > 7)
    IF current_streak_cnt >= 7 THEN
        INSERT INTO public.user_badges (user_id, badge_id)
        SELECT user_uuid, id FROM public.badges WHERE name = 'Consistent Contributor'
        ON CONFLICT DO NOTHING;
    END IF;

    -- Returns a success object
    result := jsonb_build_object(
        'success', true,
        'new_xp', new_usr_xp,
        'current_streak', current_streak_cnt
    );

    RETURN result;
END;
$$;
