CREATE TABLE IF NOT EXISTS public.synthetic_demo_batches (
    id text PRIMARY KEY,
    description text NOT NULL,
    requested_user_count integer NOT NULL DEFAULT 0,
    requested_engagement_count integer NOT NULL DEFAULT 0,
    generated_user_count integer NOT NULL DEFAULT 0,
    generated_engagement_count integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'completed', 'failed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.synthetic_demo_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id text REFERENCES public.synthetic_demo_batches(id) ON DELETE SET NULL,
    table_schema text NOT NULL DEFAULT 'public',
    table_name text NOT NULL,
    record_id uuid,
    record_key text NOT NULL,
    persona_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_seed_data boolean NOT NULL DEFAULT true,
    source text NOT NULL DEFAULT 'synthetic_demo',
    visibility text NOT NULL DEFAULT 'demo_only'
        CHECK (visibility IN ('demo_only', 'staging_only')),
    created_for text NOT NULL DEFAULT 'platform_seed_data',
    replace_with_real_activity boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (table_schema, table_name, record_key)
);

CREATE INDEX IF NOT EXISTS idx_synthetic_demo_records_batch
    ON public.synthetic_demo_records(batch_id);

CREATE INDEX IF NOT EXISTS idx_synthetic_demo_records_table_record
    ON public.synthetic_demo_records(table_schema, table_name, record_key);

CREATE INDEX IF NOT EXISTS idx_synthetic_demo_records_persona
    ON public.synthetic_demo_records(persona_user_id);

ALTER TABLE public.synthetic_demo_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synthetic_demo_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read synthetic demo batches" ON public.synthetic_demo_batches;
CREATE POLICY "Admins can read synthetic demo batches"
ON public.synthetic_demo_batches
FOR SELECT
TO authenticated
USING ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

DROP POLICY IF EXISTS "Admins can manage synthetic demo batches" ON public.synthetic_demo_batches;
CREATE POLICY "Admins can manage synthetic demo batches"
ON public.synthetic_demo_batches
FOR ALL
TO authenticated
USING ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin')
WITH CHECK ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

DROP POLICY IF EXISTS "Admins can read synthetic demo records" ON public.synthetic_demo_records;
CREATE POLICY "Admins can read synthetic demo records"
ON public.synthetic_demo_records
FOR SELECT
TO authenticated
USING ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

DROP POLICY IF EXISTS "Admins can manage synthetic demo records" ON public.synthetic_demo_records;
CREATE POLICY "Admins can manage synthetic demo records"
ON public.synthetic_demo_records
FOR ALL
TO authenticated
USING ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin')
WITH CHECK ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');
