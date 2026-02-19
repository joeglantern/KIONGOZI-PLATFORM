-- ============================================
-- CERTIFICATES SYSTEM
-- ============================================

-- Certificate templates
CREATE TABLE IF NOT EXISTS certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  background_color VARCHAR(50) DEFAULT '#ffffff',
  border_color VARCHAR(50) DEFAULT '#c9975b',
  logo_url TEXT,
  signature_url TEXT,
  template_html TEXT, -- Custom HTML template
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User certificates
CREATE TABLE IF NOT EXISTS user_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  template_id UUID REFERENCES certificate_templates(id) ON DELETE SET NULL,
  certificate_number VARCHAR(100) UNIQUE NOT NULL, -- e.g., "KIONGOZI-2026-001234"
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL = never expires
  verification_code VARCHAR(100) UNIQUE NOT NULL, -- For public verification
  pdf_url TEXT, -- Generated PDF URL
  metadata JSONB, -- Additional data (completion date, grade, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for certificates
CREATE INDEX IF NOT EXISTS idx_user_certificates_user_id ON user_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_user_certificates_course_id ON user_certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_user_certificates_verification ON user_certificates(verification_code);

-- Enable RLS
ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_certificates ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Anyone can view certificate templates" ON certificate_templates;
CREATE POLICY "Anyone can view certificate templates" ON certificate_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view certificates for verification" ON user_certificates;
CREATE POLICY "Anyone can view certificates for verification" ON user_certificates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view own certificates" ON user_certificates;
CREATE POLICY "Users can view own certificates" ON user_certificates FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert certificates" ON user_certificates;
CREATE POLICY "System can insert certificates" ON user_certificates FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Automated Certificate Issuance Trigger
DROP TRIGGER IF EXISTS trigger_issue_certificate ON course_enrollments;
DROP FUNCTION IF EXISTS issue_certificate_on_completion();

CREATE OR REPLACE FUNCTION issue_certificate_on_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_template_id UUID;
  v_cert_number TEXT;
  v_verify_code TEXT;
  v_exists BOOLEAN;
BEGIN
  -- Check if enrollment is completed (status changed to completed or 100% progress)
  IF (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed')) OR 
     (NEW.progress_percentage = 100 AND OLD.progress_percentage < 100) THEN
    
    -- Check if certificate already exists
    SELECT EXISTS (
      SELECT 1 FROM user_certificates 
      WHERE user_id = NEW.user_id AND course_id = NEW.course_id
    ) INTO v_exists;
    
    IF NOT v_exists THEN
      -- Get default template
      SELECT id INTO v_template_id FROM certificate_templates WHERE is_default = true LIMIT 1;
      
      -- Generate unique certificate number and verification code
      v_cert_number := 'KIONGOZI-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
      v_verify_code := encode(gen_random_bytes(12), 'hex');
      
      -- Insert certificate
      INSERT INTO user_certificates (
        user_id, 
        course_id, 
        template_id, 
        certificate_number, 
        verification_code,
        metadata
      ) VALUES (
        NEW.user_id, 
        NEW.course_id, 
        v_template_id, 
        v_cert_number, 
        v_verify_code,
        jsonb_build_object('course_title', (SELECT title FROM courses WHERE id = NEW.course_id))
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_issue_certificate
AFTER UPDATE ON course_enrollments
FOR EACH ROW EXECUTE FUNCTION issue_certificate_on_completion();

-- Insert default certificate template
INSERT INTO certificate_templates (name, description, is_default)
VALUES (
  'Kiongozi Standard Certificate',
  'Default certificate template for course completion',
  true
) ON CONFLICT DO NOTHING;
