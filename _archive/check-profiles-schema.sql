-- Check Profiles Table Schema
-- Run this to see the actual column names in your profiles table

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
