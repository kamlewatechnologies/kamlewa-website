import { supabase } from './supabaseClient';

type Kind = 'event' | 'training' | 'community';

const TABLE: Record<Kind, { table: string; refCol: string }> = {
  event: { table: 'event_registrations', refCol: 'event_id' },
  training: { table: 'training_registrations', refCol: 'training_id' },
  community: { table: 'community_applications', refCol: 'community' },
};

const missingFunction = (code?: string) => code === 'PGRST202' || code === '42883';

/**
 * Has this email already registered for this event / training / community?
 * Case-insensitive. Uses the database function from
 * scripts/dashboard/03_registrations_access.sql, which lets the public check
 * without being able to read the registrations table. Falls back to a direct
 * query until that SQL is run.
 */
export async function isAlreadyRegistered(kind: Kind, ref: string, email: string): Promise<boolean> {
  const clean = email.trim().toLowerCase();
  const { data, error } = await supabase.rpc('is_already_registered', { p_kind: kind, p_ref: ref, p_email: clean });
  if (!error) return data === true;
  if (!missingFunction(error.code)) {
    console.warn('Duplicate check failed:', error.message);
    return false;
  }

  const { table, refCol } = TABLE[kind];
  const { data: rows } = await supabase.from(table).select('id').eq(refCol, ref).ilike('email', clean).limit(1);
  return !!rows && rows.length > 0;
}

/** Number of confirmed registrations for an event. */
export async function getEventRegistrationCount(eventId: string): Promise<number> {
  const { data, error } = await supabase.rpc('event_registration_count', { p_event_id: eventId });
  if (!error) return typeof data === 'number' ? data : 0;
  if (!missingFunction(error.code)) {
    console.warn('Could not load registration count:', error.message);
    return 0;
  }

  const { count } = await supabase
    .from('event_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('status', 'confirmed');
  return count ?? 0;
}
