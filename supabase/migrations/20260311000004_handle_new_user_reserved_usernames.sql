-- Extend handle_new_user to skip reserved usernames.
-- If the desired username matches a reserved word, fall back to email prefix.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_first_name       text;
  v_last_name        text;
  v_full_name        text;
  v_desired_username text;
  v_final_username   text;
  v_suffix           int := 0;
  v_reserved         text[] := ARRAY['kiongozi','admin','support','help','bot','system','official'];
BEGIN
  -- Pull name parts, treat blank strings as NULL
  v_first_name := NULLIF(TRIM(COALESCE(new.raw_user_meta_data->>'first_name', '')), '');
  v_last_name  := NULLIF(TRIM(COALESCE(new.raw_user_meta_data->>'last_name',  '')), '');

  -- Build full_name safely (avoid the concat(NULL,NULL)=' ' trap)
  v_full_name := NULLIF(TRIM(CONCAT(COALESCE(v_first_name,''), ' ', COALESCE(v_last_name,''))), '');
  IF v_full_name IS NULL THEN
    v_full_name := COALESCE(
      NULLIF(TRIM(COALESCE(new.raw_user_meta_data->>'full_name', '')), ''),
      SPLIT_PART(new.email, '@', 1)
    );
  END IF;

  -- Derive desired username: explicit → name concat → email prefix
  -- If the explicit username is reserved, ignore it and fall through
  v_desired_username := NULLIF(TRIM(LOWER(COALESCE(new.raw_user_meta_data->>'username', ''))), '');
  IF v_desired_username = ANY(v_reserved) THEN
    v_desired_username := NULL;
  END IF;

  v_desired_username := COALESCE(
    v_desired_username,
    NULLIF(LOWER(REGEXP_REPLACE(
      CONCAT(COALESCE(v_first_name,''), COALESCE(v_last_name,'')),
      '[^a-zA-Z0-9_]', '', 'g'
    )), ''),
    LOWER(REGEXP_REPLACE(SPLIT_PART(new.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'))
  );

  -- Enforce minimum length (pad with random digits if too short)
  IF LENGTH(COALESCE(v_desired_username, '')) < 3 THEN
    v_desired_username := COALESCE(v_desired_username, 'user') || FLOOR(RANDOM() * 9000 + 1000)::text;
  END IF;

  -- Ensure uniqueness by appending an incrementing suffix
  v_final_username := v_desired_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_final_username) LOOP
    v_suffix := v_suffix + 1;
    v_final_username := v_desired_username || v_suffix::text;
  END LOOP;

  INSERT INTO public.profiles (id, email, first_name, last_name, full_name, username, role)
  VALUES (
    new.id,
    new.email,
    v_first_name,
    v_last_name,
    v_full_name,
    v_final_username,
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    first_name = COALESCE(profiles.first_name, EXCLUDED.first_name),
    last_name  = COALESCE(profiles.last_name,  EXCLUDED.last_name),
    full_name  = COALESCE(NULLIF(TRIM(profiles.full_name), ''), EXCLUDED.full_name),
    username   = COALESCE(profiles.username, EXCLUDED.username),
    updated_at = NOW();

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
