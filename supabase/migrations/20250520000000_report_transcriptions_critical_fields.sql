-- Separate markdown clinical note from AI critical fields sidebar.
-- Run in Supabase SQL Editor if not applied via CLI.

ALTER TABLE public.report_transcriptions
  ADD COLUMN IF NOT EXISTS critical_fields jsonb;

COMMENT ON COLUMN public.report_transcriptions.transcription IS
  'Markdown clinical note (template_text from Scribe transcribe-and-report).';

COMMENT ON COLUMN public.report_transcriptions.critical_fields IS
  'JSON array of CriticalField objects from Scribe (label, value, severity, reason).';
