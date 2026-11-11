'use client';

import { useState, useRef, useEffect } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { HiArrowRight, HiMenu, HiX, HiUsers, HiSearch, HiBell, HiCog, HiLogout } from 'react-icons/hi';
import { HiOutlineCalendarDateRange, HiOutlineClipboardDocumentList } from 'react-icons/hi2';
import { MdOutlineFeaturedPlayList } from 'react-icons/md';
import { PiGraduationCapBold } from 'react-icons/pi';
import { HiLightBulb, HiMail } from 'react-icons/hi';
import { VscChevronRight } from 'react-icons/vsc';
import { TbLayoutDashboard } from 'react-icons/tb';
import { supabase } from '@/lib/supabase/supabaseClient';
import toast from 'react-hot-toast';
import Loader from '@/components/Loader';
import { AccessContext, fetchMyAccess, permissionForPath, type Access, type Permission } from '@/lib/access';
import { HiOutlineUserGroup, HiOutlineInboxStack } from 'react-icons/hi2';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('dashboard');
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [access, setAccess] = useState<Access | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const quickActionsRef = useRef<HTMLDivElement>(null);

  const allNavItems: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; perm: Permission | null }[] = [
    { href: '/dashboard', label: t('nav.dashboard'), icon: TbLayoutDashboard, perm: null },
    { href: '/dashboard/registrations', label: 'Registrations', icon: HiOutlineInboxStack, perm: 'registrations' },
    { href: '/dashboard/programs', label: t('nav.programs'), icon: MdOutlineFeaturedPlayList, perm: 'programs' },
    { href: '/dashboard/events', label: t('nav.events'), icon: HiOutlineCalendarDateRange, perm: 'events' },
    { href: '/dashboard/trainings', label: t('nav.trainings'), icon: PiGraduationCapBold, perm: 'trainings' },
    { href: '/dashboard/projects', label: t('nav.projects'), icon: HiLightBulb, perm: 'projects' },
    { href: '/dashboard/reports', label: t('nav.reports') || 'Reports', icon: HiOutlineClipboardDocumentList, perm: 'reports' },
    { href: '/dashboard/contact', label: t('nav.contact'), icon: HiMail, perm: 'contact' },
    { href: '/dashboard/broadcast', label: 'Broadcast', icon: HiMail, perm: 'broadcast' },
    { href: '/dashboard/team', label: 'Team & Roles', icon: HiOutlineUserGroup, perm: 'users' },
    { href: '/dashboard/settings', label: t('nav.settings'), icon: HiCog, perm: null },
  ];
  const navItems = allNavItems.filter((item) => !item.perm || !!access?.permissions.includes(item.perm));
  const requiredPermission = permissionForPath(pathname || '');
  const allowedHere = !requiredPermission || !!access?.permissions.includes(requiredPermission);

  // Check authentication (skip for login page)
  useEffect(() => {
    // Skip auth check if we're on the login page
    if (pathname === '/dashboard/login' || pathname?.includes('/dashboard/login')) {
      setCheckingAuth(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setAccess(await fetchMyAccess());
          setIsAuthenticated(true);
        } else {
          router.push('/dashboard/login');
        }
      } catch {
        router.push('/dashboard/login');
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Don't redirect if we're on login page
      if (pathname === '/dashboard/login' || pathname?.includes('/dashboard/login')) {
        return;
      }
      
      if (session) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        router.push('/dashboard/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, pathname]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Logged out successfully');
      setProfileOpen(false);
      window.location.assign('/dashboard/login');
      return;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to logout';
      toast.error(message);
    }
  };

  // Get breadcrumbs from pathname
  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Dashboard', href: '/dashboard' }];
    
    if (paths.length > 1) {
      const currentPage = paths[paths.length - 1];
      const navItem = navItems.find(item => item.href.includes(currentPage));
      if (navItem) {
        breadcrumbs.push({ label: navItem.label, href: navItem.href });
      }
    }
    
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target as Node)) {
        setQuickActionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when search opens
  useEffect(() => {
    if (searchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  const quickActions = [
    { label: 'View registrations', href: '/dashboard/registrations', icon: HiOutlineInboxStack, perm: 'registrations' as Permission },
    { label: t('navbar.addProgram'), href: '/dashboard/programs', icon: MdOutlineFeaturedPlayList, perm: 'programs' as Permission },
    { label: t('navbar.addEvent'), href: '/dashboard/events', icon: HiOutlineCalendarDateRange, perm: 'events' as Permission },
    { label: t('navbar.addTraining'), href: '/dashboard/trainings', icon: PiGraduationCapBold, perm: 'trainings' as Permission },
    { label: t('navbar.addProject'), href: '/dashboard/projects', icon: HiLightBulb, perm: 'projects' as Permission },
    { label: 'Add team member', href: '/dashboard/team', icon: HiOutlineUserGroup, perm: 'users' as Permission },
  ].filter((a) => !!access?.permissions.includes(a.perm));

  // Skip layout for login page
  if (pathname === '/dashboard/login' || pathname?.includes('/dashboard/login')) {
    return <>{children}</>;
  }

  if (checkingAuth) {
    return (
      <div className="flex h-screen bg-black text-white items-center justify-center">
        <div className="text-center">
          <Loader size={128} className="mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (access && !access.isStaff) {
    return (
      <div className="flex h-screen bg-black text-white items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4 border border-white/10 bg-white/5 p-8">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-nourd), sans-serif' }}>No dashboard access</h1>
          <p className="text-gray-400 text-sm">Your login is not on the KAMLEWA team yet. Ask a Super Admin to add you under Team &amp; Roles.</p>
          <button onClick={handleLogout} className="text-yellow-400 hover:text-yellow-300 text-sm font-semibold">Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
          {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-black border-r border-white/10 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative w-8 h-12">
                <Image
                  src="/images/logo.png"
                  alt="Kamlewa Logo"
                  fill
                  sizes="100vw"
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm font-bold text-white uppercase" style={{ fontFamily: 'var(--font-nourd), sans-serif' }}>
                  KAMLEWA
                </h2>
                <p className="tagline text-yellow-400 text-xs font-semibold">
                  Dashboard
                </p>
              </div>
            </Link>
            <button
            title='Button1'
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white hover:text-yellow-400 transition-colors"
            >
              <HiX className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded transition-colors ${
                    isActive
                      ? 'bg-yellow-400/20 text-yellow-400 border-l-2 border-yellow-400'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-base font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer Link */}
          <div className="p-4 border-t border-white/10">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-white/70 hover:text-yellow-400 transition-colors"
            >
              <HiArrowRight className="w-4 h-4 rotate-180" />
              Back to Site
            </Link>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-black border-b border-white/10 sticky top-0 z-30">
          <div className="px-4 md:px-6 py-4">
            {/* Mobile Menu Button */}
            <div className="flex items-center justify-between gap-4">
              <button
              title='Button2'
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-white hover:text-yellow-400 transition-colors"
              >
                <HiMenu className="w-6 h-6" />
              </button>

              {/* Breadcrumbs */}
              <nav className="hidden md:flex items-center gap-2 flex-1">
                {breadcrumbs.map((crumb, index) => (
                  <div key={crumb.href} className="flex items-center gap-2">
                    {index > 0 && <VscChevronRight className="w-4 h-4 text-white/40" />}
                    <Link
                      href={crumb.href}
                      className={`text-sm transition-colors ${
                        index === breadcrumbs.length - 1
                          ? 'text-yellow-400 font-semibold'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      {crumb.label}
                    </Link>
                  </div>
                ))}
              </nav>

              {/* Right Side Actions */}
              <div className="flex items-center gap-2 md:gap-4">
                {/* Search */}
                <div className="relative">
                  {searchOpen ? (
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded">
                      <HiSearch className="w-5 h-5 text-white/70" />
                      <input
                        ref={searchRef}
                        type="text"
                        placeholder={t('navbar.search')}
                        className="bg-transparent border-none outline-none text-white placeholder-white/50 text-sm w-48 md:w-64"
                        onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                      />
                      <button
                      title='Button3'
                        onClick={() => setSearchOpen(false)}
                        className="text-white/70 hover:text-white"
                      >
                        <HiX className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSearchOpen(true)}
                      className="p-2 text-white/70 hover:text-yellow-400 transition-colors"
                      aria-label="Search"
                    >
                      <HiSearch className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Quick Actions Dropdown */}
                <div className="relative" ref={quickActionsRef}>
                  <button
                    onClick={() => setQuickActionsOpen(!quickActionsOpen)}
                    className="hidden md:flex items-center gap-2 px-3 py-2 bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 hover:bg-yellow-400/20 transition-colors rounded text-sm font-medium"
                  >
                    <span>{t('navbar.quickActions')}</span>
                    <VscChevronRight className={`w-4 h-4 transition-transform ${quickActionsOpen ? 'rotate-90' : ''}`} />
                  </button>
                  {quickActionsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-black border border-white/10 rounded shadow-lg z-50">
                      <div className="p-2">
                        {quickActions.map((action) => {
                          const Icon = action.icon;
                          return (
                            <Link
                              key={action.href}
                              href={action.href}
                              onClick={() => setQuickActionsOpen(false)}
                              className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded transition-colors"
                            >
                              <Icon className="w-4 h-4" />
                              {action.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Notifications */}
                <div className="relative" ref={notificationsRef}>
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="relative p-2 text-white/70 hover:text-yellow-400 transition-colors"
                    aria-label="Notifications"
                  >
                    <HiBell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full"></span>
                  </button>
                  {notificationsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-black border border-white/10 rounded shadow-lg z-50">
                      <div className="p-4 border-b border-white/10">
                        <h3 className="text-sm font-semibold text-white">{t('navbar.notifications')}</h3>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-white/50">{t('navbar.noNotifications')}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                  title='Button4'
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-full hover:bg-white/5 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-yellow-400/20 border border-yellow-400/30 flex items-center justify-center">
                      <HiUsers className="w-4 h-4 text-yellow-400" />
                    </div>
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-black border border-white/10 rounded shadow-lg z-50">
                      {access && (
                        <div className="px-4 py-3 border-b border-white/10">
                          {access.fullName && <p className="text-sm font-semibold text-white truncate">{access.fullName}</p>}
                          <p className="text-xs text-yellow-400">{access.roleName ?? access.role}</p>
                        </div>
                      )}
                      <div className="p-2">
                        <Link
                          href="/dashboard/settings"
                          className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded transition-colors"
                          onClick={() => {
                            setProfileOpen(false);
                          }}
                        >
                          <HiCog className="w-4 h-4" />
                          {t('nav.settings')}
                        </Link>
                        <Link
                          href="/"
                          className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded transition-colors"
                          onClick={() => setProfileOpen(false)}
                        >
                          <HiArrowRight className="w-4 h-4" />
                          {t('navbar.viewPublicSite')}
                        </Link>
                        <div className="border-t border-white/10 my-1"></div>
                        <button
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded transition-colors"
                          onClick={handleLogout}
                        >
                          <HiLogout className="w-4 h-4" />
                          {t('navbar.logout')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <section className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 lg:p-12 text-base">
          {access?.legacy && (
            <div className="mb-6 border border-yellow-400/30 bg-yellow-400/10 text-yellow-200 text-sm px-4 py-3">
              Roles are not set up yet: every login has full access. Run the SQL files in <code>scripts/dashboard/</code> in Supabase to turn on Team &amp; Roles.
            </div>
          )}
          <AccessContext.Provider value={access}>
            {allowedHere ? children : (
              <div className="max-w-xl mx-auto text-center py-20 space-y-3">
                <h2 className="text-2xl font-bold">You don&apos;t have access to this section</h2>
                <p className="text-gray-400 text-sm">Your role ({access?.roleName ?? 'none'}) does not include it. Ask a Super Admin if you need it.</p>
                <Link href="/dashboard" className="inline-block text-yellow-400 hover:text-yellow-300 text-sm font-semibold">Back to overview</Link>
              </div>
            )}
          </AccessContext.Provider>
        </section>
      </main>
    </div>
  );
}


