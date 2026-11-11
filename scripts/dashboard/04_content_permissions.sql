-- =====================================================================
-- 04 · Website content: everyone can read, only permitted staff can edit
--
-- Today any logged-in account can change programs, events, etc. After
-- this, each section needs its permission (e.g. 'events' to edit events).
-- Requires 01 and 02. Safe to re-run.
-- =====================================================================

DO $$
DECLARE
  item  text[];
  t     text;
  perm  text;
  r     record;
BEGIN
  FOREACH item SLICE 1 IN ARRAY ARRAY[
    ARRAY['programs',     'programs'],
    ARRAY['events',       'events'],
    ARRAY['trainings',    'trainings'],
    ARRAY['projects',     'projects'],
    ARRAY['reports',      'reports'],
    ARRAY['contact_info', 'contact']
  ] LOOP
    t := item[1];
    perm := item[2];

    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'Skipping %, table not found', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, t);
    END LOOP;

    EXECUTE format('CREATE POLICY "anyone can read" ON public.%I FOR SELECT TO anon, authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "permitted staff can insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_permission(%L))', t, perm);
    EXECUTE format('CREATE POLICY "permitted staff can update" ON public.%I FOR UPDATE TO authenticated USING (public.has_permission(%L)) WITH CHECK (public.has_permission(%L))', t, perm, perm);
    EXECUTE format('CREATE POLICY "permitted staff can delete" ON public.%I FOR DELETE TO authenticated USING (public.has_permission(%L))', t, perm);

    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
