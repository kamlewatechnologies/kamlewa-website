'use client';

import { createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase/supabaseClient';

export const PERMISSIONS = [
  { key: 'programs', label: 'Programs' },
  { key: 'events', label: 'Events' },
  { key: 'trainings', label: 'Trainings' },
  { key: 'projects', label: 'Projects' },
  { key: 'reports', label: 'Reports' },
  { key: 'contact', label: 'Contact info' },
  { key: 'registrations', label: 'Registrations & applications' },
  { key: 'broadcast', label: 'Broadcast emails' },
  { key: 'users', label: 'Team & roles' },
] as const;

export type Permission = (typeof PERMISSIONS)[number]['key'];

export interface Access {
  isStaff: boolean;
  role: string | null;
  roleName: string | null;
  fullName: string | null;
  permissions: Permission[];
  /** True when the roles SQL (scripts/dashboard/01) has not been run yet. */
  legacy: boolean;
}

const ALL_PERMISSIONS = PERMISSIONS.map((p) => p.key) as Permission[];

export async function fetchMyAccess(): Promise<Access> {
  const { data, error } = await supabase.rpc('get_my_access');

  if (error) {
    // Function not created yet: keep the old behaviour (any login is an admin)
    // so the dashboard keeps working until the SQL is run.
    if (error.code === 'PGRST202' || error.code === '42883') {
      return { isStaff: true, role: 'super_admin', roleName: 'Admin (setup pending)', fullName: null, permissions: ALL_PERMISSIONS, legacy: true };
    }
    throw error;
  }

  const a = (data ?? {}) as { is_staff?: boolean; role?: string; role_name?: string; full_name?: string; permissions?: string[] };
  return {
    isStaff: a.is_staff === true,
    role: a.role ?? null,
    roleName: a.role_name ?? null,
    fullName: a.full_name ?? null,
    permissions: (a.permissions ?? []) as Permission[],
    legacy: false,
  };
}

/** Which permission a dashboard path needs (null = any staff member). */
export function permissionForPath(pathname: string): Permission | null {
  const m = pathname.match(/\/dashboard\/([^/?#]+)/);
  const section = m?.[1];
  switch (section) {
    case 'programs':
    case 'events':
    case 'trainings':
    case 'projects':
    case 'reports':
    case 'contact':
    case 'registrations':
    case 'broadcast':
      return section;
    case 'team':
      return 'users';
    default:
      return null;
  }
}

export const AccessContext = createContext<Access | null>(null);

export function useAccess() {
  const access = useContext(AccessContext);
  return {
    access,
    can: (p: Permission) => !!access?.permissions.includes(p),
  };
}
