import { supabase } from './supabaseClient';
import { Database } from './types';

type Event = Database['public']['Tables']['events']['Row'];
type EventInsert = Database['public']['Tables']['events']['Insert'];
type EventUpdate = Database['public']['Tables']['events']['Update'];
type EventRegistration = Database['public']['Tables']['event_registrations']['Row'];
type EventRegistrationInsert = Database['public']['Tables']['event_registrations']['Insert'];

export async function getEvents(type?: 'featured' | 'upcoming') {
  let query = supabase
    .from('events')
    .select('*')
    .order('date', { ascending: false });

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as Event[];
}

export async function getEventById(id: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Event;
}

export async function createEvent(event: EventInsert) {
  const { data, error } = await supabase
    .from('events')
    .insert(event)
    .select()
    .single();

  if (error) throw error;
  return data as Event;
}

export async function updateEvent(id: string, event: EventUpdate) {
  const { data, error } = await supabase
    .from('events')
    .update(event)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Event;
}

export async function deleteEvent(id: string) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Event Registrations
const EXTRA_REGISTRATION_FIELDS = ['profession', 'sex', 'organization', 'city'] as const;

export async function registerForEvent(registration: EventRegistrationInsert) {
  const insert = (row: EventRegistrationInsert) =>
    supabase.from('event_registrations').insert(row).select().single();

  let { data, error } = await insert(registration);

  // If the profile columns haven't been added to the database yet
  // (scripts/add-event-registration-fields.sql), save the core registration
  // rather than turning the person away.
  if (error && (error.code === 'PGRST204' || error.code === '42703')) {
    console.warn('event_registrations is missing profile columns; run scripts/add-event-registration-fields.sql');
    const core = { ...registration };
    for (const field of EXTRA_REGISTRATION_FIELDS) delete core[field];
    ({ data, error } = await insert(core));
  }

  if (error) throw error;
  return data as EventRegistration;
}

export async function getEventRegistrations(eventId: string) {
  const { data, error } = await supabase
    .from('event_registrations')
    .select('*')
    .eq('event_id', eventId)
    .order('registered_at', { ascending: false });

  if (error) throw error;
  return data as EventRegistration[];
}

export async function updateRegistrationStatus(id: string, status: 'pending' | 'confirmed' | 'cancelled') {
  const { data, error } = await supabase
    .from('event_registrations')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as EventRegistration;
}

