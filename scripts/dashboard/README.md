# Dashboard: registrations, team, roles: setup

Run each file in Supabase: **SQL Editor → paste → Run**, in this order.

| Step | What | When |
|---|---|---|
| 1 | Push / deploy the new website code | first |
| 2 | `01_roles_and_staff.sql` | after deploy |
| 3 | `02_make_me_super_admin.sql` (check the email in it) | right after 01 |
| 4 | Add `SUPABASE_SERVICE_ROLE_KEY` in Vercel → Settings → Environment Variables, then redeploy | needed for Team & Roles (creating logins) |
| 5 | `03_registrations_access.sql` | after 1–3 |
| 6 | `04_content_permissions.sql` | after 1–3 |

The service role key is in Supabase → Project Settings → API → `service_role`. Never put it in a `NEXT_PUBLIC_` variable.

Until step 2 is done the dashboard works as before (every login is an admin) and shows a yellow "roles not set up" notice.

## Roles that come built in

| Role | Can manage |
|---|---|
| Super Admin | Everything, including Team & Roles |
| Admin | All content, registrations, broadcast |
| Content Editor | Programs, events, trainings, projects, reports, contact info |
| Registrations Officer | Registrations & applications, broadcast |

Super Admins can edit these or add new roles on the **Team & Roles** page.
