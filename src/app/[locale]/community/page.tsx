'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageBanner from '@/components/PageBanner';
import Partners from '@/components/Partners';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Input from '@/components/Input';
import Button from '@/components/Button';
import CustomSelect from '@/components/Select';
import Image from 'next/image';
import { HiShieldCheck, HiUsers, HiCode, HiArrowRight } from 'react-icons/hi';
import { PiHandshake } from 'react-icons/pi';
import BackToHome from '@/components/BackToHome';
import { createVolunteerApplication, createPartnershipInquiry } from '@/lib/supabase/submissions';
import { validateEmail } from '@/lib/validateEmail';

const GOOGLE_SHEETS_URL = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_URL;

async function sendToSheets(payload: Record<string, string>) {
  if (!GOOGLE_SHEETS_URL) return;
  await fetch(GOOGLE_SHEETS_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

//send confirmation email via Resend API route
async function sendVolunteerEmail(data: {
  name: string;
  email: string;
  phone: string;
  expertise: string;
  availability: string;
  message: string;
}) : Promise<boolean> {
  try {
    const res = await fetch('/api/volunteer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    return result.success === true;
  } catch { return false; }
}

async function sendPartnershipEmail(data: {
  name: string;
  email: string;
  phone: string;
  organization: string;
  partnershipType: string;
  message: string;
}) : Promise<boolean> {
  try {
    const res = await fetch('/api/partnership', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    return result.success === true;
  } catch { return false; }
}

export default function CommunityPage() {
  const locale = useLocale();
  const t = useTranslations('community');
  const tPage = useTranslations('community.page');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  const communities = [
    {
      id: 'kamcyber',
      icon: HiShieldCheck,
      titleKey: 'communities.kamcyber.title',
      descriptionKey: 'communities.kamcyber.description',
      activitiesKey: 'communities.kamcyber.activities',
      imageSrc: '/images/partners/kamcyber.jpg',
    },
    {
      id: 'hackthebox',
      icon: HiCode,
      titleKey: 'communities.hackthebox.title',
      descriptionKey: 'communities.hackthebox.description',
      activitiesKey: 'communities.hackthebox.activities',
      imageSrc: '/images/lab.jpg',
    },
    {
      id: 'owasp',
      icon: HiUsers,
      titleKey: 'communities.owasp.title',
      descriptionKey: 'communities.owasp.description',
      activitiesKey: 'communities.owasp.activities',
      imageSrc: '/images/top 10.jpg',
    },
  ];

  // Volunteer form
  const [volunteerForm, setVolunteerForm] = useState({
    name: '', email: '', phone: '', expertise: '', availability: '', message: '',
  });
  const [isSubmittingVolunteer, setIsSubmittingVolunteer] = useState(false);

  // Partnership form
  const [partnershipForm, setPartnershipForm] = useState({
    name: '', email: '', phone: '', organization: '', partnershipType: '', message: '',
  });
  const [isSubmittingPartnership, setIsSubmittingPartnership] = useState(false);

  const expertiseOptions = [
    { value: 'cybersecurity', label: tPage('volunteering.form.expertiseOptions.cybersecurity') },
    { value: 'education', label: tPage('volunteering.form.expertiseOptions.education') },
    { value: 'software', label: tPage('volunteering.form.expertiseOptions.software') },
    { value: 'networking', label: tPage('volunteering.form.expertiseOptions.networking') },
    { value: 'project', label: tPage('volunteering.form.expertiseOptions.project') },
    { value: 'other', label: tPage('volunteering.form.expertiseOptions.other') },
  ];

  const availabilityOptions = [
    { value: 'full', label: tPage('volunteering.form.availabilityOptions.full') },
    { value: 'part', label: tPage('volunteering.form.availabilityOptions.part') },
    { value: 'weekends', label: tPage('volunteering.form.availabilityOptions.weekends') },
    { value: 'flexible', label: tPage('volunteering.form.availabilityOptions.flexible') },
  ];

  const partnershipTypeOptions = [
    { value: 'financial', label: tPage('partnerships.form.partnershipTypes.financial') },
    { value: 'technical', label: tPage('partnerships.form.partnershipTypes.technical') },
    { value: 'educational', label: tPage('partnerships.form.partnershipTypes.educational') },
    { value: 'government', label: tPage('partnerships.form.partnershipTypes.government') },
    { value: 'ngo', label: tPage('partnerships.form.partnershipTypes.ngo') },
    { value: 'other', label: tPage('partnerships.form.partnershipTypes.other') },
  ];
const handleVolunteerSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmittingVolunteer(true);
  const loadingToast = toast.loading(tPage('volunteering.form.submitting'));

  // ── Step 1: Validate email ──
  const emailValid = await validateEmail(volunteerForm.email);
  if (!emailValid) {
    toast.error('This email address does not appear to be valid. Please check and try again.', { id: loadingToast });
    setIsSubmittingVolunteer(false);
    return;
  }

  // ── Step 2: Send confirmation email ──
  const emailSent = await sendVolunteerEmail({
    name: volunteerForm.name,
    email: volunteerForm.email,
    phone: volunteerForm.phone,
    expertise: volunteerForm.expertise,
    availability: volunteerForm.availability,
    message: volunteerForm.message,
  });

  if (!emailSent) {
    toast.error('Could not send confirmation email. Please check your email address.', { id: loadingToast });
    setIsSubmittingVolunteer(false);
    return;
  }

  // ── Step 3: Save to Supabase + Sheets ──
  await Promise.allSettled([
    createVolunteerApplication({
      name: volunteerForm.name,
      email: volunteerForm.email,
      phone: volunteerForm.phone || undefined,
      expertise: volunteerForm.expertise || undefined,
      availability: volunteerForm.availability || undefined,
      message: volunteerForm.message,
    }),
    sendToSheets({
      sheetName: 'Volunteers',
      name: volunteerForm.name,
      email: volunteerForm.email,
      phone: volunteerForm.phone || 'N/A',
      expertise: volunteerForm.expertise || 'N/A',
      availability: volunteerForm.availability || 'N/A',
      message: volunteerForm.message,
    }),
  ]);

  toast.success('Application submitted! Check your email for confirmation.', { id: loadingToast });
  setVolunteerForm({ name: '', email: '', phone: '', expertise: '', availability: '', message: '' });
  setIsSubmittingVolunteer(false);
};

const handlePartnershipSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmittingPartnership(true);
  const loadingToast = toast.loading(tPage('partnerships.form.submitting'));

  // ── Step 1: Validate email ──
  const emailValid = await validateEmail(partnershipForm.email);
  if (!emailValid) {
    toast.error('This email address does not appear to be valid. Please check and try again.', { id: loadingToast });
    setIsSubmittingPartnership(false);
    return;
  }

  // ── Step 2: Send confirmation email ──
  const emailSent = await sendPartnershipEmail({
    name: partnershipForm.name,
    email: partnershipForm.email,
    phone: partnershipForm.phone,
    organization: partnershipForm.organization,
    partnershipType: partnershipForm.partnershipType,
    message: partnershipForm.message,
  });

  if (!emailSent) {
    toast.error('Could not send confirmation email. Please check your email address.', { id: loadingToast });
    setIsSubmittingPartnership(false);
    return;
  }

  // ── Step 3: Save to Supabase + Sheets ──
  await Promise.allSettled([
    createPartnershipInquiry({
      name: partnershipForm.name,
      email: partnershipForm.email,
      phone: partnershipForm.phone || undefined,
      organization: partnershipForm.organization,
      partnership_type: partnershipForm.partnershipType || undefined,
      message: partnershipForm.message,
    }),
    sendToSheets({
      sheetName: 'Partnerships',
      name: partnershipForm.name,
      email: partnershipForm.email,
      phone: partnershipForm.phone || 'N/A',
      organization: partnershipForm.organization,
      partnershipType: partnershipForm.partnershipType || 'N/A',
      message: partnershipForm.message,
    }),
  ]);

  toast.success('Inquiry submitted! Check your email for confirmation.', { id: loadingToast });
  setPartnershipForm({ name: '', email: '', phone: '', organization: '', partnershipType: '', message: '' });
  setIsSubmittingPartnership(false);
};

  return (
    <main className="relative">
      <PageBanner
        subheading={tPage('subheading')}
        heading={tPage('heading')}
        description={tPage('description')}
      />
      <BackToHome />

      {/* Our Communities Section */}
      <section className="bg-black text-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            <motion.div className="text-left mb-12 md:mb-16" variants={itemVariants}>
              <motion.p
                className="tagline text-yellow-400 text-sm md:text-base font-semibold mb-5 uppercase tracking-wider relative inline-block"
                variants={itemVariants}
              >
                {tPage('communities.subheading')}
                <span className="absolute bottom-0 left-0 w-1/2 h-0.5 bg-yellow-400" />
              </motion.p>
              <motion.h2
                className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
                variants={itemVariants}
                style={{ fontFamily: 'var(--font-nourd), sans-serif' }}
              >
                {tPage('communities.heading')}
              </motion.h2>
              <motion.p className="text-gray-300 text-base md:text-lg max-w-3xl" variants={itemVariants}>
                {tPage('communities.description')}
              </motion.p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
              {communities.map((community) => {
                const Icon = community.icon;
                const communityLinks: Record<string, string> = {
                  kamcyber: `/${locale}/kamcyber`,
                  hackthebox: `/${locale}/hackthebox`,
                  owasp: `/${locale}/owasp`,
                };
                return (
                  <motion.div
                    key={community.id}
                    className="bg-white/5 border border-white/10 overflow-hidden group hover:border-yellow-400/50 transition-all duration-300 flex flex-col h-full"
                    variants={itemVariants}
                  >
                    <div className="relative w-full h-48 overflow-hidden">
                      <Image
                        src={community.imageSrc}
                        alt={tPage(community.titleKey)}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                      />
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-nourd), sans-serif' }}>
                        {tPage(community.titleKey)}
                      </h3>
                      <p className="text-gray-300 text-sm leading-relaxed mb-4">
                        {tPage(community.descriptionKey)}
                      </p>
                      <p className="text-yellow-400 text-sm font-semibold mb-6">
                        {tPage(community.activitiesKey)}
                      </p>
                      <Link href={communityLinks[community.id]} className="mt-auto">
                        <button className="relative inline-flex items-center gap-2 text-yellow-400 font-semibold text-sm hover:text-yellow-300 transition-colors group/btn">
                          <span className="relative">
                            Learn More
                            <svg
                              className="absolute bottom-0 left-0 w-full h-1 text-yellow-400 opacity-0 group-hover/btn:opacity-100 transition-opacity"
                              viewBox="0 0 100 10"
                              preserveAspectRatio="none"
                              style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}
                            >
                              <path d="M 0 5 Q 10 0, 20 5 T 40 5 T 60 5 T 80 5 T 100 5" />
                            </svg>
                          </span>
                          <HiArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Volunteering Section */}
      <section id="volunteer" className="bg-[#1b1b1b] text-white py-16 md:py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start"
          >
            <motion.div variants={itemVariants}>
              <motion.p
                className="tagline text-yellow-400 text-sm md:text-base font-semibold mb-5 uppercase tracking-wider relative inline-block"
                variants={itemVariants}
              >
                {tPage('volunteering.subheading')}
                <span className="absolute bottom-0 left-0 w-1/2 h-0.5 bg-yellow-400" />
              </motion.p>
              <motion.h2
                className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
                variants={itemVariants}
                style={{ fontFamily: 'var(--font-nourd), sans-serif' }}
              >
                {tPage('volunteering.heading')}
              </motion.h2>
              <motion.p className="text-gray-300 text-base md:text-lg leading-relaxed" variants={itemVariants}>
                {tPage('volunteering.description')}
              </motion.p>
            </motion.div>

            <motion.div variants={itemVariants} className="relative">
              <div className="absolute inset-0 bg-white/15 translate-x-1 translate-y-1 md:translate-x-2 md:translate-y-2 lg:translate-x-3 lg:translate-y-3" />
              <div className="relative bg-white/5 border border-white/10 p-8">
                <form onSubmit={handleVolunteerSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      type="text"
                      placeholder={tPage('volunteering.form.name')}
                      value={volunteerForm.name}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, name: e.target.value })}
                      required
                      className="bg-white/10 border-white/30 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                    />
                    <Input
                      type="email"
                      placeholder={tPage('volunteering.form.email')}
                      value={volunteerForm.email}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, email: e.target.value })}
                      required
                      className="bg-white/10 border-white/30 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                    />
                    <Input
                      type="tel"
                      placeholder={tPage('volunteering.form.phone')}
                      value={volunteerForm.phone}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, phone: e.target.value })}
                      required
                      className="bg-white/10 border-white/30 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CustomSelect
                      options={expertiseOptions}
                      value={expertiseOptions.find(opt => opt.value === volunteerForm.expertise) || null}
                      onChange={(option) => setVolunteerForm({ ...volunteerForm, expertise: option?.value || '' })}
                      placeholder={tPage('volunteering.form.expertise')}
                      isSearchable
                      isClearable
                      variant="dark"
                      placeholderColor="#f3f4f6"
                    />
                    <CustomSelect
                      options={availabilityOptions}
                      value={availabilityOptions.find(opt => opt.value === volunteerForm.availability) || null}
                      onChange={(option) => setVolunteerForm({ ...volunteerForm, availability: option?.value || '' })}
                      placeholder={tPage('volunteering.form.availability')}
                      isSearchable
                      isClearable
                      variant="dark"
                      placeholderColor="#f3f4f6"
                    />
                  </div>
                  <textarea
                    placeholder={tPage('volunteering.form.message')}
                    value={volunteerForm.message}
                    onChange={(e) => setVolunteerForm({ ...volunteerForm, message: e.target.value })}
                    required
                    rows={4}
                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded text-white placeholder-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 resize-none"
                  />
                  <Button type="submit" variant="primary" disabled={isSubmittingVolunteer} className="w-full">
                    {isSubmittingVolunteer ? tPage('volunteering.form.submitting') : tPage('volunteering.form.submit')}
                  </Button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Strategic Partnerships Section */}
      <section id="partnerships" className="bg-black text-white py-16 md:py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            <motion.div className="text-left mb-12 md:mb-16" variants={itemVariants}>
              <motion.p
                className="tagline text-yellow-400 text-sm md:text-base font-semibold mb-5 uppercase tracking-wider relative inline-block"
                variants={itemVariants}
              >
                {tPage('partnerships.subheading')}
                <span className="absolute bottom-0 left-0 w-1/2 h-0.5 bg-yellow-400" />
              </motion.p>
              <motion.h2
                className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 flex items-center gap-4"
                variants={itemVariants}
                style={{ fontFamily: 'var(--font-nourd), sans-serif' }}
              >
                <PiHandshake className="w-8 h-8 md:w-10 md:h-10 text-yellow-400" />
                {tPage('partnerships.heading')}
              </motion.h2>
              <motion.p className="text-gray-300 text-base md:text-lg max-w-3xl" variants={itemVariants}>
                {tPage('partnerships.description')}
              </motion.p>
            </motion.div>

            <motion.div className="mb-12 md:mb-16" variants={itemVariants}>
              <Partners className="!px-0" />
            </motion.div>

            {/* Partnership Form */}
            <motion.div variants={itemVariants} className="relative">
              <div className="absolute inset-0 bg-white/15 translate-x-1 translate-y-1 md:translate-x-2 md:translate-y-2 lg:translate-x-3 lg:translate-y-3" />
              <div className="relative bg-white/5 border border-white/10 p-8">
                <h3 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-nourd), sans-serif' }}>
                  Partnership Inquiry
                </h3>
                <form onSubmit={handlePartnershipSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      type="text"
                      placeholder={tPage('partnerships.form.name')}
                      value={partnershipForm.name}
                      onChange={(e) => setPartnershipForm({ ...partnershipForm, name: e.target.value })}
                      required
                      className="bg-white/10 border-white/30 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                    />
                    <Input
                      type="email"
                      placeholder={tPage('partnerships.form.email')}
                      value={partnershipForm.email}
                      onChange={(e) => setPartnershipForm({ ...partnershipForm, email: e.target.value })}
                      required
                      className="bg-white/10 border-white/30 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                    />
                    <Input
                      type="tel"
                      placeholder={tPage('partnerships.form.phone')}
                      value={partnershipForm.phone}
                      onChange={(e) => setPartnershipForm({ ...partnershipForm, phone: e.target.value })}
                      required
                      className="bg-white/10 border-white/30 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      type="text"
                      placeholder={tPage('partnerships.form.organization')}
                      value={partnershipForm.organization}
                      onChange={(e) => setPartnershipForm({ ...partnershipForm, organization: e.target.value })}
                      required
                      className="bg-white/10 border-white/30 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                    />
                    <CustomSelect
                      options={partnershipTypeOptions}
                      value={partnershipTypeOptions.find(opt => opt.value === partnershipForm.partnershipType) || null}
                      onChange={(option) => setPartnershipForm({ ...partnershipForm, partnershipType: option?.value || '' })}
                      placeholder={tPage('partnerships.form.partnershipType')}
                      isSearchable
                      isClearable
                      variant="dark"
                      placeholderColor="#f3f4f6"
                    />
                  </div>
                  <textarea
                    placeholder={tPage('partnerships.form.message')}
                    value={partnershipForm.message}
                    onChange={(e) => setPartnershipForm({ ...partnershipForm, message: e.target.value })}
                    required
                    rows={4}
                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded text-white placeholder-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 resize-none"
                  />
                  <Button type="submit" variant="primary" disabled={isSubmittingPartnership} className="w-full">
                    {isSubmittingPartnership ? tPage('partnerships.form.submitting') : tPage('partnerships.form.submit')}
                  </Button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}