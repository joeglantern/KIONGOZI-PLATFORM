"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/app/contexts/UserContext';
import { Button, buttonVariants } from '@/components/ui/button';
import { NotificationDropdown } from '@/components/layout/NotificationDropdown';
import { useTheme } from '@/app/contexts/ThemeContext';
import { motion } from 'framer-motion';
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
    Map as MapIcon,
} from 'lucide-react';

export function Navbar() {
    const { user, profile, signOut } = useUser();
    const { t } = useLanguage();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { theme, toggleTheme } = useTheme();

    const ticking = useRef(false);
    useEffect(() => {
        const handleScroll = () => {
            if (!ticking.current) {
                ticking.current = true;
                requestAnimationFrame(() => {
                    setScrolled(window.scrollY > 10);
                    ticking.current = false;
                });
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isActive = (path: string) => pathname === path;
    const isInstructor = profile?.role === 'instructor' || profile?.role === 'admin';
    const desktopNavClass = (active: boolean) =>
        cn(buttonVariants({ variant: 'ghost' }), active ? 'bg-orange-50 text-orange-600' : 'text-gray-700');
    const mobileNavClass = cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start');
    const mobileOutlineClass = cn(buttonVariants({ variant: 'outline' }), 'w-full');

    // Hide root navbar on instructor pages (they have their own navbar)
    if (pathname?.startsWith('/instructor')) return null;

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
                ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-md'
                : 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm'
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2 group">
                        <Image
                            src="/logo.png"
                            alt="Kiongozi Logo"
                            width={40}
                            height={40}
                            className="w-10 h-10 object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
                            priority
                        />
                        <span className="text-xl font-bold text-gray-900 dark:text-white">Kiongozi</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-1">
                        {!user ? (
                            <>
                                <Link href="/" className={desktopNavClass(isActive('/'))}>
                                    <Home className="w-4 h-4 mr-2" />
                                    {t('nav.home')}
                                </Link>
                                <Link href="/courses" className={desktopNavClass(isActive('/browse'))}>
                                    <BookOpen className="w-4 h-4 mr-2" />
                                    {t('nav.browse')}
                                </Link>
                                <Link href="/community" className={desktopNavClass(isActive('/community'))}>
                                    <Users className="w-4 h-4 mr-2" />
                                    {t('nav.community')}
                                </Link>
                                <Link href="/impact-map" className={desktopNavClass(isActive('/impact-map'))}>
                                    <MapIcon className="w-4 h-4 mr-2" />
                                    {t('nav.impact_map')}
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link href="/" className={desktopNavClass(isActive('/'))}>
                                    <Home className="w-4 h-4 mr-2" />
                                    {t('nav.home')}
                                </Link>
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
                                <Link href="/impact-map" className={desktopNavClass(isActive('/impact-map'))}>
                                    <MapIcon className="w-4 h-4 mr-2" />
                                    {t('nav.impact_map')}
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
                    <div className="hidden md:flex items-center space-x-3">
                        <LanguageSwitcher />
                        <AccessibilitySwitcher />
                        {user ? (
                            <>
                                {/* Streak indicator */}
                                <motion.div 
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 rounded-full px-3 py-1 text-orange-600 dark:text-orange-400 font-black text-sm select-none shadow-sm cursor-help"
                                    title={`${profile?.current_streak || 0}-day study streak!`}
                                >
                                    <span className={cn("inline-block text-base", (profile?.current_streak || 0) > 0 && "animate-bounce")}>🔥</span>
                                    <span>{profile?.current_streak || 0}</span>
                                </motion.div>

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
                                <div className="relative group">
                                    <Button
                                        variant="ghost"
                                        className="flex items-center space-x-2 text-gray-700"
                                        aria-haspopup="menu"
                                        aria-label="User menu"
                                    >
                                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                            {user.email?.[0].toUpperCase()}
                                        </div>
                                    </Button>

                                    {/* Dropdown Menu — revealed on hover or keyboard focus */}
                                    <div
                                        role="menu"
                                        className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200"
                                    >
                                        <div className="p-3 border-b border-gray-200">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {user.email}
                                            </p>
                                            <p className="text-xs text-gray-500 capitalize">{profile?.role || 'user'}</p>
                                        </div>
                                        <div className="py-1">
                                            <Link href="/profile" className="flex w-full items-center space-x-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                                                <User className="w-4 h-4" />
                                                <span>{t('nav.profile')}</span>
                                            </Link>
                                            <Link href="/settings" className="flex w-full items-center space-x-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                                                <Settings className="w-4 h-4" />
                                                <span>{t('nav.settings')}</span>
                                            </Link>
                                            <button
                                                onClick={signOut}
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
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
                                <Link href="/login" className={cn(buttonVariants({ variant: 'ghost' }), 'text-gray-700')}>
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
                        className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 active:scale-90 transition-all duration-150 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        aria-label="Toggle Navigation Menu"
                        aria-expanded={mobileMenuOpen}
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <div
                className={`md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'max-h-[85vh] opacity-100 overflow-y-auto' : 'max-h-0 opacity-0 overflow-hidden'
                    }`}
            >
                <div className="px-4 pt-3 pb-24 space-y-2">
                    {!user ? (
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
                                    <span className="text-lg">🔥</span>
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
                            <Link href="/impact-map" onClick={() => setMobileMenuOpen(false)} className={mobileNavClass}>
                                <MapIcon className="w-4 h-4 mr-2" />
                                {t('nav.impact_map')}
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
                            <LanguageSwitcher />
                            <AccessibilitySwitcher />
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
