CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS youth_inputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_text TEXT NOT NULL,
    location VARCHAR(100) DEFAULT 'Nairobi',
    language VARCHAR(10) DEFAULT 'en',
    ai_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
    ai_sentiment VARCHAR(50),
    ai_summary TEXT,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS welfare_funds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_name VARCHAR(255) NOT NULL,
    total_allocated NUMERIC(15,2) NOT NULL,
    disbursed_amount NUMERIC(15,2) DEFAULT 0,
    beneficiary_ylo VARCHAR(255),
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Disbursed', 'Pending', 'Audited')),
    accountability_score INTEGER DEFAULT 0 CHECK (accountability_score BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fund_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id UUID NOT NULL REFERENCES welfare_funds(id) ON DELETE CASCADE,
    reporter_name VARCHAR(255),
    description TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'Medium' CHECK (severity IN ('Low', 'Medium', 'High')),
    status VARCHAR(20) DEFAULT 'Open' CHECK (status IN ('Open', 'Investigating', 'Resolved')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO welfare_funds (fund_name, total_allocated, disbursed_amount, beneficiary_ylo, status, accountability_score) VALUES
('Youth Enterprise Development Fund', 5000000, 3500000, 'Nairobi Youth Alliance', 'Disbursed', 87),
('Green Economy Youth Grant', 2000000, 0, 'Kwale Green Collective', 'Pending', 45),
('Digital Skills Bursary 2025', 1500000, 1500000, 'Tech Youth Kenya', 'Audited', 95),
('Social Inclusion Fund Q1', 800000, 400000, 'Inclusive Futures YLO', 'Pending', 62),
('Civic Education Initiative', 600000, 600000, 'AFOSI Youth Wing', 'Disbursed', 91);
