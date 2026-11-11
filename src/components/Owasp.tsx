'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { HiArrowRight, HiX } from 'react-icons/hi';
import { MdBugReport } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { createCommunityApplication } from '@/lib/supabase/submissions';
import { supabase } from '@/lib/supabase/supabaseClient';
import toast from 'react-hot-toast';
import { validateEmail } from '@/lib/validateEmail';

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

const OWASP_YELLOW = '#f7c600';

function ZigzagLine({ className = '' }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 260 28"
      fill="none"
      aria-hidden="true"
      className={className}
      initial={{ opacity: 0.25 }}
      animate={{ opacity: [0.25, 0.85, 0.25] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.path
        d="M2 14 L22 2 L42 26 L62 2 L82 26 L102 2 L122 26 L142 2 L162 26 L182 2 L202 26 L222 2 L242 26 L258 14"
        stroke={OWASP_YELLOW}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: [0, 1, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.svg>
  );
}

function FloatingBug({ className = '', delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.div
      aria-hidden="true"
      className={`absolute text-yellow-400/25 ${className}`}
      animate={{ y: [0, -14, 0], rotate: [0, 8, -8, 0], opacity: [0.18, 0.45, 0.18] }}
      transition={{ duration: 5, delay, repeat: Infinity, ease: 'easeInOut' }}
    >
      <MdBugReport className="h-12 w-12 md:h-16 md:w-16" />
    </motion.div>
  );
}

export default function OwaspPage() {
  const t = useTranslations('owasp');
  const tc = useTranslations('common');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });

  const infoCards = [
    { title: t('infoCard1Title'), body: t('infoCard1Body') },
    { title: t('infoCard2Title'), body: t('infoCard2Body') },
    { title: t('infoCard3Title'), body: t('infoCard3Body') },
  ];

  const activityItems = [
    t('act1'), t('act2'), t('act3'), t('act4'), t('act5'), t('act6'),
  ];

  const navigationLinks = [
    { href: '/community', label: tc('backToCommunity') },
    { href: '/kamcyber', label: t('navKamcyber') },
    { href: '/hackthebox', label: t('navHackthebox') },
  ];

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);

  // Validate email
  const emailValid = await validateEmail(form.email);
  if (!emailValid) {
    toast.error('This email address does not appear to be valid. Please check and try again.');
    setIsSubmitting(false);
    return;
  }

  // Check duplicate 
  const { data: existing } = await supabase
    .from('community_applications')
    .select('id')
    .eq('email', form.email)
    .eq('community', 'OWASP Buea') 
    .maybeSingle();

  if (existing) {
    toast.error('You have already applied to this community with this email.');
    setIsSubmitting(false);
    return;
  }

  // Send confirmation email
  const emailSent = await sendCommunityApplicationEmail({
    name: form.name,
    email: form.email,
    phone: form.phone,
    message: form.message,
    community: 'OWASP Buea', 
  });

  if (!emailSent) {
    toast.error('Could not send confirmation email. Please check your email address.');
    setIsSubmitting(false);
    return;
  }

  //  Save to Supabase + Sheets 
  await Promise.allSettled([
    createCommunityApplication({
      community: 'OWASP Buea', 
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
            community: 'OWASP Buea', // change per page
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
              <p className="text-yellow-400 text-sm font-semibold uppercase tracking-wider mb-1">{tc('join')}</p>
              <h2 className="text-2xl font-bold mb-1">{t('modalTitle')}</h2>
              <p className="text-gray-400 text-sm mb-6">{tc('fillDetails')}</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input required placeholder={tc('fullName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 text-sm" />
                <input required type="email" placeholder={tc('emailAddress')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 text-sm" />
                <input placeholder={tc('phoneOptional')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 text-sm" />
                <textarea placeholder={tc('whyJoin')} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 text-sm resize-none" />
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => {
                     setIsModalOpen(false);
                     setForm({ name: '', email: '', phone: '', message: '' });
                      }} className="flex-1 px-4 py-2 border border-white/20 text-white text-sm hover:bg-white hover:text-black transition-colors">{tc('cancel')}</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-yellow-400 text-black font-bold text-sm hover:bg-white transition-colors disabled:opacity-50">
                    {isSubmitting ? tc('submitting') : tc('submit')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <div className="relative min-h-[36rem] md:min-h-[42rem] overflow-hidden">
        <Image src="/images/partners/owasp_logo.png" alt="OWASP Buea" fill className="object-cover opacity-35" unoptimized />
        <div className="absolute inset-0 bg-black/85" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(100,100,100,0.97)_0%,rgba(71,71,71,0.84)_52%,rgba(62,61,61,0.42)_100%)]" />
        <Image src="/images/partners/owasp_logo.png" alt="" width={760} height={760} aria-hidden="true"
          className="absolute right-[-8rem] top-28 z-[1] h-[28rem] w-[28rem] object-contain opacity-[0.08] md:right-[-5rem] md:top-20 md:h-[38rem] md:w-[38rem] lg:right-[-2rem] lg:h-[44rem] lg:w-[44rem]"
          unoptimized />
        <FloatingBug className="right-[8%] top-[28%]" />
        <FloatingBug className="right-[22%] bottom-[18%]" delay={1.2} />
        <FloatingBug className="left-[48%] top-[18%] hidden lg:block" delay={2.1} />
        <div className="relative z-10 mx-auto flex min-h-[36rem] md:min-h-[42rem] max-w-7xl items-center px-6 pt-40 pb-16 md:px-12 md:pt-44 md:pb-20 lg:px-16 lg:pt-48">
          <motion.div className="max-w-3xl" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }}>
            <p className="text-yellow-400 text-xs md:text-sm font-semibold uppercase tracking-wider mb-5">{tc('kamlewa')}</p>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05]">{t('heroTitle')}</h1>
            <p className="text-yellow-400 font-semibold mt-8 text-lg md:text-xl">{t('heroTagline')}</p>
            <p className="text-gray-200 text-base md:text-lg leading-8 mt-6 max-w-2xl">{t('heroDescription')}</p>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)] gap-8 lg:gap-14 px-6 md:px-12 lg:px-16 py-12 md:py-20 items-start">
        <div className="flex flex-col space-y-8">
          <div className="bg-white text-black rounded-lg p-6 md:p-8 shadow-lg">
            <p className="text-[#8a7000] text-sm font-bold uppercase tracking-wider mb-2">{t('cardLabel')}</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-5 text-black">{t('cardTitle')}</h2>
            <div className="space-y-4 text-base leading-relaxed text-gray-800">
              <p>{t('cardP1')}</p>
              <p>{t('cardP2')}</p>
            </div>
            <p className="text-base leading-relaxed text-gray-800 mt-5">
              {tc('officialChapter')}:{' '}
              <a href="https://owasp.org/www-chapter-buea" target="_blank" rel="noopener noreferrer" className="text-[#8a7000] font-semibold underline hover:text-black transition-colors">
                owasp.org &rarr;
              </a>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {infoCards.map((item) => (
              <div key={item.title} className="border border-yellow-400/35 bg-yellow-400/5 p-5">
                <motion.p whileHover={{ color: '#ffffff', x: 6 }} className="w-fit cursor-default text-yellow-400 font-semibold uppercase tracking-wider text-xs mb-3 transition-colors">{item.title}</motion.p>
                <motion.p whileHover={{ color: '#ffffff', x: 6 }} className="cursor-default text-sm leading-relaxed text-gray-300">{item.body}</motion.p>
              </div>
            ))}
          </div>

          <div className="bg-white/[0.03] border border-white/10 p-6">
            <p className="text-yellow-400 font-semibold uppercase tracking-wider mb-5">{t('activitiesLabel')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activityItems.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <MdBugReport className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
                  <span className="text-gray-300 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <motion.button onClick={() => setIsModalOpen(true)} whileHover={{ backgroundColor: '#ffffff', color: '#000000', y: -2 }} whileTap={{ scale: 0.98 }} className="bg-yellow-400 text-black font-bold px-8 py-3 transition-colors w-full lg:w-auto">
            {t('joinBtn')}
          </motion.button>
        </div>

        <div className="flex flex-col space-y-8">
          <motion.div
            className="bg-yellow-400/10 border border-yellow-400/25 rounded-lg p-8 flex items-center justify-center shadow-2xl"
            animate={{ boxShadow: ['0 0 0 rgba(250,204,21,0)', '0 0 40px rgba(250,204,21,0.18)', '0 0 0 rgba(250,204,21,0)'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Image src="/images/partners/owasp_logo.png" alt="OWASP Buea Logo" width={300} height={300} className="mx-auto rounded-lg" unoptimized />
          </motion.div>

          <div className="bg-white text-black p-6 rounded-lg">
            <p className="text-[#8a7000] font-semibold text-sm uppercase tracking-wider mb-2">{t('sideCardLabel')}</p>
            <h3 className="text-xl font-bold leading-snug mb-3">{t('sideCardTitle')}</h3>
            <p className="text-gray-800 text-sm leading-relaxed">{t('sideCardBody')}</p>
          </div>

          <div className="bg-white/5 border border-white/10 p-6">
            <p className="text-yellow-400 font-semibold text-sm uppercase tracking-wider mb-2">{tc('ourImpact')}</p>
            <p className="text-gray-300 text-sm leading-relaxed">{t('impactBody')}</p>
          </div>
        </div>
      </div>

      {/* Decorative Pattern */}
      <div className="bg-black px-6 md:px-16 pb-10">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5">
          <div className="flex justify-center items-end gap-3">
            {[...Array(4)].map((_, i) => (
              <motion.div key={i} className="flex flex-col items-center" animate={{ y: [0, -8, 0] }} transition={{ duration: 2.4, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}>
                <div className="w-12 md:w-16 h-12 md:h-16 border-4 border-gray-700 rotate-45 mb-2" />
                <div className="w-10 md:w-14 h-10 md:h-14 bg-yellow-400 rotate-45" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Nav Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-white/10">
        {navigationLinks.map((item) => (
          <Link key={item.href} href={item.href} className="group p-6 text-center border-r border-white/10 last:border-r-0">
            <motion.span whileHover={{ color: '#ffffff', y: -2 }} className="mx-auto inline-flex flex-col items-center gap-2 text-yellow-400 font-semibold text-sm">
              <span className="inline-flex items-center gap-2">
                {item.label}
                <HiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
              <ZigzagLine className="h-4 w-32 opacity-70 transition-opacity group-hover:opacity-100" />
            </motion.span>
          </Link>
        ))}
      </div>
    </section>
  );
}