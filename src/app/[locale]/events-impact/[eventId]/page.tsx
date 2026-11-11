'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Footer from '@/components/Footer';
import PageBanner from '@/components/PageBanner';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { HiArrowLeft, HiShare, HiCalendar, HiClock } from 'react-icons/hi';
import { HiOutlineCalendarDateRange } from 'react-icons/hi2';
import { VscLocation } from 'react-icons/vsc';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { Event } from '@/data/events';
import { downloadICS, getGoogleCalendarUrl, getOutlookCalendarUrl } from '@/utils/calendar';
import toast from 'react-hot-toast';
import { Link } from '@/i18n/routing';
import { mapDbEventToEvent, mapDbRegistrationToParticipant } from '@/utils/eventMapper';
import { getEventById, getEventRegistrations, registerForEvent } from '@/lib/supabase/events';
import Loader from '@/components/Loader';
import { supabase } from '@/lib/supabase/supabaseClient';
import { validateEmail } from '@/lib/validateEmail';

async function sendEventRegistrationEmail(data: {
  name: string;
  email: string;
  phone: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  eventTime?: string;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/event-registration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    return result.success === true;
  } catch { return false; }
}


export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('events');
  const tPage = useTranslations('eventsImpact');
  const locale = useLocale();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', profession: '', sex: '', organization: '', city: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadEvent = async (eventId: string) => {
      try {
        setLoading(true);
        const dbEvent = await getEventById(eventId);
        const mappedEvent = mapDbEventToEvent(dbEvent, locale);

        try {
          const registrations = await getEventRegistrations(dbEvent.id);
          mappedEvent.registeredParticipants = registrations
            .filter(reg => reg.status === 'confirmed')
            .map(mapDbRegistrationToParticipant);
        } catch (error) {
          console.error('Error loading registrations:', error instanceof Error ? error.message : JSON.stringify(error, Object.getOwnPropertyNames(error)));
          mappedEvent.registeredParticipants = [];
        }

        setEvent(mappedEvent);
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : error && typeof error === 'object'
            ? JSON.stringify(error, Object.getOwnPropertyNames(error))
            : String(error);
        console.error('Error loading event:', errorMessage, { eventId: params.eventId });
        toast.error('Event not found');
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    const eventId = typeof params.eventId === 'string' ? params.eventId : undefined;
    if (eventId) loadEvent(eventId);
    else setLoading(false);
  }, [params.eventId, locale]);

  if (loading) {
    return (
      <>
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <Loader />
        </div>
        <Footer />
      </>
    );
  }

  if (!event) {
    return (
      <>
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
            <Link href="/events-impact"><Button variant="primary">Back to Events</Button></Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const registeredCount = event.registeredParticipants?.length || 0;
  const isFull = event.maxParticipants ? registeredCount >= event.maxParticipants : false;
  const spotsLeft = event.maxParticipants ? event.maxParticipants - registeredCount : null;

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (isFull) { toast.error(t('registration.full')); return; }
  if (!event) return;
  setIsSubmitting(true);

  const email = formData.email.trim();
  if (!formData.sex) {
    toast.error(t('form.sex'));
    setIsSubmitting(false);
    return;
  }

  //Validate email
  const emailValid = await validateEmail(email);
  if (!emailValid) {
    toast.error('This email address does not appear to be valid. Please check and try again.');
    setIsSubmitting(false);
    return;
  }

  //Check duplicate
  const { data: existing } = await supabase
    .from('event_registrations')
    .select('id')
    .eq('email', email)
    .eq('event_id', event.id)
    .maybeSingle();

  if (existing) {
    toast.error('You have already registered for this event with this email.');
    setIsSubmitting(false);
    return;
  }

  //Send confirmation email
  const eventTime = event.startTime
    ? `${new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${event.endTime ? ` - ${new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`
    : undefined;

  const emailSent = await sendEventRegistrationEmail({
    name: formData.name.trim(),
    email,
    phone: formData.phone,
    eventTitle: event.title,
    eventDate: event.date,
    eventLocation: event.location,
    eventTime,
  });

  if (!emailSent) {
    toast.error('Could not send confirmation email. Please check your email address.');
    setIsSubmitting(false);
    return;
  }

  //Register to Supabase
  try {
    const registration = await registerForEvent({
      event_id: event.id,
      name: formData.name.trim(),
      email,
      phone: formData.phone || null,
      profession: formData.profession.trim() || null,
      sex: formData.sex || null,
      organization: formData.organization.trim() || null,
      city: formData.city.trim() || null,
      status: 'confirmed',
    });
    const newParticipant = mapDbRegistrationToParticipant(registration);
    setEvent({
      ...event,
      registeredParticipants: [...(event.registeredParticipants || []), newParticipant],
    });
    toast.success('Registration confirmed! Check your email.');
    setFormData({ name: '', email: '', phone: '', profession: '', sex: '', organization: '', city: '' });
  } catch (error) {
    console.error('Registration error:', error);
    toast.error(t('registration.error'));
  } finally {
    setIsSubmitting(false);
  }
};

  const handleShare = async () => {
    const shareUrl = event.shareLink || `${window.location.origin}/events-impact/${event.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, text: event.description, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success(t('share.copied'));
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success(t('share.copied'));
      }
    }
  };

  const handleAddToCalendar = (provider: 'google' | 'outlook' | 'ics') => {
    if (!event.startTime || !event.endTime) { toast.error(t('calendar.noTime')); return; }
    const calendarEvent = {
      title: event.title,
      description: event.description,
      location: event.location,
      startTime: event.startTime,
      endTime: event.endTime,
      url: event.shareLink || window.location.href,
    };
    switch (provider) {
      case 'google': window.open(getGoogleCalendarUrl(calendarEvent), '_blank'); break;
      case 'outlook': window.open(getOutlookCalendarUrl(calendarEvent), '_blank'); break;
      case 'ics': downloadICS(calendarEvent); toast.success(t('calendar.downloaded')); break;
    }
  };

  return (
    <>
      <main className="bg-black text-white">
        <PageBanner
          subheading={tPage('subheading')}
          heading={event.title}
          description={event.description}
          imageUrl={event.image}
        />

        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 pt-8">
          <Link href="/events-impact">
            <Button variant="outline-white" className="mb-8"><HiArrowLeft className="w-5 h-5" />Back to Events</Button>
          </Link>
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative h-64 md:h-96 overflow-hidden">
                <Image src={event.image} alt={event.title} fill className="object-cover" unoptimized />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
                <h2 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-nourd), sans-serif' }}>About This Event</h2>
                <p className="text-gray-300 text-lg leading-relaxed">{event.summary || event.description}</p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/5 border border-white/10 p-6 space-y-6 text-white">
                <h3 className="text-xl font-bold mb-4">Event Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3"><HiOutlineCalendarDateRange className="w-5 h-5 text-yellow-400" /><span>{event.date}</span></div>
                  <div className="flex items-center gap-3"><VscLocation className="w-5 h-5 text-yellow-400" /><span>{event.location}</span></div>
                  {event.startTime && (
                    <div className="flex items-center gap-3">
                      <HiClock className="w-5 h-5 text-yellow-400" />
                      <span>
                        {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {event.endTime && ` - ${new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            <div className="lg:col-span-1">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="sticky top-24 space-y-6">
                <div className="bg-white/5 border border-white/10 p-6 space-y-6 text-white">
                  <div>
                    <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-nourd), sans-serif' }}>Register Now</h3>
                    {event.maxParticipants && (
                      <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-2">
                        <span className="text-sm text-gray-400">{registeredCount} / {event.maxParticipants} registered</span>
                        {spotsLeft !== null && (
                          <span className={`text-sm font-semibold ${isFull ? 'text-red-400' : 'text-yellow-400'}`}>
                            {isFull ? t('full') : `${spotsLeft} ${t('spotsAvailable')}`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {event.registrationOpen !== false && !isFull ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <Input type="text" placeholder={t('form.name')} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full bg-white/5 border-white/20" />
                      <Input type="email" placeholder={t('form.email')} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="w-full bg-white/5 border-white/20" />
                      <Input type="tel" placeholder={t('form.phone')} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required className="w-full bg-white/5 border-white/20" />
                      <Input type="text" placeholder={t('form.profession')} value={formData.profession} onChange={(e) => setFormData({ ...formData, profession: e.target.value })} required className="w-full bg-white/5 border-white/20" />
                      <select
                        aria-label={t('form.sex')}
                        value={formData.sex}
                        onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                        required
                        className={`w-full px-4 py-2 bg-white/5 border border-white/20 focus:outline-none focus:border-yellow-400 transition-colors text-sm ${formData.sex ? 'text-white' : 'text-gray-500'}`}
                      >
                        <option value="" disabled className="bg-black">{t('form.sex')}</option>
                        <option value="male" className="bg-black text-white">{t('form.sexOptions.male')}</option>
                        <option value="female" className="bg-black text-white">{t('form.sexOptions.female')}</option>
                        <option value="prefer_not_to_say" className="bg-black text-white">{t('form.sexOptions.preferNot')}</option>
                      </select>
                      <Input type="text" placeholder={t('form.organization')} value={formData.organization} onChange={(e) => setFormData({ ...formData, organization: e.target.value })} className="w-full bg-white/5 border-white/20" />
                      <Input type="text" placeholder={t('form.city')} value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full bg-white/5 border-white/20" />
                      <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">
                        {isSubmitting ? t('form.submitting') : t('form.submit')}
                      </Button>
                    </form>
                  ) : (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded text-center">
                      <p className="text-red-400 font-semibold">{isFull ? t('registration.full') : t('registration.closed')}</p>
                    </div>
                  )}

                  <div className="space-y-3 pt-4 border-t border-white/10">
                    <Button variant="outline-yellow" onClick={handleShare} className="w-full">
                      <HiShare className="w-5 h-5" />{copied ? t('share.copied') : t('share.button')}
                    </Button>
                    {event.startTime && event.endTime && (
                      <div className="relative group">
                        <Button variant="outline-yellow" className="w-full relative z-20">
                          <HiCalendar className="w-5 h-5 text-yellow-400" />{t('calendar.add')}
                        </Button>
                        <div className="absolute top-full left-0 right-0 mt-4 bg-black border border-white/20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                          <button onClick={() => handleAddToCalendar('google')} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors">Google Calendar</button>
                          <button onClick={() => handleAddToCalendar('outlook')} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors">Outlook Calendar</button>
                          <button onClick={() => handleAddToCalendar('ics')} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors">Download .ics</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Office Info Card */}
                <div className="bg-white/5 border border-white/10 p-6">
                  <h4 className="text-lg font-bold mb-3 text-yellow-400">Need More Information?</h4>
                  <p className="text-gray-300 text-sm mb-3 leading-relaxed">
                    Feel free to visit us in person or get in touch — we'd love to help.
                  </p>
                  <div className="flex items-start gap-2 text-gray-300 text-sm">
                    <VscLocation className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                    <span>Douala, Bonaberi — Derrière Immeuble Kottobass</span>
                  </div>
                  <div className="mt-4">
                    <Link href="/contact">
                      <Button variant="outline-yellow" className="w-full">Contact Us</Button>
                    </Link>
                  </div>
                </div>

              </motion.div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}