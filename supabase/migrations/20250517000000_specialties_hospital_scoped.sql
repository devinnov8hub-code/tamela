-- Hospital-scoped specialties (run in Supabase SQL Editor or via CLI migrate)

ALTER TABLE public.specialties
  ADD COLUMN IF NOT EXISTS hospital_id uuid REFERENCES public.hospitals (id) ON DELETE CASCADE;

ALTER TABLE public.specialties
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users (id),
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Drop legacy global uniqueness if present (adjust name if your project differs)
DROP INDEX IF EXISTS specialties_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS specialties_hospital_name_unique
  ON public.specialties (hospital_id, lower(trim(name)))
  WHERE hospital_id IS NOT NULL;

ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS specialties_select_same_hospital ON public.specialties;
DROP POLICY IF EXISTS specialties_insert_admin ON public.specialties;

CREATE POLICY specialties_select_same_hospital
  ON public.specialties
  FOR SELECT
  TO authenticated
  USING (
    hospital_id IS NOT NULL
    AND hospital_id = (
      SELECT p.hospital_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY specialties_insert_admin
  ON public.specialties
  FOR INSERT
  TO authenticated
  WITH CHECK (
    hospital_id IS NOT NULL
    AND hospital_id = (
      SELECT p.hospital_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'ADMIN'
        AND p.status = 'ACTIVE'
    )
  );
