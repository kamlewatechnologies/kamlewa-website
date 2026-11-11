'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Button from '@/components/Button';
import Input from '@/components/Input';
import CustomSelect from '@/components/Select';
import DatePicker from '@/components/DatePicker';
import CloudinaryUpload from '@/components/CloudinaryUpload';
import Image from 'next/image';
import { HiPlus, HiPencil, HiTrash, HiUsers, HiPhotograph } from 'react-icons/hi';
import { HiOutlineCalendarDateRange } from 'react-icons/hi2';
import { VscLocation } from 'react-icons/vsc';
import toast from 'react-hot-toast';
import DashboardModal from '@/components/DashboardModal';
import { getEvents, createEvent, updateEvent, deleteEvent } from '@/lib/supabase/events';
import { Database } from '@/lib/supabase/types';
import Loader from '@/components/Loader';
import { Link } from '@/i18n/routing';
import { useAccess } from '@/lib/access';

type Event = Database['public']['Tables']['events']['Row'];
type EventInsert = Database['public']['Tables']['events']['Insert'];
type EventUpdate = Database['public']['Tables']['events']['Update'];

type ExtendedEventData = Partial<EventInsert & {
  maxParticipants?: number;
  startTime?: string;
  endTime?: string;
  registrationOpen?: boolean;
  shareLink?: string;
}>;

const emptyForm: ExtendedEventData = {
  title: '', description: '', date: '', location: '', image: '',
  type: 'upcoming', participants: 0, feedback: undefined, hours: undefined,
  summary: '', maxParticipants: undefined, startTime: '', endTime: '',
  registrationOpen: true, shareLink: '',
  title_en: '', title_fr: '', description_en: '', description_fr: '',
  summary_en: '', summary_fr: '',
};

