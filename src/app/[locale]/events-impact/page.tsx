'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import PageBanner from '@/components/PageBanner';
import Pagination from '@/components/Pagination';
import BackToHome from '@/components/BackToHome';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { HiClock, HiUsers, HiArrowRight, HiSearch, HiX, HiDownload } from 'react-icons/hi';
import { Link } from '@/i18n/routing';
import Input from '@/components/Input';
import { MdOutlineFeaturedPlayList, MdOutlineSwipe } from 'react-icons/md';
import { HiOutlineClipboardDocumentList } from 'react-icons/hi2';
import { FaFirstdraft } from 'react-icons/fa6';
import { HiOutlineCalendarDateRange } from 'react-icons/hi2';
import { PiGraduationCapBold } from 'react-icons/pi';
import { VscLocation } from 'react-icons/vsc';
import { PiClockCountdownFill } from 'react-icons/pi';
import { Event } from '@/data/events';
import { Project } from '@/data/projects';
import { Training } from '@/data/trainings';
import { Program } from '@/data/programs';
import { getEvents } from '@/lib/supabase/events';
import { getProjects } from '@/lib/supabase/projects';
import { getPrograms } from '@/lib/supabase/programs';
import { getTrainings } from '@/lib/supabase/trainings';
import { getReports } from '@/lib/supabase/reports';
import { mapDbEventToEvent } from '@/utils/eventMapper';
import { mapDbProjectToProject } from '@/utils/projectMapper';
import { mapDbProgramToProgram } from '@/utils/programMapper';
import { mapDbTrainingToTraining } from '@/utils/trainingMapper';
import toast from 'react-hot-toast';
import Loader from '@/components/Loader';
import { Report, mergeStaticReports } from '@/data/staticReports';

type TabType = 'programs' | 'featured' | 'upcoming' | 'projects' | 'trainings' | 'reports';
type CardItem = Event | Project | Training | Program | Report;

type SecureByDesignItem = {
  image: string;
  title: string;
  brief: string;
};

const isReportItem = (item: CardItem): item is Report =>
  'start_year' in item && 'end_year' in item;

const ITEMS_PER_PAGE = 6;

const getReportPdfUrl = (report: Report) =>
  report.pdf_url || `/reports/${report.start_year}-${report.end_year}-report.pdf`;

const secureByDesignItems: SecureByDesignItem[] = [
  {
    image: '/images/KAMLEWA - THE SECURE BY DESIGN MOVEMENT/1.png',
    title: 'Secure by Design Movement',
    brief: 'A community-centered movement helping young people understand that security should be planned from the beginning, not added after harm is done.',
  },
  {
    image: '/images/KAMLEWA - THE SECURE BY DESIGN MOVEMENT/2.png',
    title: 'Cyber Safety First',
    brief: 'We introduce practical cyber safety habits that help students, creators, and communities protect their digital identity and online spaces.',
  },
  {
    image: '/images/KAMLEWA - THE SECURE BY DESIGN MOVEMENT/3.png',
    title: 'Building Awareness',
    brief: 'The movement uses visual storytelling, workshops, and outreach to make secure technology choices easier to understand and apply.',
  },
  {
    image: '/images/KAMLEWA - THE SECURE BY DESIGN MOVEMENT/4.png',
    title: 'Designing With Responsibility',
    brief: 'Participants learn to think about privacy, trust, safety, and user protection while designing digital products and services.',
  },
  {
    image: '/images/KAMLEWA - THE SECURE BY DESIGN MOVEMENT/5.png',
    title: 'Community Conversations',
    brief: 'We create room for open conversations about cyber risks, responsible technology use, and the choices that make online communities safer.',
  },
  {
    image: '/images/KAMLEWA - THE SECURE BY DESIGN MOVEMENT/6.png',
    title: 'Youth-Led Security Culture',
    brief: 'Young people are encouraged to become champions of secure behavior in schools, homes, startups, and local technology communities.',
  },
  {
    image: '/images/KAMLEWA - THE SECURE BY DESIGN MOVEMENT/7.png',
    title: 'Practical Digital Protection',
    brief: 'The program connects security principles with daily actions like stronger authentication, safer sharing, device hygiene, and scam awareness.',
  },
  {
    image: '/images/KAMLEWA - THE SECURE BY DESIGN MOVEMENT/8.png',
    title: 'Inclusive Technology Safety',
    brief: 'Secure by design also means making safety knowledge accessible to communities that are often left out of technical conversations.',
  },
  {
    image: '/images/KAMLEWA - THE SECURE BY DESIGN MOVEMENT/9.png',
    title: 'From Awareness to Action',
    brief: 'Beyond learning concepts, participants are guided to apply secure thinking in real projects, online behavior, and community initiatives.',
  },
  {
    image: '/images/KAMLEWA - THE SECURE BY DESIGN MOVEMENT/10.png',
    title: 'Safer Digital Products',
    brief: 'We promote product thinking where developers and entrepreneurs consider user safety, abuse prevention, and data protection from day one.',
  },
  {
    image: '/images/KAMLEWA - THE SECURE BY DESIGN MOVEMENT/11.png',
    title: 'Shared Responsibility',
    brief: 'Security belongs to everyone: learners, builders, leaders, families, and institutions all have a role in building safer digital spaces.',
  },
  {
    image: '/images/KAMLEWA - THE SECURE BY DESIGN MOVEMENT/12.png',
    title: 'Trust Through Education',
    brief: 'The movement strengthens digital trust by giving people the confidence to recognize risks and make informed security decisions.',
  },
  {
    image: '/images/KAMLEWA - THE SECURE BY DESIGN MOVEMENT/13.png',
    title: 'A Safer Digital Future',
    brief: 'KAMLEWA uses this movement to inspire safer innovation and a future where communities feel protected, empowered, and connected online.',
  },
];

