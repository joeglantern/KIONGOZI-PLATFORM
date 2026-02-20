"use client";

import { useUser } from '@/app/contexts/UserContext';
import { createClient } from '@/app/utils/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
    ArrowLeftRight,
    GraduationCap
} from 'lucide-react';

interface InstructorNavbarProps {
    onMenuClick: () => void;
}

export function InstructorNavbar({ onMenuClick }: InstructorNavbarProps) {
    const { user, profile, signOut } = useUser();
    const router = useRouter();
    const supabase = createClient();
    const { theme, toggleTheme } = useTheme();

    return (
        <nav className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-8 transition-colors">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                    <Menu className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>

                {/* Search (Optional/Future) */}
                <div className="hidden md:flex relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all w-64"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Switch to Student View */}
                <Link href="/dashboard">
                    <Button
                        variant="outline"
                        className="hidden sm:flex items-center gap-2 text-sm border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl"
                    >
                        <GraduationCap className="w-4 h-4" />
                        Student View
                    </Button>
                </Link>

                <NotificationDropdown />

                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                <div className="relative group ml-1">
                    <button className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {profile?.first_name?.[0] || user?.email?.[0] || 'I'}
                        </div>
                    </button>

                    {/* Dropdown Menu */}
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                @{profile?.username || 'instructor'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                        </div>
                        <div className="p-1">
                            <Link href="/profile">
                                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg flex items-center gap-2 transition-colors">
                                    <User className="w-4 h-4" />
                                    <span>Profile</span>
                                </button>
                            </Link>
                            <Link href="/instructor/settings">
                                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg flex items-center gap-2 transition-colors">
                                    <Settings className="w-4 h-4" />
                                    <span>Settings</span>
                                </button>
                            </Link>
                            <button
                                onClick={signOut}
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