export default function EventsPage() {
  const { can } = useAccess();
  const t = useTranslations('dashboard');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<ExtendedEventData>(emptyForm);

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await getEvents();
      setEvents(data);
    } catch (error) {
      console.error('Error loading events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const typeOptions = [
    { value: 'featured', label: 'Featured' },
    { value: 'upcoming', label: 'Upcoming' },
  ];

  const handleOpenModal = (event?: Event) => {
    if (event) {
      setEditingEvent(event);
      let dateValue = '';
      if (event.date) {
        try {
          const parsed = new Date(event.date);
          if (!isNaN(parsed.getTime())) dateValue = parsed.toISOString().split('T')[0];
        } catch { dateValue = ''; }
      }
      setFormData({
        title: event.title, description: event.description, date: dateValue,
        location: event.location, image: event.image, type: event.type,
        participants: event.participants || 0, feedback: event.feedback || undefined,
        hours: event.hours || undefined, summary: event.summary || '',
        maxParticipants: (event as any).max_participants || undefined,
        startTime: (event as any).start_time ? new Date((event as any).start_time).toISOString().slice(0, 16) : '',
        endTime: (event as any).end_time ? new Date((event as any).end_time).toISOString().slice(0, 16) : '',
        registrationOpen: (event as any).registration_open !== false,
        shareLink: (event as any).share_link || '',
        title_en: event.title_en || '', title_fr: event.title_fr || '',
        description_en: event.description_en || '', description_fr: event.description_fr || '',
        summary_en: event.summary_en || '', summary_fr: event.summary_fr || '',
      });
    } else {
      setEditingEvent(null);
      setFormData(emptyForm);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const loadingToast = toast.loading(editingEvent ? 'Updating event...' : 'Creating event...');

    try {
      const eventDate = formData.date || new Date().toISOString().split('T')[0];
      const bilingualFields = {
        title_en: formData.title_en || null,
        title_fr: formData.title_fr || null,
        description_en: formData.description_en || null,
        description_fr: formData.description_fr || null,
        summary_en: formData.summary_en || null,
        summary_fr: formData.summary_fr || null,
      };

      if (editingEvent) {
        const updateData: EventUpdate & { max_participants?: number | null; start_time?: string | null; end_time?: string | null; registration_open?: boolean; share_link?: string | null } = {
          title: formData.title, description: formData.description, date: eventDate,
          location: formData.location, image: formData.image, type: formData.type,
          participants: formData.participants || 0, feedback: formData.feedback || null,
          hours: formData.hours || null, summary: formData.summary || null,
          max_participants: formData.maxParticipants || null,
          start_time: formData.startTime ? new Date(formData.startTime).toISOString() : null,
          end_time: formData.endTime ? new Date(formData.endTime).toISOString() : null,
          registration_open: formData.registrationOpen !== false,
          share_link: formData.shareLink || null,
          ...bilingualFields,
        };
        await updateEvent(editingEvent.id, updateData);
        toast.success('Event updated successfully', { id: loadingToast });
      } else {
        const insertData: EventInsert & { max_participants?: number | null; start_time?: string | null; end_time?: string | null; registration_open?: boolean; share_link?: string | null } = {
          title: formData.title!, description: formData.description!, date: eventDate,
          location: formData.location!, image: formData.image!, type: formData.type!,
          participants: formData.participants || 0, feedback: formData.feedback || null,
          hours: formData.hours || null, summary: formData.summary || null,
          max_participants: formData.maxParticipants || null,
          start_time: formData.startTime ? new Date(formData.startTime).toISOString() : null,
          end_time: formData.endTime ? new Date(formData.endTime).toISOString() : null,
          registration_open: formData.registrationOpen !== false,
          share_link: formData.shareLink || null,
          ...bilingualFields,
        };
        await createEvent(insertData);
        toast.success('Event created successfully', { id: loadingToast });
      }
      handleCloseModal();
      await loadEvents();
    } catch (error) {
      const err = error as { message?: string };
      console.error('Error saving event:', err);
      toast.error(`Failed to save: ${err?.message || 'Unknown error'}`, { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    const loadingToast = toast.loading('Deleting event...');
    try {
      await deleteEvent(id);
      toast.success('Event deleted successfully', { id: loadingToast });
      await loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event', { id: loadingToast });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-nourd), sans-serif' }}>{t('nav.events')}</h1>
          <p className="text-gray-400">Manage all events and engagements</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="flex items-center gap-2"><HiPlus className="w-5 h-5" />Add Event</Button>
      </div>

      {loading ? (
        <div className="text-center py-12"><p className="text-gray-400">Loading events...</p></div>
      ) : events.length === 0 ? (
        <div className="text-center py-12"><p className="text-gray-400">No events found. Create your first event!</p></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {events.map((event) => {
            const formattedDate = event.date ? new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : event.date;
            return (
              <div key={event.id} className="bg-white/5 border border-white/10 overflow-hidden flex min-h-60 group hover:border-white/20 transition-all">
                <div className="relative hidden sm:block w-48 min-h-60 shrink-0 bg-white/5 border-r-2 border-yellow-400/20 group-hover:border-yellow-400/40 transition-colors duration-300">
                  {event.image ? <Image src={event.image} alt={event.title} fill className="object-cover" unoptimized /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/10 to-white/5"><HiPhotograph className="w-12 h-12 text-white/30" /></div>}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex-1 flex flex-col p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <span className="px-3 py-1 text-xs uppercase tracking-wide bg-yellow-400/20 text-yellow-400 mb-2 inline-block">{event.type}</span>
                      <h3 className="text-xl font-bold mb-2">{event.title}</h3>
                      <p className="text-gray-300 text-sm line-clamp-2">{event.description}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button onClick={() => handleOpenModal(event)} className="text-yellow-400 hover:text-yellow-300 transition-colors p-2 hover:bg-white/10 rounded" aria-label="Edit event"><HiPencil className="w-5 h-5" /></button>
                      <button onClick={() => handleDelete(event.id)} className="text-red-400 hover:text-red-300 transition-colors p-2 hover:bg-white/10 rounded" aria-label="Delete event"><HiTrash className="w-5 h-5" /></button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm mt-auto">
                    <div className="flex items-center gap-2 text-blue-400"><HiOutlineCalendarDateRange className="w-4 h-4 text-yellow-400" /><span>{formattedDate}</span></div>
                    <div className="flex items-center gap-2 text-gray-400"><VscLocation className="w-4 h-4" /><span>{event.location}</span></div>
                    {event.participants !== undefined && event.participants > 0 && <div className="flex items-center gap-2 text-gray-400"><HiUsers className="w-4 h-4" /><span>{event.participants} participants</span></div>}
                    {event.feedback && <span className="text-xs text-green-400">{event.feedback}% feedback</span>}
                  </div>
                  {can('registrations') && (
                    <Link href={`/dashboard/registrations?tab=events&group=${event.id}`} className="mt-4 inline-flex items-center gap-2 self-start text-sm font-semibold text-yellow-400 hover:text-yellow-300">
                      <HiUsers className="w-4 h-4" /> View registrations
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DashboardModal isOpen={isModalOpen} onClose={handleCloseModal} title={editingEvent ? 'Edit Event' : 'Create New Event'}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-white/90 uppercase tracking-wide"><HiPhotograph className="inline w-4 h-4 mr-2 text-yellow-400" />Event Image</label>
            <CloudinaryUpload value={formData.image || ''} onChange={(url) => setFormData({ ...formData, image: url })} className="mt-2" />
            {formData.image && <p className="text-xs text-gray-400 mt-1">Image URL: {formData.image.substring(0, 50)}...</p>}
          </div>

          <div className="border-t border-white/10 pt-6 space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wide border-b border-white/10 pb-2">Basic Information</h3>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Title <span className="text-red-400">*</span></label>
                <Input value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required placeholder="e.g., Cybersecurity Awareness Workshop 2024" className="w-full bg-white/5 border-white/20 placeholder-gray-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Description <span className="text-red-400">*</span></label>
                <textarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 resize-none" rows={3} placeholder="Brief description..." required />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Event Type <span className="text-red-400">*</span></label>
                <CustomSelect options={typeOptions} value={typeOptions.find(opt => opt.value === formData.type) || null} onChange={(option) => setFormData({ ...formData, type: option?.value as 'featured' | 'upcoming' })} placeholderColor="#1a65e8" />
              </div>
            </div>

            {/* 🌍 Translations */}
            <div className="space-y-4 border-t border-white/10 pt-6">
              <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wide border-b border-white/10 pb-2">🌍 Translations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">🇬🇧 Title (English)</label>
                  <Input value={formData.title_en || ''} onChange={(e) => setFormData({ ...formData, title_en: e.target.value })} placeholder="English title" className="w-full bg-white/5 border-white/20 placeholder-gray-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">🇫🇷 Titre (Français)</label>
                  <Input value={formData.title_fr || ''} onChange={(e) => setFormData({ ...formData, title_fr: e.target.value })} placeholder="Titre en français" className="w-full bg-white/5 border-white/20 placeholder-gray-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">🇬🇧 Description (English)</label>
                <textarea value={formData.description_en || ''} onChange={(e) => setFormData({ ...formData, description_en: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 resize-none" rows={3} placeholder="Description in English..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">🇫🇷 Description (Français)</label>
                <textarea value={formData.description_fr || ''} onChange={(e) => setFormData({ ...formData, description_fr: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 resize-none" rows={3} placeholder="Description en français..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">🇬🇧 Summary (English)</label>
                <textarea value={formData.summary_en || ''} onChange={(e) => setFormData({ ...formData, summary_en: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 resize-none" rows={2} placeholder="Summary in English..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">🇫🇷 Résumé (Français)</label>
                <textarea value={formData.summary_fr || ''} onChange={(e) => setFormData({ ...formData, summary_fr: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 resize-none" rows={2} placeholder="Résumé en français..." />
              </div>
            </div>

            {/* Event Details */}
            <div className="space-y-4 border-t border-white/10 pt-6">
              <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wide border-b border-white/10 pb-2">Event Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <DatePicker label="Date" value={formData.date || ''} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Location <span className="text-red-400">*</span></label>
                  <Input value={formData.location || ''} onChange={(e) => setFormData({ ...formData, location: e.target.value })} required placeholder="e.g., Yaoundé, Cameroon" className="w-full bg-white/5 border-white/20 placeholder-gray-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Start Time</label>
                  <Input type="datetime-local" value={formData.startTime || ''} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className="w-full bg-white/5 border-white/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">End Time</label>
                  <Input type="datetime-local" value={formData.endTime || ''} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} className="w-full bg-white/5 border-white/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Max Participants</label>
                  <Input type="number" min="1" value={formData.maxParticipants || ''} onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value ? Number(e.target.value) : undefined })} placeholder="Leave empty for unlimited" className="w-full bg-white/5 border-white/20 placeholder-gray-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Registration Status</label>
                  <select title="event status" value={formData.registrationOpen ? 'open' : 'closed'} onChange={(e) => setFormData({ ...formData, registrationOpen: e.target.value === 'open' })} className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded text-white focus:outline-none focus:border-yellow-400/50">
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Share Link (Optional)</label>
                <Input type="url" value={formData.shareLink || ''} onChange={(e) => setFormData({ ...formData, shareLink: e.target.value })} placeholder="Custom share link" className="w-full bg-white/5 border-white/20 placeholder-gray-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Feedback %</label>
                  <Input type="number" min="0" max="100" value={formData.feedback || ''} onChange={(e) => setFormData({ ...formData, feedback: e.target.value ? Number(e.target.value) : undefined })} placeholder="0-100" className="w-full bg-white/5 border-white/20 placeholder-gray-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Hours</label>
                  <Input type="number" min="0" value={formData.hours || ''} onChange={(e) => setFormData({ ...formData, hours: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g., 40" className="w-full bg-white/5 border-white/20 placeholder-gray-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Summary</label>
                <textarea value={formData.summary || ''} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 resize-none" rows={4} placeholder="Detailed summary of the event..." />
              </div>
              <div className="bg-yellow-400/10 border border-yellow-400/30 p-4 rounded-lg">
                <p className="text-sm text-yellow-400"><strong>Note:</strong> Participant count will be automatically updated from website registrations.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-white/10">
            <Button type="button" variant="secondary" onClick={handleCloseModal} className="flex-1" disabled={submitting}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={submitting}>
              {submitting ? <span className="flex items-center justify-center gap-2"><Loader size={16} />{editingEvent ? 'Updating...' : 'Creating...'}</span> : editingEvent ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </form>
      </DashboardModal>
    </div>
  );
}