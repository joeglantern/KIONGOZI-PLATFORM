"use client";

import Image from 'next/image';
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
    X,
} from 'lucide-react';
import { useUser } from '@/app/contexts/UserContext';

const navItems = [
    { name: 'Dashboard', href: '/instructor/dashboard', icon: LayoutDashboard },
    { name: 'My courses', href: '/instructor/courses', icon: BookOpen },
    { name: 'Students', href: '/instructor/students', icon: Users },
    { name: 'Analytics', href: '/instructor/analytics', icon: BarChart3 },
    { name: 'Messages', href: '/instructor/messages', icon: MessageSquare },
];

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900';

export function InstructorSidebar({ onClose }: { onClose?: () => void }) {
    const pathname = usePathname();
    const { signOut } = useUser();

    const isActive = (path: string) => pathname === path || pathname?.startsWith(`${path}/`);
    const settingsActive = isActive('/instructor/settings');

    return (
        <aside className="fixed left-0 top-0 h-[100dvh] w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col z-50 transition-colors">
            {/* Logo */}
            <div className="h-16 px-5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                <Link href="/instructor/dashboard" className={`flex items-center gap-2 group rounded-lg ${focusRing}`}>
                    <Image
                        src="/logo.png"
                        alt=""
                        width={32}
                        height={32}
                        className="w-8 h-8 object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
                    />
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                        Kiongozi <span className="text-orange-500 text-xs uppercase tracking-wider ml-1">Instructor</span>
                    </span>
                </Link>
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close menu"
                        className={`p-2 -mr-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${focusRing}`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Nav Items */}
            <nav aria-label="Instructor" className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                {navItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors font-medium text-sm group ${focusRing} ${active
                                ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            <item.icon className={`w-5 h-5 ${active ? 'text-orange-500 dark:text-orange-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-1">
                <Link
                    href="/instructor/settings"
                    aria-current={settingsActive ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${focusRing} ${settingsActive
                        ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                        }`}
                >
                    <Settings className="w-5 h-5" />
                    <span>Settings</span>
                </Link>
                <button
                    type="button"
                    onClick={signOut}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors ${focusRing}`}
                >
                    <LogOut className="w-5 h-5" />
                    <span>Sign out</span>
                </button>
            </div>
        </aside>
    );
}
