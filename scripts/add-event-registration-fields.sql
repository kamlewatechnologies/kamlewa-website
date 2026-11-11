-- Adds participant profile fields to event registrations.
-- Run once in Supabase: Dashboard -> SQL Editor -> paste -> Run.
-- Safe to re-run (IF NOT EXISTS).

ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS profession   text,
  ADD COLUMN IF NOT EXISTS sex          text,
  ADD COLUMN IF NOT EXISTS organization text,
  ADD COLUMN IF NOT EXISTS city         text;

ALTER TABLE public.event_registrations
  DROP CONSTRAINT IF EXISTS event_registrations_sex_check;

ALTER TABLE public.event_registrations
  ADD CONSTRAINT event_registrations_sex_check
  CHECK (sex IS NULL OR sex IN ('male', 'female', 'prefer_not_to_say'));

-- Make the API pick up the new columns immediately.
NOTIFY pgrst, 'reload schema';
