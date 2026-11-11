'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiPlus, HiTrash, HiKey, HiRefresh, HiShieldCheck } from 'react-icons/hi';
import { supabase } from '@/lib/supabase/supabaseClient';
import { PERMISSIONS, useAccess, type Permission } from '@/lib/access';
import DashboardModal from '@/components/DashboardModal';
import Loader from '@/components/Loader';

interface Member {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  active: boolean;
  created_at: string;
  last_sign_in_at: string | null;
}
interface Unassigned { id: string; email: string; created_at: string; last_sign_in_at: string | null }
interface Role { key: string; name: string; description: string | null; permissions: string[]; is_system: boolean }

const input = 'w-full bg-white/5 border border-white/15 px-3 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:border-yellow-400';
const fmt = (v: string | null) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never');

function makePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('') + '!7';
}

async function api(method: string, body?: unknown, query = '') {
  const res = await fetch(`/api/admin/users${query}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export default function TeamPage() {
  const { access } = useAccess();
  const [members, setMembers] = useState<Member[]>([]);
  const [unassigned, setUnassigned] = useState<Unassigned[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [me, setMe] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'editor', user_id: '' });
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const [roleEdit, setRoleEdit] = useState<Role | null>(null);
  const [roleIsNew, setRoleIsNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [{ data: roleRows, error: roleErr }, team] = await Promise.all([
        supabase.from('staff_roles').select('*').order('is_system', { ascending: false }).order('name'),
        api('GET'),
      ]);
      if (roleErr) throw roleErr;
      setRoles((roleRows ?? []) as Role[]);
      setMembers(team.members);
      setUnassigned(team.unassigned);
      setMe(team.me);
      setIsSuperAdmin(team.isSuperAdmin);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load the team');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const roleName = (key: string) => roles.find((r) => r.key === key)?.name ?? key;
  const assignableRoles = roles.filter((r) => isSuperAdmin || r.key !== 'super_admin');

  const openAdd = (existing?: Unassigned) => {
    setCreated(null);
    setForm({ full_name: '', email: existing?.email ?? '', password: existing ? '' : makePassword(), role: 'editor', user_id: existing?.id ?? '' });
    setAddOpen(true);
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api('POST', form);
      toast.success(form.user_id ? 'Access granted' : 'Team member created');
      if (!form.user_id) setCreated({ email: form.email.trim().toLowerCase(), password: form.password });
      else setAddOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const patch = async (m: Member, body: Record<string, unknown>, ok: string) => {
    try {
      await api('PATCH', { user_id: m.user_id, ...body });
      toast.success(ok);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  const resetPassword = async (m: Member) => {
    const pw = makePassword();
    if (!confirm(`Set a new temporary password for ${m.email}?`)) return;
    try {
      await api('PATCH', { user_id: m.user_id, password: pw });
      setCreated({ email: m.email, password: pw });
      setAddOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  const remove = async (m: Member) => {
    if (!confirm(`Remove ${m.email} from the team and delete their login? This cannot be undone.\n\n(To pause access instead, use Deactivate.)`)) return;
    try {
      await api('DELETE', undefined, `?user_id=${encodeURIComponent(m.user_id)}&delete_login=1`);
      toast.success('Removed');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  const saveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleEdit) return;
    const row = {
      key: roleEdit.key.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_'),
      name: roleEdit.name.trim(),
      description: roleEdit.description?.trim() || null,
      permissions: roleEdit.permissions,
    };
    if (!row.key || !row.name) { toast.error('Name and key are required'); return; }
    const { error } = roleIsNew
      ? await supabase.from('staff_roles').insert(row)
      : await supabase.from('staff_roles').update({ name: row.name, description: row.description, permissions: row.permissions }).eq('key', roleEdit.key);
    if (error) { toast.error(error.message); return; }
    toast.success('Role saved');
    setRoleEdit(null);
    load();
  };

  const deleteRole = async (r: Role) => {
    if (members.some((m) => m.role === r.key)) { toast.error('Move the people with this role to another role first'); return; }
    if (!confirm(`Delete the role "${r.name}"?`)) return;
    const { error } = await supabase.from('staff_roles').delete().eq('key', r.key);
    if (error) { toast.error(error.message); return; }
    toast.success('Role deleted');
    load();
  };

  if (access?.legacy) {
    return (
      <div className="max-w-2xl mx-auto py-16 space-y-4">
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-nourd), sans-serif' }}>Team &amp; Roles</h1>
        <p className="text-gray-300">Roles are not set up in the database yet. In Supabase, open <b>SQL Editor</b> and run, in order:</p>
        <ol className="list-decimal pl-6 text-gray-300 space-y-1 text-sm">
          <li><code>scripts/dashboard/01_roles_and_staff.sql</code></li>
          <li><code>scripts/dashboard/02_make_me_super_admin.sql</code> (with your login email)</li>
        </ol>
        <p className="text-gray-400 text-sm">Then reload this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between pb-6 border-b border-white/10">
        <div>
          <p className="text-yellow-400 text-sm font-semibold uppercase tracking-wider">Access</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1" style={{ fontFamily: 'var(--font-nourd), sans-serif' }}>Team &amp; Roles</h1>
          <p className="text-gray-400 text-sm mt-2">Create logins for your team and choose what each person can manage.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-white/15 hover:border-white/40 text-white/80">
            <HiRefresh className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => openAdd()} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-yellow-400 text-black font-semibold hover:bg-yellow-300">
            <HiPlus className="w-4 h-4" /> Add team member
          </button>
        </div>
      </header>

      {loading ? (
        <div className="py-20 text-center"><Loader size={48} /></div>
      ) : loadError ? (
        <div className="border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">{loadError}</div>
      ) : (
        <>
          {/* Members */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold">Team members <span className="text-gray-500 text-base">({members.length})</span></h2>
            <div className="border border-white/10 divide-y divide-white/10">
              {members.map((m) => {
                const self = m.user_id === me;
                const locked = self || (m.role === 'super_admin' && !isSuperAdmin);
                return (
                  <div key={m.user_id} className={`flex flex-col md:flex-row md:items-center gap-3 p-4 ${m.active ? '' : 'opacity-60'}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">
                        {m.full_name || m.email}
                        {self && <span className="ml-2 text-xs text-yellow-400">(you)</span>}
                        {!m.active && <span className="ml-2 text-xs text-red-400">deactivated</span>}
                      </p>
                      <p className="text-sm text-gray-400 truncate">{m.email}</p>
                      <p className="text-xs text-gray-500">Last sign-in: {fmt(m.last_sign_in_at)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select aria-label="Role" value={m.role} disabled={locked}
                        onChange={(e) => patch(m, { role: e.target.value }, `Role changed to ${roleName(e.target.value)}`)}
                        className="bg-black border border-white/20 px-3 py-2 text-sm disabled:opacity-60">
                        {(locked ? roles : assignableRoles).map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
                      </select>
                      {!locked && (
                        <>
                          <button onClick={() => patch(m, { active: !m.active }, m.active ? 'Deactivated' : 'Reactivated')}
                            className="px-3 py-2 text-xs border border-white/15 hover:border-white/40">
                            {m.active ? 'Deactivate' : 'Reactivate'}
                          </button>
                          <button onClick={() => resetPassword(m)} className="p-2 text-white/60 hover:text-yellow-400" aria-label="Reset password" title="Reset password">
                            <HiKey className="w-5 h-5" />
                          </button>
                          <button onClick={() => remove(m)} className="p-2 text-white/60 hover:text-red-400" aria-label="Remove" title="Remove">
                            <HiTrash className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {unassigned.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xl font-bold">Existing logins without access <span className="text-gray-500 text-base">({unassigned.length})</span></h2>
              <p className="text-sm text-gray-400">These accounts exist in Supabase but cannot open the dashboard.</p>
              <div className="border border-white/10 divide-y divide-white/10">
                {unassigned.map((u) => (
                  <div key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{u.email}</p>
                      <p className="text-xs text-gray-500">Created {fmt(u.created_at)} · last sign-in {fmt(u.last_sign_in_at)}</p>
                    </div>
                    <button onClick={() => openAdd(u)} className="px-3 py-2 text-sm border border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/10">Give access</button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Roles */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Roles &amp; permissions</h2>
              {isSuperAdmin && (
                <button onClick={() => { setRoleIsNew(true); setRoleEdit({ key: '', name: '', description: '', permissions: [], is_system: false }); }}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-white/15 hover:border-white/40">
                  <HiPlus className="w-4 h-4" /> New role
                </button>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {roles.map((r) => (
                <div key={r.key} className="border border-white/10 bg-white/5 p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold flex items-center gap-2">
                        {r.key === 'super_admin' && <HiShieldCheck className="w-4 h-4 text-yellow-400" />}{r.name}
                      </p>
                      {r.description && <p className="text-sm text-gray-400">{r.description}</p>}
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">{members.filter((m) => m.role === r.key).length} people</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(r.key === 'super_admin' ? PERMISSIONS.map((p) => p.key) : r.permissions).map((p) => (
                      <span key={p} className="text-xs px-2 py-0.5 border border-white/15 text-gray-300">
                        {PERMISSIONS.find((x) => x.key === p)?.label ?? p}
                      </span>
                    ))}
                    {r.key !== 'super_admin' && r.permissions.length === 0 && <span className="text-xs text-gray-500">Overview only</span>}
                  </div>
                  {isSuperAdmin && r.key !== 'super_admin' && (
                    <div className="flex gap-4 text-sm pt-1">
                      <button onClick={() => { setRoleIsNew(false); setRoleEdit({ ...r }); }} className="text-yellow-400 hover:text-yellow-300">Edit permissions</button>
                      {!r.is_system && <button onClick={() => deleteRole(r)} className="text-red-400 hover:text-red-300">Delete</button>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Add member / show credentials */}
      <DashboardModal isOpen={addOpen} onClose={() => setAddOpen(false)} title={created ? 'Login details' : form.user_id ? 'Give dashboard access' : 'Add team member'}>
        {created ? (
          <div className="space-y-4 text-white">
            <p className="text-sm text-gray-300">Send these to the person privately. They can change the password under Settings after signing in.</p>
            <div className="border border-white/15 bg-white/5 p-4 font-mono text-sm space-y-1 break-all">
              <p>Login page: {typeof window !== 'undefined' ? `${window.location.origin}/en/dashboard/login` : ''}</p>
              <p>Email: {created.email}</p>
              <p>Password: {created.password}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`Login page: ${window.location.origin}/en/dashboard/login\nEmail: ${created.email}\nPassword: ${created.password}`);
                  toast.success('Copied');
                }}
                className="px-4 py-2 text-sm bg-yellow-400 text-black font-semibold">Copy</button>
              <button onClick={() => setAddOpen(false)} className="px-4 py-2 text-sm border border-white/20">Done</button>
            </div>
            <p className="text-xs text-gray-500">This password is not shown again.</p>
          </div>
        ) : (
          <form onSubmit={submitAdd} className="space-y-4 text-white">
            <input className={input} placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <input className={input} type="email" placeholder="Email" required value={form.email} disabled={!!form.user_id}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
            {!form.user_id && (
              <div className="flex gap-2">
                <input className={input} placeholder="Temporary password (min 8)" required minLength={8} value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <button type="button" onClick={() => setForm({ ...form, password: makePassword() })} className="px-3 text-sm border border-white/20 shrink-0">New</button>
              </div>
            )}
            <div>
              <select aria-label="Role" className={`${input} bg-black`} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {assignableRoles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
              </select>
              <p className="text-xs text-gray-500 mt-1.5">{roles.find((r) => r.key === form.role)?.description}</p>
            </div>
            <button type="submit" disabled={saving} className="w-full py-3 bg-yellow-400 text-black font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : form.user_id ? 'Give access' : 'Create login'}
            </button>
          </form>
        )}
      </DashboardModal>

      {/* Role editor */}
      <DashboardModal isOpen={!!roleEdit} onClose={() => setRoleEdit(null)} title={roleIsNew ? 'New role' : `Edit ${roleEdit?.name ?? ''}`}>
        {roleEdit && (
          <form onSubmit={saveRole} className="space-y-4 text-white">
            <input className={input} placeholder="Role name (e.g. Social Media)" required value={roleEdit.name}
              onChange={(e) => setRoleEdit({ ...roleEdit, name: e.target.value, key: roleIsNew ? e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') : roleEdit.key })} />
            <input className={input} placeholder="Short description" value={roleEdit.description ?? ''} onChange={(e) => setRoleEdit({ ...roleEdit, description: e.target.value })} />
            <fieldset className="space-y-2">
              <legend className="text-xs uppercase text-gray-500 mb-2">Can manage</legend>
              {PERMISSIONS.filter((p) => p.key !== 'users').map((p) => (
                <label key={p.key} className="flex items-center gap-3 text-sm cursor-pointer">
                  <input type="checkbox" className="accent-yellow-400 w-4 h-4"
                    checked={roleEdit.permissions.includes(p.key)}
                    onChange={(e) => setRoleEdit({
                      ...roleEdit,
                      permissions: e.target.checked
                        ? [...roleEdit.permissions, p.key]
                        : roleEdit.permissions.filter((x) => x !== (p.key as Permission)),
                    })} />
                  {p.label}
                </label>
              ))}
              <p className="text-xs text-gray-500 pt-1">Managing the team stays with Super Admins.</p>
            </fieldset>
            <button type="submit" className="w-full py-3 bg-yellow-400 text-black font-semibold">Save role</button>
          </form>
        )}
      </DashboardModal>
    </div>
  );
}
