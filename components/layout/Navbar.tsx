"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/app/contexts/UserContext';
import { Button, buttonVariants } from '@/components/ui/button';
import { NotificationDropdown } from '@/components/layout/NotificationDropdown';
import { useTheme } from '@/app/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import AccessibilitySwitcher from '@/components/layout/AccessibilitySwitcher';
import { useLanguage } from '@/app/contexts/LanguageContext';
import {
    Sparkles,
    Menu,
    X,
    Home,
    BookOpen,
    User,
    Users,
    LogOut,
    Settings,
    GraduationCap,
    LayoutDashboard,
    Moon,
    Sun,
    Flame,
} from 'lucide-react';

export function Navbar() {
    const { user, profile, loading, signOut } = useUser();
    const { t } = useLanguage();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { theme, toggleTheme } = useTheme();

    const ticking = useRef(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const updateScrolled = () => {
            const nextScrolled = window.scrollY > 10;
            setScrolled((current) => (current === nextScrolled ? current : nextScrolled));
        };

        const handleScroll = () => {
            if (!ticking.current) {
                ticking.current = true;
                requestAnimationFrame(() => {
                    updateScrolled();
                    ticking.current = false;
                });
            }
        };
        updateScrolled();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setMobileMenuOpen(false);
        setUserMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMobileMenuOpen(false);
                setUserMenuOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (!userMenuOpen) return;

        const handlePointerDown = (event: MouseEvent | TouchEvent) => {
            if (!userMenuRef.current?.contains(event.target as Node)) {
                setUserMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('touchstart', handlePointerDown, { passive: true });
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('touchstart', handlePointerDown);
        };
    }, [userMenuOpen]);

    const isActive = (path: string) =>
        path === '/' ? pathname === '/' : Boolean(pathname === path || pathname?.startsWith(`${path}/`));
    const isInstructor = profile?.role === 'instructor' || profile?.role === 'admin';
    const desktopNavClass = (active: boolean) =>
        cn(
            buttonVariants({ variant: 'ghost' }),
            'rounded-xl px-3 text-sm font-black whitespace-nowrap',
            active
                ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300'
                : 'text-gray-700 hover:bg-orange-50/70 hover:text-orange-700 dark:text-gray-200 dark:hover:bg-gray-800'
        );
    const mobileNavClass = cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start gap-2');
    const mobileOutlineClass = cn(buttonVariants({ variant: 'outline' }), 'w-full justify-center');
    const skeletonPillClass = 'h-9 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse';

    // Hide root navbar on instructor pages (they have their own navbar)
    if (pathname?.startsWith('/instructor')) return null;

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-200 ${scrolled
                ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-md'
                : 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm'
                }`}
        >
            <nav aria-label="Primary navigation" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo — the image is the full Kiongozi wordmark, so no
                        separate text label (that caused a duplicate "Kiongozi"). */}
                    <Link href="/" className="flex items-center group" aria-label="Kiongozi home">
                        <Image
                            src="/logo.png"
                            alt="Kiongozi"
                            width={592}
                            height={421}
                            className="h-12 w-[68px] object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
                            priority
                        />
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden xl:flex items-center space-x-1">
                        {loading ? (
                            <div className="flex items-center gap-2" aria-hidden="true">
                                <span className={cn(skeletonPillClass, 'w-28')} />
                                <span className={cn(skeletonPillClass, 'w-24')} />
                            </div>
                        ) : !user ? (
                            <>
                                <Link href="/courses" className={desktopNavClass(isActive('/courses'))}>
                                    <BookOpen className="w-4 h-4 mr-2" />
                                    {t('nav.browse')}
                                </Link>
                                <Link href="/community" className={desktopNavClass(isActive('/community'))}>
                                    <Users className="w-4 h-4 mr-2" />
                                    {t('nav.community')}
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link href="/dashboard" className={desktopNavClass(isActive('/dashboard'))}>
                                    <LayoutDashboard className="w-4 h-4 mr-2" />
                                    {t('nav.dashboard')}
                                </Link>
                                <Link href="/courses" className={desktopNavClass(isActive('/courses'))}>
                                    <BookOpen className="w-4 h-4 mr-2" />
                                    {t('nav.browse')}
                                </Link>
                                <Link href="/my-learning" className={desktopNavClass(isActive('/my-learning'))}>
                                    <GraduationCap className="w-4 h-4 mr-2" />
                                    {t('nav.my_learning')}
                                </Link>
                                <Link href="/community" className={desktopNavClass(isActive('/community'))}>
                                    <Users className="w-4 h-4 mr-2" />
                                    {t('nav.community')}
                                </Link>
                                {isInstructor && (
                                    <Link href="/instructor/dashboard" className={cn(buttonVariants(), 'bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md')}>
                                        {t('nav.instructor_panel')}
                                    </Link>
                                )}
                            </>
                        )}
                    </div>

                    {/* Right Side Actions */}
                    <div className="hidden xl:flex items-center space-x-3">
                        <LanguageSwitcher />
                        <AccessibilitySwitcher />
                        {loading ? (
                            <div className="flex items-center gap-3" aria-hidden="true">
                                <span className={cn(skeletonPillClass, 'w-16 rounded-full')} />
                                <span className={cn(skeletonPillClass, 'w-20 rounded-full')} />
                                <span className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                            </div>
                        ) : user ? (
                            <>
                                {/* Streak indicator */}
                                <div
                                    className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 rounded-full px-3 py-1 text-orange-600 dark:text-orange-400 font-black text-sm select-none shadow-sm cursor-help"
                                    title={`${profile?.current_streak || 0}-day study streak!`}
                                >
                                    <Flame className="w-4 h-4 text-orange-500" aria-hidden="true" />
                                    <span>{profile?.current_streak || 0}</span>
                                </div>

                                {/* XP indicator */}
                                <div 
                                    className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-full px-3 py-1 text-blue-600 dark:text-blue-400 font-black text-sm select-none shadow-sm cursor-help"
                                    title={`${profile?.total_xp || 0} total XP`}
                                >
                                    <Sparkles className="w-4 h-4 text-blue-500 fill-current" />
                                    <span>{profile?.total_xp || 0} XP</span>
                                </div>

                                <NotificationDropdown />
                                <button
                                    onClick={toggleTheme}
                                    className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                                    aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                                >
                                    {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                                </button>
                                <div className="relative" ref={userMenuRef}>
                                    <Button
                                        variant="ghost"
                                        className="flex items-center space-x-2 text-gray-700 dark:text-gray-200"
                                        onClick={() => setUserMenuOpen((open) => !open)}
                                        aria-haspopup="menu"
                                        aria-expanded={userMenuOpen}
                                        aria-controls="user-menu"
                                        aria-label="User menu"
                                    >
                                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                            {user.email?.[0].toUpperCase()}
                                        </div>
                                    </Button>

                                    {/* Dropdown Menu */}
                                    <div
                                        id="user-menu"
                                        role="menu"
                                        className={cn(
                                            "absolute right-0 mt-2 w-56 rounded-2xl border border-gray-200 bg-white shadow-lg transition-all duration-200 dark:border-gray-800 dark:bg-gray-900",
                                            userMenuOpen
                                                ? "visible translate-y-0 opacity-100"
                                                : "invisible pointer-events-none -translate-y-1 opacity-0"
                                        )}
                                    >
                                        <div className="p-3 border-b border-gray-200">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {user.email}
                                            </p>
                                            <p className="text-xs text-gray-500 capitalize">{profile?.role || 'user'}</p>
                                        </div>
                                        <div className="py-1">
                                            <Link href="/profile" role="menuitem" onClick={() => setUserMenuOpen(false)} className="flex w-full items-center space-x-2 px-4 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800">
                                                <User className="w-4 h-4" />
                                                <span>{t('nav.profile')}</span>
                                            </Link>
                                            <Link href="/settings" role="menuitem" onClick={() => setUserMenuOpen(false)} className="flex w-full items-center space-x-2 px-4 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800">
                                                <Settings className="w-4 h-4" />
                                                <span>{t('nav.settings')}</span>
                                            </Link>
                                            <button
                                                role="menuitem"
                                                onClick={() => {
                                                    setUserMenuOpen(false);
                                                    signOut();
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center space-x-2 dark:hover:bg-red-950/30"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                <span>{t('nav.sign_out')}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className={cn(buttonVariants({ variant: 'ghost' }), 'text-gray-700 dark:text-gray-200')}>
                                    {t('nav.sign_in')}
                                </Link>
                                <Link href="/signup" className={cn(buttonVariants(), 'bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg')}>
                                    {t('nav.get_started')}
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="xl:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 active:scale-90 transition-all duration-150 focus:ring-2 focus:ring-orange-500 focus:outline-none dark:text-gray-200 dark:hover:bg-gray-800"
                        aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                        aria-expanded={mobileMenuOpen}
                        aria-controls="mobile-navigation"
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu */}
            <div
                id="mobile-navigation"
                role="navigation"
                aria-label="Mobile navigation"
                className={`xl:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'max-h-[85vh] opacity-100 overflow-y-auto' : 'max-h-0 opacity-0 overflow-hidden'
                    }`}
            >
                <div className="px-4 pt-3 pb-24 space-y-2">
                    {loading ? (
                        <div className="space-y-2 px-2 py-1" aria-hidden="true">
                            <div className={cn(skeletonPillClass, 'w-full')} />
                            <div className={cn(skeletonPillClass, 'w-full')} />
                            <div className={cn(skeletonPillClass, 'w-4/5')} />
                        </div>
                    ) : !user ? (
                        <>
                            <Link href="/" onClick={() => setMobileMenuOpen(false)} className={mobileNavClass}>
                                <Home className="w-4 h-4 mr-2" />
                                {t('nav.home')}
                            </Link>
                            <Link href="/courses" onClick={() => setMobileMenuOpen(false)} className={mobileNavClass}>
                                <BookOpen className="w-4 h-4 mr-2" />
                                {t('nav.browse')}
                            </Link>
                            <Link href="/community" onClick={() => setMobileMenuOpen(false)} className={mobileNavClass}>
                                <Users className="w-4 h-4 mr-2" />
                                {t('nav.community')}
                            </Link>
                            <div className="pt-3 border-t border-gray-200 space-y-2">
                                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className={mobileOutlineClass}>
                                    {t('nav.sign_in')}
                                </Link>
                                <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className={cn(buttonVariants(), 'w-full bg-orange-500')}>
                                    {t('nav.get_started')}
                                </Link>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Mobile Streak & XP status */}
                            <div className="flex items-center justify-around bg-orange-50/50 dark:bg-orange-950/20 rounded-2xl p-3 border border-orange-100 dark:border-orange-900/40 mb-4 mx-2">
                                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-black text-sm">
                                    <Flame className="w-4 h-4 text-orange-500" aria-hidden="true" />
                                    <span>{profile?.current_streak || 0} Streak</span>
                                </div>
                                <div className="h-4 border-l border-orange-200 dark:border-orange-900/40" />
                                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-sm">
                                    <Sparkles className="w-4 h-4 text-blue-500 fill-current" />
                                    <span>{profile?.total_xp || 0} XP</span>
                                </div>
                            </div>

                            <Link href="/" onClick={() => setMobileMenuOpen(false)} className={mobileNavClass}>
                                <Home className="w-4 h-4 mr-2" />
                                {t('nav.home')}
                            </Link>
                            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className={mobileNavClass}>
                                <LayoutDashboard className="w-4 h-4 mr-2" />
                                {t('nav.dashboard')}
                            </Link>
                            <Link href="/courses" onClick={() => setMobileMenuOpen(false)} className={mobileNavClass}>
                                <BookOpen className="w-4 h-4 mr-2" />
                                {t('nav.browse')}
                            </Link>
                            <Link href="/my-learning" onClick={() => setMobileMenuOpen(false)} className={mobileNavClass}>
                                <GraduationCap className="w-4 h-4 mr-2" />
                                {t('nav.my_learning')}
                            </Link>
                            <Link href="/community" onClick={() => setMobileMenuOpen(false)} className={mobileNavClass}>
                                <Users className="w-4 h-4 mr-2" />
                                {t('nav.community')}
                            </Link>
                            {isInstructor && (
                                <Link href="/instructor/dashboard" onClick={() => setMobileMenuOpen(false)} className={cn(buttonVariants(), 'w-full justify-start bg-orange-500 text-white font-bold')}>
                                    <LayoutDashboard className="w-4 h-4 mr-2" />
                                    {t('nav.instructor_panel')}
                                </Link>
                            )}
                            <div className="pt-3 border-t border-gray-200 space-y-2">
                                <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className={mobileNavClass}>
                                    <User className="w-4 h-4 mr-2" />
                                    {t('nav.profile')}
                                </Link>
                                <Link href="/settings" onClick={() => setMobileMenuOpen(false)} className={mobileNavClass}>
                                    <Settings className="w-4 h-4 mr-2" />
                                    {t('nav.settings')}
                                </Link>
                                <Button
                                    onClick={() => {
                                        signOut();
                                        setMobileMenuOpen(false);
                                    }}
                                    variant="ghost"
                                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    {t('nav.sign_out')}
                                </Button>
                            </div>
                        </>
                    )}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between px-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Preferences</span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleTheme}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                            >
                                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            </button>
                            <LanguageSwitcher />
                            <AccessibilitySwitcher />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
