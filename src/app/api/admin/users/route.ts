import { NextResponse } from 'next/server';
import { getServiceClient, requirePermission } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const NO_KEY =
  'SUPABASE_SERVICE_ROLE_KEY is not set on the server. Add it in Vercel (Settings -> Environment Variables) and in .env.local, then redeploy.';

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

type Admin = NonNullable<ReturnType<typeof getServiceClient>>;

async function activeSuperAdminCount(admin: Admin) {
  const { count } = await admin
    .from('staff_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('role', 'super_admin')
    .eq('active', true);
  return count ?? 0;
}

// List team members
export async function GET() {
  const guard = await requirePermission('users');
  if (!guard.ok) return fail(guard.status, guard.error);
  const admin = getServiceClient();
  if (!admin) return fail(500, NO_KEY);

  const [{ data: staff, error }, { data: usersPage }] = await Promise.all([
    admin.from('staff_members').select('*').order('created_at', { ascending: true }),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  if (error) return fail(500, error.message);

  const users = usersPage?.users ?? [];
  const byId = new Map(users.map((u) => [u.id, u]));
  const staffIds = new Set((staff ?? []).map((s) => s.user_id));

  return NextResponse.json({
    members: (staff ?? []).map((s) => ({
      ...s,
      last_sign_in_at: byId.get(s.user_id)?.last_sign_in_at ?? null,
    })),
    // Logins that exist in Supabase Auth but are not on the team (no access)
    unassigned: users
      .filter((u) => !staffIds.has(u.id))
      .map((u) => ({ id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at })),
    me: guard.userId,
    isSuperAdmin: guard.isSuperAdmin,
  });
}

// Create a login (or attach an existing one) and give it a role
export async function POST(req: Request) {
  const guard = await requirePermission('users');
  if (!guard.ok) return fail(guard.status, guard.error);
  const admin = getServiceClient();
  if (!admin) return fail(500, NO_KEY);

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  const fullName = String(body.full_name ?? '').trim() || null;
  const role = String(body.role ?? '');
  const password = body.password ? String(body.password) : '';
  const existingUserId = body.user_id ? String(body.user_id) : '';

  if (!role) return fail(400, 'Choose a role');
  if (role === 'super_admin' && !guard.isSuperAdmin) return fail(403, 'Only a Super Admin can create another Super Admin');

  const { data: roleRow } = await admin.from('staff_roles').select('key').eq('key', role).maybeSingle();
  if (!roleRow) return fail(400, 'Unknown role');

  let userId = existingUserId;
  let userEmail = email;

  if (!userId) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, 'Enter a valid email');
    if (password.length < 8) return fail(400, 'Temporary password must be at least 8 characters');

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: fullName ? { full_name: fullName } : undefined,
    });
    if (error) {
      const msg = /already/i.test(error.message)
        ? 'A login with this email already exists. Pick it from "Existing logins without access" instead.'
        : error.message;
      return fail(400, msg);
    }
    userId = data.user.id;
  } else {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user) return fail(404, 'Login not found');
    userEmail = data.user.email ?? '';
  }

  const { error: insertError } = await admin.from('staff_members').upsert({
    user_id: userId,
    email: userEmail,
    full_name: fullName,
    role,
    active: true,
    created_by: guard.userId,
    updated_at: new Date().toISOString(),
  });
  if (insertError) return fail(500, insertError.message);

  return NextResponse.json({ ok: true, user_id: userId });
}

// Change role / name / active, or reset password
export async function PATCH(req: Request) {
  const guard = await requirePermission('users');
  if (!guard.ok) return fail(guard.status, guard.error);
  const admin = getServiceClient();
  if (!admin) return fail(500, NO_KEY);

  const body = await req.json().catch(() => ({}));
  const userId = String(body.user_id ?? '');
  if (!userId) return fail(400, 'Missing user');

  const { data: current } = await admin.from('staff_members').select('*').eq('user_id', userId).maybeSingle();
  if (!current) return fail(404, 'Team member not found');

  const touchesSuper = current.role === 'super_admin' || body.role === 'super_admin';
  if (touchesSuper && !guard.isSuperAdmin) return fail(403, 'Only a Super Admin can change a Super Admin');

  const isSelf = userId === guard.userId;
  if (isSelf && (body.active === false || (body.role && body.role !== current.role))) {
    return fail(400, 'You cannot change your own role or deactivate yourself');
  }

  const losingSuper =
    current.role === 'super_admin' && current.active &&
    ((body.role && body.role !== 'super_admin') || body.active === false);
  if (losingSuper && (await activeSuperAdminCount(admin)) <= 1) {
    return fail(400, 'There must always be at least one active Super Admin');
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.role === 'string' && body.role) update.role = body.role;
  if (typeof body.active === 'boolean') update.active = body.active;
  if (typeof body.full_name === 'string') update.full_name = body.full_name.trim() || null;

  const { error } = await admin.from('staff_members').update(update).eq('user_id', userId);
  if (error) return fail(500, error.message);

  if (body.password) {
    if (String(body.password).length < 8) return fail(400, 'Password must be at least 8 characters');
    const { error: pwError } = await admin.auth.admin.updateUserById(userId, { password: String(body.password) });
    if (pwError) return fail(500, pwError.message);
  }

  return NextResponse.json({ ok: true });
}

// Remove from the team; with ?delete_login=1 also delete the login itself
export async function DELETE(req: Request) {
  const guard = await requirePermission('users');
  if (!guard.ok) return fail(guard.status, guard.error);
  const admin = getServiceClient();
  if (!admin) return fail(500, NO_KEY);

  const url = new URL(req.url);
  const userId = url.searchParams.get('user_id') ?? '';
  const deleteLogin = url.searchParams.get('delete_login') === '1';
  if (!userId) return fail(400, 'Missing user');
  if (userId === guard.userId) return fail(400, 'You cannot remove yourself');

  const { data: current } = await admin.from('staff_members').select('*').eq('user_id', userId).maybeSingle();
  if (current?.role === 'super_admin') {
    if (!guard.isSuperAdmin) return fail(403, 'Only a Super Admin can remove a Super Admin');
    if (current.active && (await activeSuperAdminCount(admin)) <= 1) {
      return fail(400, 'There must always be at least one active Super Admin');
    }
  }

  if (deleteLogin) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return fail(500, error.message);
  } else {
    const { error } = await admin.from('staff_members').delete().eq('user_id', userId);
    if (error) return fail(500, error.message);
  }
  return NextResponse.json({ ok: true });
}
