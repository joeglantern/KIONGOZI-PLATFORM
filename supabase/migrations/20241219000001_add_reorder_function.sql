-- Add helper function for reordering course modules
-- This function reorders modules after one is removed to fill gaps

CREATE OR REPLACE FUNCTION public.reorder_course_modules(
  p_course_id uuid,
  p_removed_order integer
)
RETURNS void AS $$
BEGIN
  -- Shift all modules with order_index greater than the removed one down by 1
  UPDATE public.course_modules 
  SET order_index = order_index - 1,
      updated_at = now()
  WHERE course_id = p_course_id 
    AND order_index > p_removed_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION public.reorder_course_modules(uuid, integer) IS 
'Reorders course modules after one is removed to fill gaps in the sequence';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.reorder_course_modules(uuid, integer) TO authenticated;
