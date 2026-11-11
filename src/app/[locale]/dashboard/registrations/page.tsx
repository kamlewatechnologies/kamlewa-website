'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import toast from 'react-hot-toast';
import { HiSearch, HiDownload, HiMail, HiTrash, HiCheckCircle, HiRefresh, HiChevronRight } from 'react-icons/hi';
import { supabase } from '@/lib/supabase/supabaseClient';
import { useAccess } from '@/lib/access';
import DashboardModal from '@/components/DashboardModal';
import Loader from '@/components/Loader';

type SourceKey = 'events' | 'trainings' | 'communities' | 'volunteers' | 'partnerships' | 'messages';
type Row = Record<string, unknown> & { id: string };

interface Source {
  label: string;
  table: string;
  dateCol: string;
  nameCol: string;
  groupCol?: string;
  groupLabel?: string;
  fields: { key: string; label: string }[];
  statuses: string[];
}

const REVIEW_STATUSES = ['new', 'reviewed', 'accepted', 'rejected', 'archived'];

const SOURCES: Record<SourceKey, Source> = {
  events: {
    label: 'Event registrations', table: 'event_registrations', dateCol: 'registered_at', nameCol: 'name',
    groupCol: 'event_id', groupLabel: 'All events',
    fields: [
      { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'profession', label: 'Profession' },
      { key: 'sex', label: 'Sex' }, { key: 'organization', label: 'School / Organization' }, { key: 'city', label: 'City' },
    ],
    statuses: ['confirmed', 'pending', 'cancelled'],
  },
  trainings: {
    label: 'Training enrollments', table: 'training_registrations', dateCol: 'created_at', nameCol: 'full_name',
    groupCol: 'training_id', groupLabel: 'All trainings',
    fields: [
      { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'training_name', label: 'Training' },
      { key: 'location', label: 'Location' }, { key: 'message', label: 'Message' },
    ],
    statuses: REVIEW_STATUSES,
  },
  communities: {
    label: 'Community applications', table: 'community_applications', dateCol: 'created_at', nameCol: 'name',
    groupCol: 'community', groupLabel: 'All communities',
    fields: [
      { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'community', label: 'Community' },
      { key: 'message', label: 'Message' },
    ],
    statuses: REVIEW_STATUSES,
  },
  volunteers: {
    label: 'Volunteers', table: 'volunteer_applications', dateCol: 'created_at', nameCol: 'name',
    fields: [
      { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'expertise', label: 'Expertise' },
      { key: 'availability', label: 'Availability' }, { key: 'message', label: 'Message' },
    ],
    statuses: REVIEW_STATUSES,
  },
  partnerships: {
    label: 'Partnership inquiries', table: 'partnership_inquiries', dateCol: 'created_at', nameCol: 'name',
    fields: [
      { key: 'organization', label: 'Organization' }, { key: 'partnership_type', label: 'Partnership type' },
      { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'message', label: 'Message' },
    ],
    statuses: REVIEW_STATUSES,
  },
  messages: {
    label: 'Contact messages', table: 'contact_submissions', dateCol: 'created_at', nameCol: 'name',
    fields: [
      { key: 'subject', label: 'Subject' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' },
      { key: 'message', label: 'Message' },
    ],
    statuses: REVIEW_STATUSES,
  },
};

const TAB_ORDER: SourceKey[] = ['events', 'trainings', 'communities', 'volunteers', 'partnerships', 'messages'];

const STATUS_STYLE: Record<string, string> = {
  confirmed: 'bg-green-500/15 text-green-400 border-green-500/30',
  accepted: 'bg-green-500/15 text-green-400 border-green-500/30',
  pending: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/30',
  new: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/30',
  reviewed: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
  archived: 'bg-white/10 text-gray-400 border-white/20',
};

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const fmtDate = (v: unknown) => {
  const d = v ? new Date(String(v)) : null;
  return d && !isNaN(d.getTime())
    ? d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';
};
const pretty = (v: string) => v.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

function toCsv(rows: Row[], cols: string[]) {
  const esc = (v: unknown) => `"${str(v).replace(/"/g, '""')}"`;
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

export default function RegistrationsPage() {
  const router = useRouter();
  const { can } = useAccess();

  const [tab, setTab] = useState<SourceKey>('events');
  const [group, setGroup] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Partial<Record<SourceKey, number>>>({});
  const [groupNames, setGroupNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Row | null>(null);
  const [notes, setNotes] = useState('');

  const source = SOURCES[tab];

  // Deep links: /dashboard/registrations?tab=events&group=<eventId>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab') as SourceKey | null;
    if (t && SOURCES[t]) setTab(t);
    setGroup(params.get('group') ?? '');
  }, []);

  const loadCounts = useCallback(async () => {
    const results = await Promise.all(
      TAB_ORDER.map(async (k) => {
        const { count } = await supabase.from(SOURCES[k].table).select('id', { count: 'exact', head: true });
        return [k, count ?? 0] as const;
      })
    );
    setCounts(Object.fromEntries(results));
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(source.table)
      .select('*')
      .order(source.dateCol, { ascending: false })
      .limit(2000);
    if (error) {
      toast.error(`Could not load ${source.label.toLowerCase()}: ${error.message}`);
      setRows([]);
    } else {
      setRows((data ?? []) as Row[]);
    }
    setLoading(false);
  }, [source]);

  useEffect(() => { loadCounts(); }, [loadCounts]);
  useEffect(() => { loadRows(); }, [loadRows]);

  // Names for the event / training filter
  useEffect(() => {
    const load = async () => {
      if (tab === 'events') {
        const { data } = await supabase.from('events').select('id, title').order('date', { ascending: false });
        setGroupNames(Object.fromEntries((data ?? []).map((e: { id: string; title: string }) => [e.id, e.title])));
      } else if (tab === 'trainings') {
        const { data } = await supabase.from('trainings').select('id, title');
        setGroupNames(Object.fromEntries((data ?? []).map((e: { id: string; title: string }) => [e.id, e.title])));
      } else {
        setGroupNames({});
      }
    };
    load();
  }, [tab]);

  const groupOptions = useMemo(() => {
    if (!source.groupCol) return [];
    const ids = new Set(rows.map((r) => str(r[source.groupCol!])).filter(Boolean));
    Object.keys(groupNames).forEach((id) => ids.add(id));
    return Array.from(ids)
      .map((id) => ({
        id,
        label: groupNames[id] || (tab === 'trainings' ? str(rows.find((r) => r.training_id === id)?.training_name) : '') || id,
        count: rows.filter((r) => str(r[source.groupCol!]) === id).length,
      }))
      .sort((a, b) => b.count - a.count);
  }, [rows, groupNames, source, tab]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (group && source.groupCol && str(r[source.groupCol]) !== group) return false;
      if (statusFilter && str(r.status) !== statusFilter) return false;
      if (!q) return true;
      return [source.nameCol, ...source.fields.map((f) => f.key)].some((k) => str(r[k]).toLowerCase().includes(q));
    });
  }, [rows, group, statusFilter, search, source]);

  const statusCounts = useMemo(() => {
    const base = group && source.groupCol ? rows.filter((r) => str(r[source.groupCol!]) === group) : rows;
    const c: Record<string, number> = {};
    base.forEach((r) => { const s = str(r.status) || 'new'; c[s] = (c[s] ?? 0) + 1; });
    return { total: base.length, byStatus: c, attended: base.filter((r) => r.attended === true).length };
  }, [rows, group, source]);

  const switchTab = (k: SourceKey) => {
    setTab(k);
    setGroup('');
    setStatusFilter('');
    setSearch('');
  };

  const updateRow = async (row: Row, patch: Record<string, unknown>) => {
    const { error } = await supabase.from(source.table).update(patch).eq('id', row.id);
    if (error) {
      const hint = error.code === 'PGRST204' || error.code === '42703'
        ? ' Run scripts/dashboard/03_registrations_access.sql in Supabase first.'
        : '';
      toast.error(`${error.message}.${hint}`);
      return false;
    }
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, ...patch } : r)));
    setSelected((s) => (s && s.id === row.id ? { ...s, ...patch } : s));
    return true;
  };

  const deleteRow = async (row: Row) => {
    if (!confirm(`Delete ${str(row[source.nameCol]) || 'this entry'}? This cannot be undone.`)) return;
    const { error } = await supabase.from(source.table).delete().eq('id', row.id);
    if (error) { toast.error(error.message); return; }
    setRows((rs) => rs.filter((r) => r.id !== row.id));
    setCounts((c) => ({ ...c, [tab]: Math.max(0, (c[tab] ?? 1) - 1) }));
    setSelected(null);
    toast.success('Deleted');
  };

  const exportCsv = () => {
    if (!filtered.length) { toast.error('Nothing to export'); return; }
    const cols = [source.nameCol, ...source.fields.map((f) => f.key), 'status', ...(tab === 'events' ? ['attended'] : []), 'notes', source.dateCol];
    const out = filtered.map((r) => (source.groupCol && groupNames[str(r[source.groupCol])]
      ? { ...r, [source.groupCol]: groupNames[str(r[source.groupCol])] } : r));
    if (source.groupCol && !cols.includes(source.groupCol)) cols.splice(1, 0, source.groupCol);
    const blob = new Blob([toCsv(out, cols)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    const groupName = group ? (groupNames[group] || group) : 'all';
    a.href = URL.createObjectURL(blob);
    a.download = `${source.table}-${groupName}`.replace(/[^\w-]+/g, '_').slice(0, 80) + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const emailThese = () => {
    const emails = Array.from(new Set(filtered.map((r) => str(r.email).trim().toLowerCase()).filter(Boolean)));
    if (!emails.length) { toast.error('No email addresses in this list'); return; }
    try { sessionStorage.setItem('broadcastRecipients', JSON.stringify(emails)); } catch { /* ignore */ }
    router.push('/dashboard/broadcast');
  };

  const openRow = (row: Row) => { setSelected(row); setNotes(str(row.notes)); };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between pb-6 border-b border-white/10">
        <div>
          <p className="text-yellow-400 text-sm font-semibold uppercase tracking-wider">People</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1" style={{ fontFamily: 'var(--font-nourd), sans-serif' }}>
            Registrations &amp; Applications
          </h1>
          <p className="text-gray-400 text-sm mt-2">Everyone who registered or applied on the website, in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { loadRows(); loadCounts(); }} className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-white/15 hover:border-white/40 text-white/80">
            <HiRefresh className="w-4 h-4" /> Refresh
          </button>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-white/15 hover:border-white/40 text-white/80">
            <HiDownload className="w-4 h-4" /> Export CSV
          </button>
          {can('broadcast') && (
            <button onClick={emailThese} className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-yellow-400 text-black font-semibold hover:bg-yellow-300">
              <HiMail className="w-4 h-4" /> Email these ({filtered.length})
            </button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {TAB_ORDER.map((k) => (
          <button
            key={k}
            onClick={() => switchTab(k)}
            className={`shrink-0 px-4 py-2 text-sm border transition-colors ${
              tab === k ? 'bg-yellow-400/15 border-yellow-400/50 text-yellow-400' : 'border-white/10 text-white/70 hover:text-white hover:border-white/30'
            }`}
          >
            {SOURCES[k].label}
            <span className="ml-2 text-xs opacity-70">{counts[k] ?? '–'}</span>
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-400">Total</p>
          <p className="text-3xl font-bold text-yellow-400">{statusCounts.total}</p>
        </div>
        {source.statuses.slice(0, tab === 'events' ? 2 : 3).map((s) => (
          <button key={s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
            className={`text-left border p-4 transition-colors ${statusFilter === s ? 'border-yellow-400/50 bg-yellow-400/10' : 'border-white/10 bg-white/5 hover:border-white/30'}`}>
            <p className="text-xs uppercase tracking-wide text-gray-400">{pretty(s)}</p>
            <p className="text-3xl font-bold">{statusCounts.byStatus[s] ?? 0}</p>
          </button>
        ))}
        {tab === 'events' && (
          <div className="border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-400">Attended</p>
            <p className="text-3xl font-bold">{statusCounts.attended}</p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex items-center gap-2 flex-1 border border-white/15 bg-white/5 px-3">
          <HiSearch className="w-4 h-4 text-white/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, organization…"
            className="flex-1 bg-transparent py-2.5 text-sm text-white placeholder-white/40 outline-none"
          />
        </div>
        {source.groupCol && (
          <select aria-label="Filter" value={group} onChange={(e) => setGroup(e.target.value)}
            className="md:w-72 bg-black border border-white/15 px-3 py-2.5 text-sm text-white">
            <option value="">{source.groupLabel}</option>
            {groupOptions.map((g) => <option key={g.id} value={g.id}>{g.label} ({g.count})</option>)}
          </select>
        )}
        <select aria-label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="md:w-44 bg-black border border-white/15 px-3 py-2.5 text-sm text-white">
          <option value="">Any status</option>
          {source.statuses.map((s) => <option key={s} value={s}>{pretty(s)}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-20 text-center"><Loader size={48} /></div>
      ) : filtered.length === 0 ? (
        <div className="border border-white/10 bg-white/5 py-16 text-center text-gray-400 text-sm">
          {rows.length === 0 ? `No ${source.label.toLowerCase()} yet.` : 'Nobody matches these filters.'}
        </div>
      ) : (
        <div className="border border-white/10 divide-y divide-white/10">
          {filtered.map((r) => {
            const status = str(r.status) || 'new';
            const groupName = source.groupCol ? (groupNames[str(r[source.groupCol])] || str(r.training_name) || str(r[source.groupCol])) : '';
            return (
              <div key={r.id} className="flex flex-col md:flex-row md:items-center gap-3 p-4 hover:bg-white/[0.03]">
                <button onClick={() => openRow(r)} className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white">{str(r[source.nameCol]) || '(no name)'}</span>
                    {tab === 'events' && r.attended === true && <HiCheckCircle className="w-4 h-4 text-green-400" title="Attended" />}
                    {!group && groupName && <span className="text-xs text-gray-500 truncate max-w-[16rem]">· {groupName}</span>}
                  </div>
                  <p className="text-sm text-gray-400 truncate">
                    {[r.email, r.phone, r.profession ?? r.organization ?? r.subject ?? r.expertise].map(str).filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{fmtDate(r[source.dateCol])}</p>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  {tab === 'events' && (
                    <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer select-none px-2">
                      <input type="checkbox" checked={r.attended === true} onChange={(e) => updateRow(r, { attended: e.target.checked })} className="accent-yellow-400" />
                      Attended
                    </label>
                  )}
                  <select aria-label="Change status" value={status} onChange={(e) => updateRow(r, { status: e.target.value })}
                    className={`border px-2 py-1.5 text-xs bg-black ${STATUS_STYLE[status] ?? 'border-white/20 text-white'}`}>
                    {source.statuses.map((s) => <option key={s} value={s} className="bg-black text-white">{pretty(s)}</option>)}
                  </select>
                  <button onClick={() => openRow(r)} className="p-2 text-white/60 hover:text-yellow-400" aria-label="Open details">
                    <HiChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DashboardModal isOpen={!!selected} onClose={() => setSelected(null)} title={selected ? str(selected[source.nameCol]) || 'Details' : ''}>
        {selected && (
          <div className="space-y-5 text-white">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {source.groupCol && tab !== 'trainings' && tab !== 'communities' && (
                <div><dt className="text-xs uppercase text-gray-500">Event</dt><dd className="text-sm">{groupNames[str(selected[source.groupCol])] || str(selected[source.groupCol])}</dd></div>
              )}
              {source.fields.map((f) => str(selected[f.key]) && (
                <div key={f.key} className={f.key === 'message' ? 'sm:col-span-2' : ''}>
                  <dt className="text-xs uppercase text-gray-500">{f.label}</dt>
                  <dd className="text-sm whitespace-pre-wrap break-words">
                    {f.key === 'email' ? <a className="text-yellow-400 hover:underline" href={`mailto:${str(selected.email)}`}>{str(selected.email)}</a>
                      : f.key === 'phone' ? <a className="text-yellow-400 hover:underline" href={`tel:${str(selected.phone)}`}>{str(selected.phone)}</a>
                      : f.key === 'sex' ? pretty(str(selected.sex)) : str(selected[f.key])}
                  </dd>
                </div>
              ))}
              <div><dt className="text-xs uppercase text-gray-500">Received</dt><dd className="text-sm">{fmtDate(selected[source.dateCol])}</dd></div>
            </dl>

            <div className="flex flex-wrap items-center gap-3">
              <select aria-label="Status" value={str(selected.status) || 'new'} onChange={(e) => updateRow(selected, { status: e.target.value })}
                className="bg-black border border-white/20 px-3 py-2 text-sm">
                {source.statuses.map((s) => <option key={s} value={s}>{pretty(s)}</option>)}
              </select>
              {tab === 'events' && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={selected.attended === true} onChange={(e) => updateRow(selected, { attended: e.target.checked })} className="accent-yellow-400" />
                  Attended
                </label>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="reg-notes" className="text-xs uppercase text-gray-500">Internal notes</label>
              <textarea id="reg-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                placeholder="Only the team can see this"
                className="w-full bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none focus:border-yellow-400" />
              <button
                onClick={async () => { if (await updateRow(selected, { notes: notes.trim() || null })) toast.success('Notes saved'); }}
                disabled={notes === str(selected.notes)}
                className="px-4 py-2 text-sm bg-yellow-400 text-black font-semibold disabled:opacity-40">
                Save notes
              </button>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-between">
              <button onClick={() => deleteRow(selected)} className="inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300">
                <HiTrash className="w-4 h-4" /> Delete
              </button>
              <button onClick={() => setSelected(null)} className="text-sm text-white/70 hover:text-white">Close</button>
            </div>
          </div>
        )}
      </DashboardModal>
    </div>
  );
}