export default function EventsImpactPage() {
  const t = useTranslations('eventsImpact');
  const tPrograms = useTranslations('programs');
  const tEvents = useTranslations('featuredEvents');
  const tEventModal = useTranslations('events');

  // ✅ Get current locale for bilingual content
  const locale = useLocale();

  const [activeTab, setActiveTab] = useState<TabType>('programs');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [events, setEvents] = useState<Event[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const sectionsRef = useRef<{ [key: string]: HTMLElement | null }>({});

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  // ✅ Load all data — re-runs when locale changes so translations update
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        try {
          const dbEvents = await getEvents();
          // ✅ Pass locale to mapper
          setEvents(dbEvents.map((e) => mapDbEventToEvent(e, locale)));
        } catch (e) {
          console.error('Error loading events:', e);
          setEvents([]);
        }

        try {
          const dbPrograms = await getPrograms();
          // ✅ Pass locale to mapper
          setPrograms(dbPrograms.map((p) => mapDbProgramToProgram(p, locale)));
        } catch (e) {
          console.error('Error loading programs:', e);
          setPrograms([]);
        }

        try {
          const dbProjects = await getProjects();
          // ✅ Pass locale to mapper
          setProjects(dbProjects.map((p) => mapDbProjectToProject(p, locale)));
        } catch (e) {
          console.error('Error loading projects:', e);
          setProjects([]);
        }

        try {
          const dbTrainings = await getTrainings();
          // ✅ Pass locale to mapper
          setTrainings(dbTrainings.map((tr) => mapDbTrainingToTraining(tr, locale)));
        } catch (e) {
          console.error('Error loading trainings:', e);
          setTrainings([]);
        }

        try {
          const dbReports = await getReports();
          setReports(mergeStaticReports(dbReports));
        } catch (e) {
          console.error('Error loading reports:', e);
          setReports(mergeStaticReports([]));
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [locale]); // ✅ Re-fetch when locale changes

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSeenHint = localStorage.getItem('hasSeenSwipeHint');
      if (!hasSeenHint) {
        const timer = setTimeout(() => setShowSwipeHint(true), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const tabs = [
    { id: 'programs' as const, label: tPrograms('tabs.programs'), icon: FaFirstdraft },
    { id: 'featured' as const, label: tEvents('tabs.featured'), icon: MdOutlineFeaturedPlayList },
    { id: 'upcoming' as const, label: tEvents('tabs.upcoming'), icon: HiOutlineCalendarDateRange },
    { id: 'projects' as const, label: tEvents('tabs.projects'), icon: HiOutlineClipboardDocumentList },
    { id: 'trainings' as const, label: tEvents('tabs.trainings'), icon: PiGraduationCapBold },
    { id: 'reports' as const, label: t('reports'), icon: HiOutlineClipboardDocumentList },
  ];

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (Math.abs(distance) > 50) {
      if (showSwipeHint) dismissSwipeHint();
      const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
      if (distance > 0 && currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1].id);
        scrollToSection('content');
      } else if (distance < 0 && currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1].id);
        scrollToSection('content');
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const dismissSwipeHint = () => {
    setShowSwipeHint(false);
    localStorage.setItem('hasSeenSwipeHint', 'true');
  };

  const scrollToSection = (sectionId: string) => {
    const element = sectionsRef.current[sectionId];
    if (element) {
      const offsetPosition = element.getBoundingClientRect().top + window.pageYOffset - 100;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  const { filteredData, totalPages } = useMemo(() => {
    let data: CardItem[] = [];
    switch (activeTab) {
      case 'programs':  data = programs; break;
      case 'featured':  data = events.filter((e) => e.type === 'featured'); break;
      case 'upcoming':  data = events.filter((e) => e.type === 'upcoming'); break;
      case 'projects':  data = projects.filter((project) => project.status !== 'completed'); break;
      case 'trainings': data = trainings; break;
      case 'reports':   data = reports; break;
    }

    const filtered = searchQuery
      ? data.filter(
          (item) =>
            item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : data;

    const total = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return {
      filteredData: filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE),
      totalPages: total,
    };
  }, [activeTab, searchQuery, currentPage, events, projects, programs, trainings, reports]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
  };

  const renderOverview = () => {
    const filteredMovement = searchQuery
      ? secureByDesignItems.filter(
          (item) =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.brief.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : secureByDesignItems;

    if (filteredMovement.length === 0) {
      return (
        <motion.div className="text-center py-12" variants={itemVariants}>
          <p className="text-gray-400 text-lg">No Secure by Design movement items match your search.</p>
        </motion.div>
      );
    }

    return (
      <div className="space-y-12">
        <motion.div className="max-w-4xl" variants={itemVariants}>
          <p className="tagline text-yellow-400 text-sm font-semibold mb-5 uppercase tracking-wider relative inline-block">
            KAMLEWA
            <span className="absolute bottom-0 left-0 w-1/2 h-0.5 bg-yellow-400" />
          </p>
          <h3 className="text-3xl md:text-5xl font-bold mb-5" style={{ fontFamily: 'var(--font-nourd), sans-serif' }}>
            The Secure by Design Movement
          </h3>
          <p className="text-gray-300 text-base md:text-lg leading-relaxed">
            This program promotes a security-first mindset for communities, learners, builders, and organizations. Through visual learning and practical outreach, KAMLEWA helps people understand that safe technology begins with intentional design.
          </p>
        </motion.div>

        <div className="space-y-14">
          {filteredMovement.map((item, index) => {
            const reverse = index % 2 === 1;
            return (
              <motion.article
                key={item.image}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 items-center ${
                  reverse ? 'lg:[&>*:first-child]:order-2' : ''
                }`}
                variants={itemVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
              >
                <div className="relative min-h-[260px] overflow-hidden bg-white/5 md:min-h-[380px]">
                  <Image src={item.image} alt={item.title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" unoptimized />
                </div>
                <div className="border-l-4 border-yellow-400 pl-6">
                  <span className="mb-3 inline-block text-sm font-semibold text-yellow-400">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h4 className="mb-4 text-2xl md:text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-nourd), sans-serif' }}>
                    {item.title}
                  </h4>
                  <p className="text-gray-300 text-base md:text-lg leading-relaxed">{item.brief}</p>
                </div>
              </motion.article>
            );
          })}
        </div>

        <motion.div className="grid grid-cols-1 gap-4 border border-white/10 bg-white/[0.03] p-6 md:grid-cols-3" variants={itemVariants}>
          <button type="button" onClick={() => setActiveTab('featured')} className="text-left text-yellow-400 hover:text-yellow-300">
            View Featured Events <HiArrowRight className="inline h-4 w-4" />
          </button>
          <button type="button" onClick={() => setActiveTab('trainings')} className="text-left text-yellow-400 hover:text-yellow-300">
            View Trainings <HiArrowRight className="inline h-4 w-4" />
          </button>
          <button type="button" onClick={() => setActiveTab('reports')} className="text-left text-yellow-400 hover:text-yellow-300">
            View Reports <HiArrowRight className="inline h-4 w-4" />
          </button>
        </motion.div>
      </div>
    );
  };

  const renderCard = (item: CardItem) => {
    const isEvent    = 'type' in item;
    const isProject  = 'status' in item && 'progress' in item;
    const isProgram  = 'locations' in item && 'category' in item && !('level' in item);
    const isTraining = 'level' in item && 'duration' in item;
    const isReport   = isReportItem(item);

    const getDetailUrl = () => {
      if (isEvent) return `/events-impact/${item.id}`;
      if (isProject) return `/events-impact/projects/${item.id}`;
      if (isProgram) return `/events-impact/programs/${item.id}`;
      if (isTraining) return `/events-impact/trainings/${item.id}`;
      return '/contact';
    };

    if (isReport) {
      const reportLabel = `${item.start_year} - ${item.end_year}`;
      const pdfUrl = getReportPdfUrl(item);

      return (
        <motion.article
          key={item.id}
          className="group flex h-full flex-col overflow-hidden border border-white/10 bg-white/[0.03] transition-all duration-300 hover:border-yellow-400/50"
          variants={itemVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <Link href={`/events-impact/reports/${item.id}`} className="flex flex-1 flex-col">
            <div className="relative bg-white p-3 sm:p-4">
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-100">
                {item.image ? (
                  <Image src={item.image} alt={`Annual Report ${reportLabel}`} fill className="object-contain transition-transform duration-500 group-hover:scale-[1.02]" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" unoptimized />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gray-100">
                    <HiOutlineClipboardDocumentList className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-1 flex-col p-6 pb-0">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="bg-yellow-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-yellow-400">
                  {item.category || 'Annual'}
                </span>
                <span className="flex items-center gap-2 text-sm text-gray-400">
                  <HiClock className="h-4 w-4" />{reportLabel}
                </span>
              </div>
              <h3 className="mb-3 text-xl font-bold text-white md:text-2xl" style={{ fontFamily: 'var(--font-nourd), sans-serif' }}>
                {item.title || `Annual Report ${reportLabel}`}
              </h3>
              <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-gray-300 md:text-base">
                {item.description || item.summary}
              </p>
              <div className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-yellow-400">
                Read Description & Summary <HiArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
          <div className="p-6 pt-0">
            <a href={pdfUrl} download onClick={(event) => event.stopPropagation()} className="inline-flex w-full items-center justify-center gap-2 bg-yellow-400 px-4 py-3 text-sm font-bold text-black transition-colors hover:bg-yellow-300" aria-label={`Download Full Report PDF for ${reportLabel}`}>
              <HiDownload className="h-5 w-5" />
              Download Full Report (PDF)
            </a>
          </div>
        </motion.article>
      );
    }

    const detailUrl = getDetailUrl();

    return (
      <Link key={item.id} href={detailUrl} className="group">
        <motion.div
          className="relative bg-transparent border border-black/10 overflow-hidden group cursor-pointer hover:border-yellow-400/50 transition-all duration-300"
          variants={itemVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="relative h-64 overflow-hidden">
            {item.image ? (
              <Image src={item.image} alt={item.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" unoptimized />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <HiOutlineClipboardDocumentList className="w-16 h-16 text-gray-600" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors duration-300" />
          </div>

          <div className="p-6">
            <h3 className="text-xl md:text-2xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-nourd), sans-serif' }}>
              {item.title}
            </h3>
            <p className="text-gray-300 text-sm md:text-base mb-4 line-clamp-2">{item.description}</p>

            {isEvent && (
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-yellow-400 text-sm">
                  <HiOutlineCalendarDateRange className="w-4 h-4 text-yellow-400" />
                  <span>{item.date}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <VscLocation className="w-4 h-4" /><span>{item.location}</span>
                </div>
                {item.participants && (
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <HiUsers className="w-4 h-4" /><span>{item.participants} participants</span>
                  </div>
                )}
              </div>
            )}

            {isProject && (
              <div className="space-y-2 mb-4">
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  item.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  item.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>{item.status}</div>
                {item.progress !== undefined && (
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${item.progress}%` }} />
                  </div>
                )}
              </div>
            )}

            {isProgram && (
              <div className="space-y-2 mb-4">
                {item.duration && (
                  <div className="flex items-center gap-2 text-yellow-400 text-sm">
                    <PiClockCountdownFill className="w-4 h-4" /><span>{item.duration}</span>
                  </div>
                )}
                {item.participants && (
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <HiUsers className="w-4 h-4" /><span>{item.participants} participants</span>
                  </div>
                )}
                {item.category && (
                  <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400">
                    {item.category}
                  </div>
                )}
              </div>
            )}

            {isTraining && (
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-yellow-400 text-sm">
                  <PiClockCountdownFill className="w-4 h-4" /><span>{item.duration}</span>
                </div>
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  item.level === 'beginner' ? 'bg-green-500/20 text-green-400' :
                  item.level === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>{item.level}</div>
                {item.format && <div className="text-gray-400 text-sm">Format: {item.format}</div>}
              </div>
            )}

            <div className="pointer-events-none">
              {isEvent ? (
                <div className="inline-flex items-center justify-center gap-2 text-yellow-400 font-semibold text-sm bg-yellow-400/10 px-4 py-2 rounded border border-yellow-400/20">
                  {tEventModal('registerButton')}<HiArrowRight className="w-4 h-4" />
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 text-yellow-400 font-semibold text-sm">
                  View Details <HiArrowRight className="w-4 h-4" />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </Link>
    );
  };

  return (
    <main className="relative bg-black">
      <Navbar />
      <PageBanner
        subheading={t('subheading')}
        heading={t('heading')}
        description={t('description')}
      />
      <BackToHome />

      {/* Mobile Tabs */}
      <div className="sticky top-20 md:hidden z-50 bg-black border-b border-gray-800 shadow-lg">
        <div className="relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black via-black/80 to-transparent pointer-events-none z-10" />
          <div className="flex gap-1 overflow-x-auto scrollbar-hide scroll-smooth pb-1 -mr-3">
            {tabs.map((item, index) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <div key={item.id} className={`relative shrink-0 ${index === tabs.length - 1 ? 'pr-3' : ''}`}>
                  {isActive && <div className="absolute inset-0 bg-white/15 translate-x-1 translate-y-1" />}
                  <button
                    onClick={() => { setActiveTab(item.id); scrollToSection('content'); }}
                    className={`relative flex items-center gap-2 px-3 py-4 font-medium text-sm transition-all duration-200 ${
                      isActive ? 'bg-yellow-400 text-black' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2 relative z-10">
                      <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
                      <span className={`whitespace-nowrap overflow-hidden transition-all duration-200 ${
                        isActive ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0'
                      }`}>{item.label}</span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Swipe Hint */}
      <AnimatePresence>
        {showSwipeHint && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative w-full mb-4 bg-yellow-400 text-black px-4 py-3 shadow-lg z-20 md:hidden"
          >
            <div className="flex items-center justify-center gap-2 text-sm font-semibold">
              <MdOutlineSwipe className="w-5 h-5" />
              <span>{tEvents('swipeHint')}</span>
              <button onClick={dismissSwipeHint} className="ml-2 hover:bg-black/10 rounded p-1" aria-label="Dismiss">
                <HiX className="w-4 h-4" />
              </button>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-transparent border-t-yellow-400" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex bg-neutral-900">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 shrink-0 sticky top-24 h-fit bg-neutral-900 border-r border-white/10">
          <div className="px-6 py-8 space-y-6">
            <div className="relative">
              <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 bg-white/5 border-white/10 placeholder-gray-400 focus:ring-1 focus:ring-yellow-400"
              />
            </div>
            <nav className="space-y-2">
              {tabs.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); scrollToSection('content'); }}
                    className={`relative w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 ${
                      isActive ? 'text-yellow-400 font-semibold' : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-400" />}
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          <section
            id="content"
            ref={(el) => { sectionsRef.current['content'] = el; }}
            className="bg-black text-white py-16 md:py-24"
          >
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
              <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }}>
                <motion.div className="text-left mb-12 md:mb-16" variants={itemVariants}>
                  <motion.p className="tagline text-yellow-400 text-sm font-semibold mb-5 uppercase tracking-wider relative inline-block" variants={itemVariants}>
                    {tabs.find((tab) => tab.id === activeTab)?.label}
                    <span className="absolute bottom-0 left-0 w-1/2 h-0.5 bg-yellow-400" />
                  </motion.p>
                  <motion.h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6" variants={itemVariants} style={{ fontFamily: 'var(--font-nourd), sans-serif' }}>
                    {tabs.find((tab) => tab.id === activeTab)?.label}
                  </motion.h2>
                  {searchQuery && activeTab !== 'programs' && (
                    <motion.p className="text-gray-300" variants={itemVariants}>
                      Found {filteredData.length} result{filteredData.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
                    </motion.p>
                  )}
                </motion.div>

                {loading ? (
                  <div className="flex justify-center items-center py-12 min-h-[400px]">
                    <Loader />
                  </div>
                ) : filteredData.length > 0 ? (
                  <>
                    <div
                      ref={contentContainerRef}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12"
                    >
                      {filteredData.map((item) => renderCard(item))}
                    </div>
                    {totalPages > 1 && (
                      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    )}
                  </>
                ) : activeTab === 'programs' ? (
                  renderOverview()
                ) : (
                  <motion.div className="text-center py-12" variants={itemVariants}>
                    <p className="text-gray-400 text-lg">
                      {searchQuery ? 'No results found. Try a different search term.' : 'No items available yet.'}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </main>
  );
}