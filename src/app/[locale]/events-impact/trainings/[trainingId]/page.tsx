'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Footer from '@/components/Footer';
import PageBanner from '@/components/PageBanner';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  HiArrowLeft, HiShare, HiClock, HiAcademicCap,
  HiUser, HiCurrencyDollar, HiX,
} from 'react-icons/hi';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { Training } from '@/data/trainings';
import { getTrainingById } from '@/lib/supabase/trainings';
import { mapDbTrainingToTraining } from '@/utils/trainingMapper';
import { createTrainingRegistration } from '@/lib/supabase/submissions';
import Loader from '@/components/Loader';
import toast from 'react-hot-toast';
import { Link } from '@/i18n/routing';
import { validateEmail } from '@/lib/validateEmail';
import { isAlreadyRegistered } from '@/lib/supabase/registrationChecks';
const GOOGLE_SHEETS_URL = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_URL;

function usesFapshi(title: string): boolean {
  return (
    title.toLowerCase().includes('kamcyber') ||
    title === 'Holiday Tech Bootcamp'
  );
}

function getFapshiUrl(title: string): string {
  if (title.toLowerCase().includes('kamcyber')) return 'https://event.fapshi.com/5hut';
  if (title === 'Holiday Tech Bootcamp') return 'https://event.fapshi.com/1ecl';
  return '';
}

async function sendTrainingEnrollmentEmail(data: {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  message: string;
  trainingTitle: string;
  trainingLevel: string;
  trainingDuration?: string;
  trainingFormat?: string;
  trainingInstructor?: string;
  trainingPrice?: string;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/training-enrollment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    return result.success === true;
  } catch { return false; }
}
export default function TrainingDetailsPage() {
  const params = useParams();
  const t = useTranslations('eventsImpact');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    full_name: '', email: '', phone: '', location: '', message: '',
  });

  useEffect(() => {
    const loadTraining = async () => {
      try {
        setLoading(true);
        const dbTraining = await getTrainingById(params.trainingId as string);
        const mappedTraining = mapDbTrainingToTraining(dbTraining, locale);
        setTraining(mappedTraining);
      } catch (error) {
        console.error('Error loading training:', error);
        toast.error('Training not found');
        setTraining(null);
      } finally {
        setLoading(false);
      }
    };
    if (params.trainingId) loadTraining();
  }, [params.trainingId, locale]);

  const handleOpenModal = () => {
    setRegisterForm({ full_name: '', email: '', phone: '', location: '', message: '' });
    setIsModalOpen(true);
  };
  const handleCloseModal = () => setIsModalOpen(false);

const handleRegisterSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!training) return;
  setIsSubmitting(true);

  // Validate email
  const emailValid = await validateEmail(registerForm.email);
  if (!emailValid) {
    toast.error('This email address does not appear to be valid. Please check and try again.');
    setIsSubmitting(false);
    return;
  }

  // Check duplicate
  const existing = await isAlreadyRegistered('training', String(training.id), registerForm.email);

  if (existing) {
    toast.error('You have already registered for this training with this email.');
    setIsSubmitting(false);
    return;
  }

  //Send confirmation email
  const emailSent = await sendTrainingEnrollmentEmail({
    full_name: registerForm.full_name,
    email: registerForm.email,
    phone: registerForm.phone,
    location: registerForm.location,
    message: registerForm.message,
    trainingTitle: training.title,
    trainingLevel: training.level,
    trainingDuration: training.duration,
    trainingFormat: training.format,
    trainingInstructor: training.instructor,
    trainingPrice: training.price,
  });

  if (!emailSent) {
    toast.error('Could not send confirmation email. Please check your email address.');
    setIsSubmitting(false);
    return;
  }

  // Save to Supabase + Sheets
  const loadingToast = toast.loading('Submitting registration...');

  await Promise.allSettled([
    createTrainingRegistration({
      training_id: training.id,
      training_name: training.title,
      full_name: registerForm.full_name,
      email: registerForm.email,
      phone: registerForm.phone || undefined,
      location: registerForm.location || undefined,
      message: registerForm.message || undefined,
    }),
    GOOGLE_SHEETS_URL
      ? fetch(GOOGLE_SHEETS_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheetName: 'Training Registrations',
            trainingId: training.id,
            trainingName: training.title,
            fullName: registerForm.full_name,
            email: registerForm.email,
            phone: registerForm.phone || 'N/A',
            location: registerForm.location || 'N/A',
            message: registerForm.message || 'N/A',
          }),
        })
      : Promise.resolve(),
  ]);

  toast.success('Registration submitted! Check your email for confirmation.', { id: loadingToast });
  setIsModalOpen(false);
  setIsSubmitting(false);
  setRegisterForm({ full_name: '', email: '', phone: '', location: '', message: '' });
};

  const handleShare = async () => {
    if (!training) return;
    const shareUrl = `${window.location.origin}/events-impact/trainings/${training.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: training.title, text: training.description, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Link copied!');
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Link copied!');
      }
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'intermediate': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'advanced': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getFormatColor = (format?: string) => {
    switch (format) {
      case 'online': return 'bg-blue-500/20 text-blue-400';
      case 'in-person': return 'bg-purple-500/20 text-purple-400';
      case 'hybrid': return 'bg-indigo-500/20 text-indigo-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

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

  if (!training) {
    return (
      <>
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Training Not Found</h1>
            <Link href="/events-impact"><Button variant="primary">{tCommon('backToTrainings')}</Button></Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <main className="relative bg-black text-white">

        {/* Registration Modal — only shown for non-Fapshi trainings */}
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}
            >
              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="relative bg-[#111] border border-white/10 w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto"
              >
                <button onClick={handleCloseModal} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors" aria-label="Close">
                  <HiX className="w-6 h-6" />
                </button>
                <div className="mb-6">
                  <p className="text-yellow-400 text-sm font-semibold uppercase tracking-wider mb-1">Enroll Now</p>
                  <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-nourd), sans-serif' }}>{training.title}</h2>
                  <p className="text-gray-400 text-sm mt-1">Fill in your details and we will get back to you shortly.</p>
                </div>
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Training</label>
                    <input title="training title" type="text" value={training.title} readOnly className="w-full px-4 py-2 bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 font-semibold rounded cursor-not-allowed text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Full Name <span className="text-red-400">*</span></label>
                    <Input type="text" placeholder="Your full name" value={registerForm.full_name} onChange={(e) => setRegisterForm({ ...registerForm, full_name: e.target.value })} required className="bg-white/5 border-white/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Email <span className="text-red-400">*</span></label>
                    <Input type="email" placeholder="your.email@example.com" value={registerForm.email} onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })} required className="bg-white/5 border-white/20" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Phone</label>
                      <Input type="tel" placeholder="+237 6XX XXX XXX" value={registerForm.phone} onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })} className="bg-white/5 border-white/20" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Location</label>
                      <Input type="text" placeholder="City, Country" value={registerForm.location} onChange={(e) => setRegisterForm({ ...registerForm, location: e.target.value })} className="bg-white/5 border-white/20" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Message / Motivation (optional)</label>
                    <textarea placeholder="Tell us why you want to join this training..." value={registerForm.message} onChange={(e) => setRegisterForm({ ...registerForm, message: e.target.value })} rows={3} className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-colors text-sm resize-none" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={handleCloseModal} className="flex-1" disabled={isSubmitting}>Cancel</Button>
                    <Button type="submit" variant="primary" className="flex-1" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit Registration'}</Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <PageBanner subheading="Professional Training" heading={training.title} imageUrl={training.image} compactOnMobile />

        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 md:pt-8">
          <Link href="/events-impact" className="hidden md:inline-block">
            <Button variant="outline-white" className="mb-8"><HiArrowLeft className="w-5 h-5" />{tCommon('backToTrainings')}</Button>
          </Link>
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8 order-2 lg:order-1">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative h-64 md:h-96 overflow-hidden">
                <Image src={training.image} alt={training.title} fill className="object-cover" unoptimized />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap mb-4">
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getLevelColor(training.level)}`}>{training.level.charAt(0).toUpperCase() + training.level.slice(1)}</span>
                  {training.format && <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getFormatColor(training.format)}`}>{training.format.charAt(0).toUpperCase() + training.format.slice(1)}</span>}
                </div>
                <h2 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-nourd), sans-serif' }}>Training Overview</h2>
                <p className="text-gray-300 text-lg leading-relaxed">{training.description}</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/5 border border-white/10 p-6 space-y-4">
                <h3 className="text-xl font-bold mb-4">What You'll Learn</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3"><span className="text-yellow-400 mt-1">✓</span><span className="text-gray-300">Core concepts and fundamental principles</span></div>
                    <div className="flex items-start gap-3"><span className="text-yellow-400 mt-1">✓</span><span className="text-gray-300">Practical skills and hands-on techniques</span></div>
                    <div className="flex items-start gap-3"><span className="text-yellow-400 mt-1">✓</span><span className="text-gray-300">Industry best practices and standards</span></div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3"><span className="text-yellow-400 mt-1">✓</span><span className="text-gray-300">Real-world applications and case studies</span></div>
                    <div className="flex items-start gap-3"><span className="text-yellow-400 mt-1">✓</span><span className="text-gray-300">Problem-solving and critical thinking</span></div>
                    <div className="flex items-start gap-3"><span className="text-yellow-400 mt-1">✓</span><span className="text-gray-300">Certification preparation and assessment</span></div>
                  </div>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white/5 border border-white/10 p-6 space-y-4">
                <h3 className="text-xl font-bold mb-4">Training Curriculum</h3>
                <div className="space-y-4 text-gray-300">
                  <div><h4 className="text-white font-semibold mb-2">Module 1: Foundations</h4><p className="text-sm">Introduction to core concepts, terminology, and fundamental principles.</p></div>
                  <div><h4 className="text-white font-semibold mb-2">Module 2: Practical Application</h4><p className="text-sm">Hands-on exercises and practical projects designed to reinforce learning.</p></div>
                  <div><h4 className="text-white font-semibold mb-2">Module 3: Advanced Topics</h4><p className="text-sm">Deep dive into advanced concepts and expert-level techniques.</p></div>
                  <div><h4 className="text-white font-semibold mb-2">Module 4: Assessment & Certification</h4><p className="text-sm">Final assessment, project evaluation, and certification process.</p></div>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-yellow-400/10 border border-yellow-400/20 p-6 space-y-4">
                <h3 className="text-xl font-bold mb-4 text-yellow-400">Prerequisites</h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-start gap-3"><span className="text-yellow-400 mt-1">•</span><span>Basic understanding of technology concepts (for intermediate/advanced levels)</span></li>
                  <li className="flex items-start gap-3"><span className="text-yellow-400 mt-1">•</span><span>Access to required software and tools (will be provided for online sessions)</span></li>
                  <li className="flex items-start gap-3"><span className="text-yellow-400 mt-1">•</span><span>Commitment to complete all modules and assessments</span></li>
                  <li className="flex items-start gap-3"><span className="text-yellow-400 mt-1">•</span><span>No prior experience required for beginner-level trainings</span></li>
                </ul>
              </motion.div>
            </div>

            <div className="lg:col-span-1 order-1 lg:order-2">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:sticky lg:top-24 space-y-6">
                <div className="bg-white/5 border border-white/10 p-6 space-y-6">
                  <h3 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-nourd), sans-serif' }}>Training Details</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Level</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${getLevelColor(training.level)}`}>{training.level.charAt(0).toUpperCase() + training.level.slice(1)}</span>
                    </div>
                    {training.duration && <div className="flex items-start gap-3"><HiClock className="w-5 h-5 text-yellow-400 mt-1 shrink-0" /><div><p className="text-sm text-gray-400">Duration</p><p className="text-white font-semibold">{training.duration}</p></div></div>}
                    {training.format && <div className="flex items-start gap-3"><HiAcademicCap className="w-5 h-5 text-yellow-400 mt-1 shrink-0" /><div><p className="text-sm text-gray-400">Format</p><p className="text-white font-semibold capitalize">{training.format}</p></div></div>}
                    {training.instructor && <div className="flex items-start gap-3"><HiUser className="w-5 h-5 text-yellow-400 mt-1 shrink-0" /><div><p className="text-sm text-gray-400">Instructor</p><p className="text-white font-semibold">{training.instructor}</p></div></div>}
                    {training.price && <div className="flex items-start gap-3"><HiCurrencyDollar className="w-5 h-5 text-yellow-400 mt-1 shrink-0" /><div><p className="text-sm text-gray-400">Price</p><p className="text-white font-semibold">{training.price}</p></div></div>}
                  </div>
                  <div className="space-y-3 pt-4 border-t border-white/10">
                    {usesFapshi(training.title) ? (
                      <a href={getFapshiUrl(training.title)} target="_blank" rel="noopener noreferrer">
                        <Button variant="primary" className="w-full">Enroll Now</Button>
                      </a>
                    ) : (
                      <Button variant="primary" className="w-full" onClick={handleOpenModal}>Enroll Now</Button>
                    )}
                    <Button variant="outline-yellow" onClick={handleShare} className="w-full">
                      <HiShare className="w-5 h-5" />{copied ? 'Link Copied!' : 'Share Training'}
                    </Button>
                  </div>
                </div>
                <div className="bg-yellow-400/10 border border-yellow-400/20 p-6">
                  <h4 className="text-lg font-bold mb-3 text-yellow-400">Training Benefits</h4>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li className="flex items-start gap-2"><span className="text-yellow-400 mt-1">•</span><span>Industry-recognized certification</span></li>
                    <li className="flex items-start gap-2"><span className="text-yellow-400 mt-1">•</span><span>Expert instruction and mentorship</span></li>
                    <li className="flex items-start gap-2"><span className="text-yellow-400 mt-1">•</span><span>Hands-on practical experience</span></li>
                    <li className="flex items-start gap-2"><span className="text-yellow-400 mt-1">•</span><span>Career advancement opportunities</span></li>
                  </ul>
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