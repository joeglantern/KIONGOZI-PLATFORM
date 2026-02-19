"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@/app/utils/supabase/client';
import { useUser } from '@/app/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { NotificationDropdown } from '@/components/layout/NotificationDropdown';
import { useTheme } from '@/app/contexts/ThemeContext';
import {
    Sparkles,
    Menu,
    X,
    Home,
    BookOpen,
    User,
    LogOut,
    Settings,
    Search,
    GraduationCap,
    LayoutDashboard,
    Moon,
    Sun,
} from 'lucide-react';

interface NavbarProps {
    user?: any;
    role?: string;
}

export function Navbar() {
    const { user, profile } = useUser();
    const role = profile?.role;
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createBrowserClient();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    const isActive = (path: string) => pathname === path;
    const isInstructor = profile?.role === 'instructor' || profile?.role === 'admin';

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
                        <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">Kiongozi</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-1">
                        {!user ? (
                            <>
                                <Link href="/">
                                    <Button
                                        variant="ghost"
                                        className={`${isActive('/') ? 'bg-orange-50 text-orange-600' : 'text-gray-700'
                                            }`}
                                    >
                                        <Home className="w-4 h-4 mr-2" />
                                        Home
                                    </Button>
                                </Link>
                                <Link href="/browse">
                                    <Button
                                        variant="ghost"
                                        className={`${isActive('/browse') ? 'bg-orange-50 text-orange-600' : 'text-gray-700'
                                            }`}
                                    >
                                        <BookOpen className="w-4 h-4 mr-2" />
                                        Browse Courses
                                    </Button>
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link href="/dashboard">
                                    <Button
                                        variant="ghost"
                                        className={`${isActive('/dashboard') ? 'bg-orange-50 text-orange-600' : 'text-gray-700'
                                            }`}
                                    >
                                        <LayoutDashboard className="w-4 h-4 mr-2" />
                                        Dashboard
                                    </Button>
                                </Link>
                                <Link href="/courses">
                                    <Button
                                        variant="ghost"
                                        className={`${isActive('/courses') ? 'bg-orange-50 text-orange-600' : 'text-gray-700'
                                            }`}
                                    >
                                        <BookOpen className="w-4 h-4 mr-2" />
                                        Browse
                                    </Button>
                                </Link>
                                <Link href="/my-learning">
                                    <Button
                                        variant="ghost"
                                        className={`${isActive('/my-learning') ? 'bg-orange-50 text-orange-600' : 'text-gray-700'
                                            }`}
                                    >
                                        <GraduationCap className="w-4 h-4 mr-2" />
                                        My Learning
                                    </Button>
                                </Link>
                                {isInstructor && (
                                    <Link href="/instructor/dashboard">
                                        <Button
                                            className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md"
                                        >
                                            Instructor Panel
                                        </Button>
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
                                    className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
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
                                            <p className="text-xs text-gray-500 capitalize">{role || 'user'}</p>
                                        </div>
                                        <div className="py-1">
                                            <Link href="/profile">
                                                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                                                    <User className="w-4 h-4" />
                                                    <span>Profile</span>
                                                </button>
                                            </Link>
                                            <Link href="/settings">
                                                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                                                    <Settings className="w-4 h-4" />
                                                    <span>Settings</span>
                                                </button>
                                            </Link>
                                            <button
                                                onClick={handleSignOut}
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
                                <Link href="/login">
                                    <Button variant="ghost" className="text-gray-700">
                                        Sign In
                                    </Button>
                                </Link>
                                <Link href="/signup">
                                    <Button className="bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg">
                                        Get Started
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
                    <div className="px-4 py-3 space-y-2">
                        {!user ? (
                            <>
                                <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                                    <Button variant="ghost" className="w-full justify-start">
                                        <Home className="w-4 h-4 mr-2" />
                                        Home
                                    </Button>
                                </Link>
                                <Link href="/courses" onClick={() => setMobileMenuOpen(false)}>
                                    <Button variant="ghost" className="w-full justify-start">
                                        <BookOpen className="w-4 h-4 mr-2" />
                                        Browse Courses
                                    </Button>
                                </Link>
                                <div className="pt-3 border-t border-gray-200 space-y-2">
                                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                                        <Button variant="outline" className="w-full">
                                            Sign In
                                        </Button>
                                    </Link>
                                    <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                                        <Button className="w-full bg-orange-500">
                                            Get Started
                                        </Button>
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <>
                                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                                    <Button variant="ghost" className="w-full justify-start">
                                        <LayoutDashboard className="w-4 h-4 mr-2" />
                                        Dashboard
                                    </Button>
                                </Link>
                                <Link href="/courses" onClick={() => setMobileMenuOpen(false)}>
                                    <Button variant="ghost" className="w-full justify-start">
                                        <BookOpen className="w-4 h-4 mr-2" />
                                        Browse
                                    </Button>
                                </Link>
                                <Link href="/my-learning" onClick={() => setMobileMenuOpen(false)}>
                                    <Button variant="ghost" className="w-full justify-start">
                                        <GraduationCap className="w-4 h-4 mr-2" />
                                        My Learning
                                    </Button>
                                </Link>
                                {isInstructor && (
                                    <Link href="/instructor/dashboard" onClick={() => setMobileMenuOpen(false)}>
                                        <Button className="w-full justify-start bg-orange-500 text-white font-bold">
                                            <LayoutDashboard className="w-4 h-4 mr-2" />
                                            Instructor Panel
                                        </Button>
                                    </Link>
                                )}
                                <div className="pt-3 border-t border-gray-200 space-y-2">
                                    <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                                        <Button variant="ghost" className="w-full justify-start">
                                            <User className="w-4 h-4 mr-2" />
                                            Profile
                                        </Button>
                                    </Link>
                                    <Link href="/settings" onClick={() => setMobileMenuOpen(false)}>
                                        <Button variant="ghost" className="w-full justify-start">
                                            <Settings className="w-4 h-4 mr-2" />
                                            Settings
                                        </Button>
                                    </Link>
                                    <Button
                                        onClick={() => {
                                            handleSignOut();
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
            )}
        </nav>
    );
}
