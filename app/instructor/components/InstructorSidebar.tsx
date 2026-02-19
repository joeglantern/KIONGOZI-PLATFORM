"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    BookOpen,
    Users,
    BarChart3,
    MessageSquare,
    Settings,
    LogOut,
    Sparkles
} from 'lucide-react';
import { useUser } from '@/app/contexts/UserContext';
import { createBrowserClient } from '@/app/utils/supabase/client';
import { useRouter } from 'next/navigation';

export function InstructorSidebar() {
    const pathname = usePathname();
    const { user } = useUser();
    const router = useRouter();
    const supabase = createBrowserClient();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    const isActive = (path: string) => pathname === path || pathname?.startsWith(`${path}/`);

    const navItems = [
        { name: 'Dashboard', href: '/instructor/dashboard', icon: LayoutDashboard },
        { name: 'My Courses', href: '/instructor/courses', icon: BookOpen },
        { name: 'Students', href: '/instructor/students', icon: Users },
        { name: 'Analytics', href: '/instructor/analytics', icon: BarChart3 },
        { name: 'Messages', href: '/instructor/messages', icon: MessageSquare },
    ];

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col z-50 transition-colors">
            {/* Logo */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                <Link href="/instructor/dashboard" className="flex items-center space-x-2 group">
                    <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">Kiongozi <span className="text-orange-500 text-xs uppercase tracking-wider ml-1">Instructor</span></span>
                </Link>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                {navItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link key={item.href} href={item.href}>
                            <button
                                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all font-medium text-sm group ${active
                                    ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                    }`}>
                                <item.icon className={`w-5 h-5 ${active ? 'text-orange-500 dark:text-orange-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} />
                                <span>{item.name}</span>
                            </button>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
                <Link href="/instructor/settings">
                    <button className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors">
                        <Settings className="w-5 h-5" />
                        <span>Settings</span>
                    </button>
                </Link>
                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
}
