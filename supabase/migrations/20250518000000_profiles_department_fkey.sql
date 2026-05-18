-- Required for PostgREST embed and referential integrity
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_department_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_department_id_fkey
  FOREIGN KEY (department_id) REFERENCES public.departments (id) ON DELETE SET NULL;
