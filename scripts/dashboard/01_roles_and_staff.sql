-- =====================================================================
-- 01 · Dashboard roles, staff accounts and permission checks
-- Run in Supabase: Dashboard -> SQL Editor -> paste -> Run.
-- Safe to re-run.
-- =====================================================================

-- Roles: each role is a named set of dashboard permissions.
-- Permission keys used by the app:
--   programs, events, trainings, projects, reports, contact,
--   registrations, broadcast, users
-- 'super_admin' always has every permission, whatever is stored here.
CREATE TABLE IF NOT EXISTS public.staff_roles (
  key          text PRIMARY KEY CHECK (key ~ '^[a-z][a-z0-9_]*$'),
  name         text NOT NULL,
  description  text,
  permissions  text[] NOT NULL DEFAULT '{}',
  is_system    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.staff_roles (key, name, description, permissions, is_system) VALUES
  ('super_admin', 'Super Admin', 'Full access, including managing team members and roles.',
     ARRAY['programs','events','trainings','projects','reports','contact','registrations','broadcast','users'], true),
  ('admin', 'Admin', 'Manages all content, registrations and broadcasts. Cannot manage team members.',
     ARRAY['programs','events','trainings','projects','reports','contact','registrations','broadcast'], true),
  ('editor', 'Content Editor', 'Creates and edits programs, events, trainings, projects, reports and contact info.',
     ARRAY['programs','events','trainings','projects','reports','contact'], false),
  ('registrations_officer', 'Registrations Officer', 'Handles registrations and applications, and emails participants.',
     ARRAY['registrations','broadcast'], false)
ON CONFLICT (key) DO NOTHING;

-- Staff: which logins may use the dashboard, and with which role.
CREATE TABLE IF NOT EXISTS public.staff_members (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  full_name   text,
  role        text NOT NULL REFERENCES public.staff_roles(key) ON UPDATE CASCADE,
  active      boolean NOT NULL DEFAULT true,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staff_members_role_idx ON public.staff_members(role);

-- ---------------------------------------------------------------------
-- Permission helpers (used by RLS policies and by the app)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_members
    WHERE user_id = auth.uid() AND active
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_members
    WHERE user_id = auth.uid() AND active AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(p text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_members s
    JOIN public.staff_roles r ON r.key = s.role
    WHERE s.user_id = auth.uid()
      AND s.active
      AND (s.role = 'super_admin' OR p = ANY (r.permissions))
  );
$$;

-- What the signed-in user can do (the dashboard reads this on load).
CREATE OR REPLACE FUNCTION public.get_my_access()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'is_staff',    s.user_id IS NOT NULL AND s.active,
    'role',        s.role,
    'role_name',   r.name,
    'full_name',   s.full_name,
    'permissions', CASE
                     WHEN s.role = 'super_admin'
                       THEN ARRAY['programs','events','trainings','projects','reports','contact','registrations','broadcast','users']
                     ELSE COALESCE(r.permissions, '{}')
                   END
  )
  FROM (SELECT auth.uid() AS uid) me
  LEFT JOIN public.staff_members s ON s.user_id = me.uid
  LEFT JOIN public.staff_roles r ON r.key = s.role;
$$;

REVOKE ALL ON FUNCTION public.is_staff(), public.is_super_admin(), public.has_permission(text), public.get_my_access() FROM public;
GRANT EXECUTE ON FUNCTION public.is_staff(), public.is_super_admin(), public.has_permission(text), public.get_my_access() TO authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security for the two new tables
-- (staff accounts themselves are created/changed by the server with the
--  service role key, so there are no client write policies on staff_members)
-- ---------------------------------------------------------------------
ALTER TABLE public.staff_roles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff can read roles"          ON public.staff_roles;
DROP POLICY IF EXISTS "super admins manage roles"     ON public.staff_roles;
DROP POLICY IF EXISTS "read own staff row or as user manager" ON public.staff_members;

CREATE POLICY "staff can read roles" ON public.staff_roles
  FOR SELECT TO authenticated USING (public.is_staff());

CREATE POLICY "super admins manage roles" ON public.staff_roles
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "read own staff row or as user manager" ON public.staff_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_permission('users'));

GRANT SELECT ON public.staff_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_roles TO authenticated;

NOTIFY pgrst, 'reload schema';
