// Server only (imported by API routes): uses the service role key.
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from './server';

/** Service-role client. Server only: bypasses RLS. */
export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

type Guard =
  | { ok: true; userId: string; isSuperAdmin: boolean }
  | { ok: false; status: number; error: string };

/**
 * Checks the caller's session cookie and that they hold `permission`.
 * Before the roles SQL is run (functions missing), any signed-in user passes,
 * matching how the dashboard behaved before roles existed.
 */
export async function requirePermission(permission: string): Promise<Guard> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: 'Not signed in' };

  const { data: allowed, error } = await supabase.rpc('has_permission', { p: permission });
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') {
      return { ok: true, userId: user.id, isSuperAdmin: true };
    }
    return { ok: false, status: 500, error: error.message };
  }
  if (!allowed) return { ok: false, status: 403, error: 'You do not have permission for this' };

  const { data: superAdmin } = await supabase.rpc('is_super_admin');
  return { ok: true, userId: user.id, isSuperAdmin: superAdmin === true };
}
