-- =====================================================================
-- 03 · Registrations & applications: dashboard access + privacy lock
--
-- Before this script, anyone with the site's public key could download
-- every registrant's name, email and phone number. After it:
--   * the public can only SUBMIT forms (insert), never read them;
--   * staff with the 'registrations' permission can read, update, delete;
--   * the public site gets the registered count and the "already
--     registered?" check through two safe functions that reveal nothing else.
--
-- Deploy the new website code first, then run this (the old code reads
-- these tables directly and its counters would show 0).
-- Requires 01. Safe to re-run.
-- =====================================================================

-- Workflow columns for the dashboard
ALTER TABLE public.event_registrations    ADD COLUMN IF NOT EXISTS notes    text;
ALTER TABLE public.event_registrations    ADD COLUMN IF NOT EXISTS attended boolean NOT NULL DEFAULT false;

ALTER TABLE public.training_registrations ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new';
ALTER TABLE public.community_applications ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new';
ALTER TABLE public.volunteer_applications ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new';
ALTER TABLE public.partnership_inquiries  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new';
ALTER TABLE public.contact_submissions    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new';

ALTER TABLE public.training_registrations ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.community_applications ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.volunteer_applications ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.partnership_inquiries  ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.contact_submissions    ADD COLUMN IF NOT EXISTS notes text;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['training_registrations','community_applications','volunteer_applications','partnership_inquiries','contact_submissions'] LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', t, t || '_status_check');
    EXECUTE format($f$ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (status IN ('new','reviewed','accepted','rejected','archived'))$f$, t, t || '_status_check');
  END LOOP;
END $$;

-- Faster duplicate checks (case-insensitive)
CREATE INDEX IF NOT EXISTS event_registrations_event_email_idx    ON public.event_registrations (event_id, lower(email));
CREATE INDEX IF NOT EXISTS training_registrations_train_email_idx ON public.training_registrations (training_id, lower(email));
CREATE INDEX IF NOT EXISTS community_applications_comm_email_idx  ON public.community_applications (community, lower(email));

-- ---------------------------------------------------------------------
-- Public-safe functions used by the website forms
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.event_registration_count(p_event_id text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.event_registrations
  WHERE event_id::text = p_event_id AND status = 'confirmed';
$$;

-- p_kind: 'event' | 'training' | 'community'
-- p_ref : event id, training id, or community name
CREATE OR REPLACE FUNCTION public.is_already_registered(p_kind text, p_ref text, p_email text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE e text := lower(trim(p_email));
BEGIN
  IF p_kind = 'event' THEN
    RETURN EXISTS (SELECT 1 FROM public.event_registrations
                   WHERE event_id::text = p_ref AND lower(email) = e AND status <> 'cancelled');
  ELSIF p_kind = 'training' THEN
    RETURN EXISTS (SELECT 1 FROM public.training_registrations
                   WHERE training_id::text = p_ref AND lower(email) = e);
  ELSIF p_kind = 'community' THEN
    RETURN EXISTS (SELECT 1 FROM public.community_applications
                   WHERE community = p_ref AND lower(email) = e);
  END IF;
  RETURN false;
END $$;

REVOKE ALL ON FUNCTION public.event_registration_count(text), public.is_already_registered(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.event_registration_count(text), public.is_already_registered(text, text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security: replace every existing policy on these tables
-- ---------------------------------------------------------------------
DO $$
DECLARE
  t text;
  r record;
BEGIN
  FOREACH t IN ARRAY ARRAY['event_registrations','training_registrations','community_applications','volunteer_applications','partnership_inquiries','contact_submissions'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, t);
    END LOOP;

    EXECUTE format('CREATE POLICY "public can submit" ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (true)', t);
    EXECUTE format($p$CREATE POLICY "staff can read"   ON public.%I FOR SELECT TO authenticated USING (public.has_permission('registrations'))$p$, t);
    EXECUTE format($p$CREATE POLICY "staff can update" ON public.%I FOR UPDATE TO authenticated USING (public.has_permission('registrations')) WITH CHECK (public.has_permission('registrations'))$p$, t);
    EXECUTE format($p$CREATE POLICY "staff can delete" ON public.%I FOR DELETE TO authenticated USING (public.has_permission('registrations'))$p$, t);

    EXECUTE format('REVOKE SELECT, UPDATE, DELETE ON public.%I FROM anon', t);
    EXECUTE format('GRANT INSERT ON public.%I TO anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
