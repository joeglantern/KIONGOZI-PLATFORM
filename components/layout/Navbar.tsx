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
                                    Home
                                </Link>
                                <Link href="/courses" className={desktopNavClass(isActive('/browse'))}>
                                    <BookOpen className="w-4 h-4 mr-2" />
                                    Browse Courses
                                </Link>
                                <Link href="/community" className={desktopNavClass(isActive('/community'))}>
                                    <Users className="w-4 h-4 mr-2" />
                                    Community
                                </Link>
                                <Link href="/impact-map" className={desktopNavClass(isActive('/impact-map'))}>
                                    <MapIcon className="w-4 h-4 mr-2" />
                                    Impact Map
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link href="/dashboard" className={desktopNavClass(isActive('/dashboard'))}>
                                    <LayoutDashboard className="w-4 h-4 mr-2" />
                                    Dashboard
                                </Link>
                                <Link href="/courses" className={desktopNavClass(isActive('/courses'))}>
                                    <BookOpen className="w-4 h-4 mr-2" />
                                    Browse
                                </Link>
                                <Link href="/my-learning" className={desktopNavClass(isActive('/my-learning'))}>
                                    <GraduationCap className="w-4 h-4 mr-2" />
                                    My Learning
                                </Link>
                                <Link href="/community" className={desktopNavClass(isActive('/community'))}>
                                    <Users className="w-4 h-4 mr-2" />
                                    Community
                                </Link>
                                <Link href="/impact-map" className={desktopNavClass(isActive('/impact-map'))}>
                                    <MapIcon className="w-4 h-4 mr-2" />
                                    Impact Map
                                </Link>
                                {isInstructor && (
                                    <Link href="/instructor/dashboard" className={cn(buttonVariants(), 'bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md')}>
                                        Instructor Panel
                                    </Link>
                                )}
                            </>
                        )}
                    </div>

                    {/* Right Side Actions */}
                    <div className="hidden md:flex items-center space-x-3">
                        {user ? (
                            <>
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
                                    >
                                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                            {user.email?.[0].toUpperCase()}
                                        </div>
                                    </Button>

                                    {/* Dropdown Menu */}
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                        <div className="p-3 border-b border-gray-200">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {user.email}
                                            </p>
                                            <p className="text-xs text-gray-500 capitalize">{profile?.role || 'user'}</p>
                                        </div>
                                        <div className="py-1">
                                            <Link href="/profile" className="flex w-full items-center space-x-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                                                <User className="w-4 h-4" />
                                                <span>Profile</span>
                                            </Link>
                                            <Link href="/settings" className="flex w-full items-center space-x-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                                                <Settings className="w-4 h-4" />
                                                <span>Settings</span>
                                            </Link>
                                            <button
                                                onClick={signOut}
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                <span>Sign Out</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className={cn(buttonVariants({ variant: 'ghost' }), 'text-gray-700')}>
                                    Sign In
                                </Link>
                                <Link href="/signup" className={cn(buttonVariants(), 'bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg')}>
                                    Get Started
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
                className={`md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg overflow-hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0'
                    }`}
            >
                <div className="px-4 py-3 space-y-2">
                    {!user ? (
                        <>
                            <Link href="/" onClick={() => setMobileMenuOpen(false)} className={mobileNavClass}>
                                <Home className="w-4 h-4 mr-2" />
                                Home
                            </Link>
                            <Link href="/courses" onClick={() => setMobileMenuOpen(false)} className={mobileNavClass}>
                                <BookOpen className="w-4 h-4 mr-2" />
                                Browse Courses
                            </Link>
                            <Link href="/community" onClick={() => setMobileMenuOpen(false)} className={mobileNavClass}>
                                <Users className="w-4 h-4 mr-2" />
                                Community
                            </Link>
                            <div className="pt-3 border-t border-gray-200 space-y-2">
                                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className={mobileOutlineClass}>
                                    Sign In
                                </Link>
                                <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className={cn(buttonVariants(), 'w-full bg-orange-500')}>
                                    Get Started
                                </Link>
                            </div>
                        </>
                    ) : (
                        <>
                            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className={mobileNavClass}>
                                <LayoutDashboard className="w-4 h-4 mr-2" />
                                Dashboard
                            </Link>
                            <Link href="/courses" onClick={() => setMobileMenuOpen(false)} className={mobileNavClass}>
                                <BookOpen className="w-4 h-4 mr-2" />
                                Browse
                            </Link>
                            <Link href="/my-learning" onClick={() => setMobileMenuOpen(false)} className={mobileNavClass}>
                                <GraduationCap className="w-4 h-4 mr-2" />
                                My Learning
                            </Link>
                            <Link href="/community" onClick={() => setMobileMenuOpen(false)} className={mobileNavClass}>
                                <Users className="w-4 h-4 mr-2" />
                                Community
                            </Link>
                            <Link href="/impact-map" onClick={() => setMobileMenuOpen(false)} className={mobileNavClass}>
                                <MapIcon className="w-4 h-4 mr-2" />
                                Impact Map
                            </Link>
                            {isInstructor && (
                                <Link href="/instructor/dashboard" onClick={() => setMobileMenuOpen(false)} className={cn(buttonVariants(), 'w-full justify-start bg-orange-500 text-white font-bold')}>
                                    <LayoutDashboard className="w-4 h-4 mr-2" />
                                    Instructor Panel
                                </Link>
                            )}
                            <div className="pt-3 border-t border-gray-200 space-y-2">
                                <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className={mobileNavClass}>
                                    <User className="w-4 h-4 mr-2" />
                                    Profile
                                </Link>
                                <Link href="/settings" onClick={() => setMobileMenuOpen(false)} className={mobileNavClass}>
                                    <Settings className="w-4 h-4 mr-2" />
                                    Settings
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
                                    Sign Out
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
