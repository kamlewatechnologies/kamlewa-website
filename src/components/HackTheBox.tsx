'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { HiX } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { createCommunityApplication } from '@/lib/supabase/submissions';
import toast from 'react-hot-toast';
import { validateEmail } from '@/lib/validateEmail';
import { isAlreadyRegistered } from '@/lib/supabase/registrationChecks';


const GOOGLE_SHEETS_URL = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_URL;

async function sendCommunityApplicationEmail(data: {
  name: string;
  email: string;
  phone: string;
  message: string;
  community: string;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/community-application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    return result.success === true;
  } catch {
    return false;
  }
}

export default function HackTheBoxPage() {
  const t = useTranslations('hackthebox');
  const tc = useTranslations('common');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });

  const focusAreas = [
    { title: t('focusTitle'), body: t('focusBody') },
    { title: t('activityTypesTitle'), body: t('activityTypesBody') },
    { title: t('partnerTitle'), body: t('partnerBody') },
  ];

  const stats = [
    { value: t('stat1Value'), label: t('stat1Label') },
    { value: t('stat2Value'), label: t('stat2Label') },
    { value: t('stat3Value'), label: t('stat3Label') },
  ];

  const keyActivities = [
    { title: t('act1Title'), body: t('act1Body') },
    { title: t('act2Title'), body: t('act2Body') },
    { title: t('act3Title'), body: t('act3Body') },
    { title: t('act4Title'), body: t('act4Body') },
    { title: t('act5Title'), body: t('act5Body') },
    { title: t('act6Title'), body: t('act6Body') },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);

  //Validate email
  const emailValid = await validateEmail(form.email);
  if (!emailValid) {
    toast.error('This email address does not appear to be valid. Please check and try again.');
    setIsSubmitting(false);
    return;
  }

  //  Check duplicate
  const existing = await isAlreadyRegistered('community', 'HackTheBox', form.email);

  if (existing) {
    toast.error('You have already applied to this community with this email.');
    setIsSubmitting(false);
    return;
  }

  //Send confirmation email
  const emailSent = await sendCommunityApplicationEmail({
    name: form.name,
    email: form.email,
    phone: form.phone,
    message: form.message,
    community: 'HackTheBox',
  });

  if (!emailSent) {
    toast.error('Could not send confirmation email. Please check your email address.');
    setIsSubmitting(false);
    return;
  }

  //Save to Supabase + Sheets 
  await Promise.allSettled([
    createCommunityApplication({
      community: 'HackTheBox',
      name: form.name,
      email: form.email,
      phone: form.phone,
      message: form.message,
    }),
    GOOGLE_SHEETS_URL
      ? fetch(GOOGLE_SHEETS_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheetName: 'Community Applications',
            community: 'HackTheBox', 
            name: form.name,
            email: form.email,
            phone: form.phone,
            message: form.message,
          }),
        })
      : Promise.resolve(),
  ]);

  setIsSubmitting(false);
  setIsModalOpen(false);
  setForm({ name: '', email: '', phone: '', message: '' });
  toast.success('Application submitted! Check your email for confirmation.');
};

  return (
    <section className="bg-black text-white overflow-hidden">
      {/* Join Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              className="relative bg-[#111] border border-white/10 w-full max-w-md p-8"
            >
              <button title="Close" onClick={() => {
              setIsModalOpen(false);
              setForm({ name: '', email: '', phone: '', message: '' });
               }} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                <HiX className="w-6 h-6" />
              </button>
              <p className="text-[#9fef00] text-sm font-semibold uppercase tracking-wider mb-1">{tc('join')}</p>
              <h2 className="text-2xl font-bold mb-1">{t('modalTitle')}</h2>
              <p className="text-gray-400 text-sm mb-6">{tc('fillDetails')}</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input required placeholder={tc('fullName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-[#9fef00] text-sm" />
                <input required type="email" placeholder={tc('emailAddress')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-[#9fef00] text-sm" />
                <input placeholder={tc('phoneOptional')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-[#9fef00] text-sm" />
                <textarea placeholder={tc('whyJoin')} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-[#9fef00] text-sm resize-none" />
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => {
                     setIsModalOpen(false);
                     setForm({ name: '', email: '', phone: '', message: '' });
                     }} className="flex-1 px-4 py-2 border border-white/20 text-white text-sm hover:bg-white/10 transition-colors">{tc('cancel')}</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-[#9fef00] text-black font-bold text-sm hover:bg-[#b8ff35] transition-colors disabled:opacity-50">
                    {isSubmitting ? tc('submitting') : tc('submit')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <div className="relative w-full min-h-[39rem] md:min-h-[46rem] overflow-hidden">
        <Image src="/images/partners/hackthebox.png" alt="HackTheBox" fill className="object-cover" unoptimized />
        <div className="absolute inset-0 bg-black/75" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(75,72,72,0.96)_0%,rgba(44,40,40,0.78)_45%,rgba(50,44,44,0.35)_100%)]" />
        <div className="relative z-10 mx-auto flex min-h-[39rem] md:min-h-[46rem] max-w-7xl items-center px-6 pt-48 pb-16 md:px-12 md:pt-56 md:pb-20 lg:px-16 lg:pt-60">
          <div className="max-w-3xl">
            <p className="text-[#9fef00] text-xs md:text-sm font-semibold uppercase tracking-wider mb-5">{tc('kamlewa')}</p>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05]">{t('heroTitle')}</h1>
            <p className="text-[#9fef00] font-semibold mt-8 text-lg md:text-xl">{t('heroTagline')}</p>
            <button type="button" onClick={() => setIsModalOpen(true)} className="md:hidden mt-6 w-full bg-[#9fef00] text-black font-bold px-8 py-3">{t('joinBtn')}</button>
            <p className="text-gray-200 text-base md:text-lg leading-8 mt-6 max-w-2xl hidden md:block">{t('heroDescription')}</p>
          </div>
        </div>
      </div>

      {/* Back link */}
      <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-16 pt-8">
        <Link href="/community" className="text-[#9fef00] text-sm font-semibold hover:text-[#b8ff35] transition-colors inline-flex items-center gap-2">
          <span aria-hidden="true">&larr;</span> {tc('backToCommunity')}
        </Link>
      </div>

      {/* Main Content */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)] gap-8 lg:gap-14 px-6 md:px-12 lg:px-16 py-12 md:py-20 items-start">
        <div className="flex flex-col space-y-8">
          <div className="bg-white text-black rounded-lg p-6 md:p-8 shadow-lg">
            <p className="text-[#5f9600] text-sm font-bold uppercase tracking-wider mb-2">{t('cardLabel')}</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-5 text-black">{t('cardTitle')}</h2>
            <div className="space-y-4 text-base leading-relaxed text-gray-800">
              <p>{t('cardP1')}</p>
              <p>{t('cardP2')}</p>
              <p>{t('cardP3')}</p>
            </div>
            <p className="text-base leading-relaxed text-gray-800 mt-5">
              {tc('officialWebsite')}:{' '}
              <a href="https://www.hackthebox.com" target="_blank" rel="noopener noreferrer" className="text-[#5f9600] font-semibold underline hover:text-black transition-colors">
                hackthebox.com &rarr;
              </a>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {focusAreas.map((item) => (
              <div key={item.title} className="border border-[#9fef00]/35 bg-[#9fef00]/5 p-5">
                <p className="text-[#9fef00] font-semibold uppercase tracking-wider text-xs mb-3">{item.title}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {stats.map((stat) => (
              <div key={stat.label} className="border border-white/10 p-5 bg-white/[0.03]">
                <p className="text-3xl font-black text-[#9fef00]">{stat.value}</p>
                <p className="text-gray-400 text-sm mt-2">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white/[0.03] border border-white/10 p-6 md:p-7">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[#9fef00] font-semibold uppercase tracking-wider">{tc('keyActivities')}</p>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-400">{t('activitiesSubtitle')}</p>
              </div>
              <motion.div aria-hidden="true" className="hidden h-1 w-24 bg-[#9fef00] sm:block" animate={{ scaleX: [0.35, 1, 0.35], opacity: [0.45, 1, 0.45] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {keyActivities.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.45, delay: index * 0.06, ease: 'easeOut' }}
                  whileHover={{ y: -5, borderColor: '#9fef00', backgroundColor: 'rgba(159, 239, 0, 0.1)' }}
                  className="group border border-white/10 bg-black/30 p-5 transition-colors"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <motion.span
                      className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#9fef00] text-sm font-black text-black"
                      animate={{ rotate: [0, 4, -4, 0] }}
                      transition={{ duration: 3, delay: index * 0.15, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </motion.span>
                    <p className="font-semibold text-white transition-colors group-hover:text-[#9fef00]">{item.title}</p>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-400">{item.body}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.button
            onClick={() => setIsModalOpen(true)}
            animate={{ x: [0, -5, 5, -5, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            whileHover={{ backgroundColor: '#ffffff', color: '#000000', x: 0 }}
            className="bg-[#9fef00] text-black font-bold px-8 py-3 w-full lg:w-auto"
          >
            {t('joinBtn')}
          </motion.button>
        </div>

        <div className="flex flex-col space-y-8">
          <div className="bg-[#9fef00]/10 border border-[#9fef00]/25 rounded-lg p-8 flex items-center justify-center shadow-2xl">
            <Image src="/images/partners/hackthebox.png" alt="HackTheBox Logo" width={300} height={300} className="mx-auto rounded-lg" unoptimized />
          </div>

          <div className="bg-white text-black p-6 rounded-lg">
            <p className="text-[#5f9600] font-semibold text-sm uppercase tracking-wider mb-2">{t('discordLabel')}</p>
            <h3 className="text-xl font-bold leading-snug mb-3">{t('discordTitle')}</h3>
            <p className="text-gray-800 text-sm leading-relaxed mb-5">{t('discordBody')}</p>
            <a href="https://discord.gg/jd7GbNJx" target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center bg-black px-5 py-3 text-sm font-bold text-[#9fef00] transition-colors hover:bg-[#1a1a1a] sm:w-auto">
              {tc('openDiscord')}
            </a>
          </div>

          <div className="bg-white/5 border border-white/10 p-6">
            <p className="text-[#9fef00] font-semibold text-sm uppercase tracking-wider mb-2">{tc('ourImpact')}</p>
            <p className="text-gray-300 text-sm leading-relaxed">{t('impactBody')}</p>
          </div>
        </div>
      </div>

      {/* Decorative Pattern */}
      <div className="bg-black px-6 md:px-16 pb-8">
        <div className="flex justify-center items-end gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-12 md:w-16 h-12 md:h-16 border-4 border-gray-700 rotate-45 mb-2" />
              <div className="w-10 md:w-14 h-10 md:h-14 bg-[#9fef00] rotate-45" />
            </div>
          ))}
        </div>
      </div>

      {/* Nav Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-white/10">
        <Link href="/community" className="p-6 hover:bg-white/5 transition-colors text-center border-r border-white/10">
          <p className="text-[#9fef00] font-semibold text-sm">&larr; {tc('backToCommunity')}</p>
        </Link>
        <Link href="/kamcyber" className="p-6 hover:bg-white/5 transition-colors text-center border-r border-white/10">
          <p className="text-[#9fef00] font-semibold text-sm">&larr; {t('navKamcyber')}</p>
        </Link>
        <Link href="/owasp" className="p-6 hover:bg-white/5 transition-colors text-center">
          <p className="text-[#9fef00] font-semibold text-sm">{t('navOwasp')} &rarr;</p>
        </Link>
      </div>
    </section>
  );
}