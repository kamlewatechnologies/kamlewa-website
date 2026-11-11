-- =====================================================================
-- 02 · Make your existing login a Super Admin
-- Run right after 01. Change the email if your dashboard login is different.
-- Every existing login that is NOT added here loses dashboard access
-- once 03 and 04 are run, so add each person you want to keep.
-- =====================================================================

INSERT INTO public.staff_members (user_id, email, full_name, role)
SELECT id, email, 'Administrator', 'super_admin'
FROM auth.users
WHERE lower(email) = lower('admin@kamlewa.org')
ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin', active = true, updated_at = now();

-- Check: this should return one row. If it returns none, the email above
-- does not match a login under Authentication -> Users.
SELECT user_id, email, role, active FROM public.staff_members WHERE role = 'super_admin';

-- See every login in the project (to decide who else to add):
-- SELECT id, email, created_at, last_sign_in_at FROM auth.users ORDER BY created_at;
