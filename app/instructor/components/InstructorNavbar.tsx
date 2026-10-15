"use client";

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/app/contexts/UserContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { NotificationDropdown } from '@/components/layout/NotificationDropdown';
import { useTheme } from '@/app/contexts/ThemeContext';
import {
    User,
    LogOut,
    Settings,
    Moon,
    Sun,
    Menu,
    Search,
    GraduationCap
} from 'lucide-react';

interface InstructorNavbarProps {
    onMenuClick: () => void;
    menuOpen?: boolean;
}

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900';

export function InstructorNavbar({ onMenuClick, menuOpen = false }: InstructorNavbarProps) {
    const { user, profile, signOut } = useUser();
    const { theme, toggleTheme } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const [query, setQuery] = useState('');
    const [accountOpen, setAccountOpen] = useState(false);
    const accountRef = useRef<HTMLDivElement>(null);

    // Close the account menu on outside click, Escape, or navigation.
    useEffect(() => {
        if (!accountOpen) return;
        const onPointerDown = (e: PointerEvent) => {
            if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setAccountOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [accountOpen]);

    useEffect(() => {
        setAccountOpen(false);
    }, [pathname]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const q = query.trim();
        router.push(q ? `/instructor/courses?q=${encodeURIComponent(q)}` : '/instructor/courses');
    };

    const initial = (profile?.first_name?.[0] || user?.email?.[0] || 'I').toUpperCase();

    return (
        <header className="h-16 shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3 px-4 lg:px-8 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
                <button
                    type="button"
                    onClick={onMenuClick}
                    aria-label="Open menu"
                    aria-expanded={menuOpen}
                    aria-controls="instructor-mobile-nav"
                    className={`lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ${focusRing}`}
                >
                    <Menu className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>

                <form role="search" onSubmit={handleSearch} className="hidden md:flex relative">
                    <label htmlFor="instructor-search" className="sr-only">Search your courses</label>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                        id="instructor-search"
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search your courses…"
                        className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all w-64"
                    />
                </form>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
                <Button
                    asChild
                    variant="outline"
                    className="hidden sm:flex items-center gap-2 text-sm border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl"
                >
                    <Link href="/dashboard">
                        <GraduationCap className="w-4 h-4" />
                        Student view
                    </Link>
                </Button>

                <NotificationDropdown />

                <button
                    type="button"
                    onClick={toggleTheme}
                    aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    className={`p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${focusRing}`}
                >
                    {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                <div className="relative ml-1" ref={accountRef}>
                    <button
                        type="button"
                        onClick={() => setAccountOpen((open) => !open)}
                        aria-label="Account menu"
                        aria-haspopup="menu"
                        aria-expanded={accountOpen}
                        className={`flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${focusRing}`}
                    >
                        <span className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {initial}
                        </span>
                    </button>

                    {accountOpen && (
                        <div
                            role="menu"
                            className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 z-50"
                        >
                            <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                    {profile?.username ? `@${profile.username}` : [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Instructor'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                            </div>
                            <div className="p-1">
                                <Link
                                    href="/profile"
                                    role="menuitem"
                                    className={`w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg flex items-center gap-2 transition-colors ${focusRing}`}
                                >
                                    <User className="w-4 h-4" />
                                    <span>Profile</span>
                                </Link>
                                <Link
                                    href="/instructor/settings"
                                    role="menuitem"
                                    className={`w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg flex items-center gap-2 transition-colors ${focusRing}`}
                                >
                                    <Settings className="w-4 h-4" />
                                    <span>Settings</span>
                                </Link>
                                <Link
                                    href="/dashboard"
                                    role="menuitem"
                                    className={`sm:hidden w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg flex items-center gap-2 transition-colors ${focusRing}`}
                                >
                                    <GraduationCap className="w-4 h-4" />
                                    <span>Student view</span>
                                </Link>
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={signOut}
                                    className={`w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-2 transition-colors ${focusRing}`}
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Sign out</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
