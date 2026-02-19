
-- Automated Certificate Generation Trigger
-- Kiongozi LMS
-- Created: 2026-02-14

-- 1. Function to generate certificate
CREATE OR REPLACE FUNCTION generate_certificate_on_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_certificate_exists BOOLEAN;
  v_default_template_id UUID;
  v_certificate_number VARCHAR(100);
  v_verification_code VARCHAR(100);
  v_year VARCHAR(4);
  v_random_hex VARCHAR(12);
BEGIN
  -- Only trigger when progress reaches 100% and it wasn't already completed
  IF NEW.progress_percentage = 100 AND (OLD.progress_percentage < 100 OR OLD.progress_percentage IS NULL) THEN
    
    -- Check if certificate already exists
    SELECT EXISTS (
      SELECT 1 FROM user_certificates 
      WHERE user_id = NEW.user_id AND course_id = NEW.course_id
    ) INTO v_certificate_exists;

    IF NOT v_certificate_exists THEN
      -- Get default template
      SELECT id INTO v_default_template_id 
      FROM certificate_templates 
      WHERE is_default = true 
      LIMIT 1;

      -- Generate unique certificate number
      v_year := TO_CHAR(NOW(), 'YYYY');
      v_random_hex := SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6);
      v_certificate_number := 'KIONGOZI-' || v_year || '-' || UPPER(v_random_hex);

      -- Generate secure verification code
      v_verification_code := MD5(RANDOM()::TEXT || NEW.user_id::TEXT || NOW()::TEXT);

      -- Insert certificate
      INSERT INTO user_certificates (
        user_id,
        course_id,
        template_id,
        certificate_number,
        verification_code,
        issued_at,
        metadata
      ) VALUES (
        NEW.user_id,
        NEW.course_id,
        v_default_template_id,
        v_certificate_number,
        v_verification_code,
        NOW(),
        jsonb_build_object(
          'completion_date', NEW.completed_at,
          'completion_percentage', 100,
          'auto_generated', true
        )
      );

      RAISE NOTICE '✅ Auto-generated certificate % for user %', v_certificate_number, NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS tr_generate_certificate ON course_enrollments;

CREATE TRIGGER tr_generate_certificate
AFTER UPDATE OF progress_percentage ON course_enrollments
FOR EACH ROW
EXECUTE FUNCTION generate_certificate_on_completion();

-- 3. Retroactive application (Optional but recommended)
-- Generate certificates for anyone who already has 100% but no certificate
-- INSERT INTO user_certificates (user_id, course_id, template_id, certificate_number, verification_code, issued_at, metadata)
-- SELECT 
--   ce.user_id, 
--   ce.course_id, 
--   (SELECT id FROM certificate_templates WHERE is_default = true LIMIT 1),
--   'KIONGOZI-' || TO_CHAR(NOW(), 'YYYY') || '-' || UPPER(SUBSTRING(MD5(ce.user_id::TEXT || ce.course_id::TEXT) FROM 1 FOR 6)),
--   MD5(ce.user_id::TEXT || ce.course_id::TEXT || 'VERIFIED'),
--   COALESCE(ce.completed_at, NOW()),
--   jsonb_build_object('auto_generated', true, 'retroactive', true)
-- FROM course_enrollments ce
-- LEFT JOIN user_certificates uc ON ce.user_id = uc.user_id AND ce.course_id = uc.course_id
-- WHERE ce.progress_percentage = 100 AND uc.id IS NULL;
