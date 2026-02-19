"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    BookOpen,
    Trophy,
    User,
    Settings,
    LogOut,
    Sparkles,
    ChevronRight,
    ChevronLeft,
    PanelLeftClose,
    PanelLeftOpen,
    Award,
    Search,
    MessageSquare,
    Bookmark,
    StickyNote
} from 'lucide-react';
import { useUser } from '@/app/contexts/UserContext';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Browse', icon: Search, href: '/courses' },
    { name: 'My Learning', icon: BookOpen, href: '/my-learning' },
    { name: 'Messages', icon: MessageSquare, href: '/messages' },
    { name: 'Bookmarks', icon: Bookmark, href: '/bookmarks' },
    { name: 'Notes', icon: StickyNote, href: '/notes' },
    {
        name: 'Achievements',
        icon: Award,
        href: '#',
        subItems: [
            { name: 'Badges', href: '/profile/achievements' },
            { name: 'Certificates', href: '/certificates' }
        ]
    },
    { name: 'Profile', icon: User, href: '/profile' },
    { name: 'Settings', icon: Settings, href: '/settings' },
];

export function DashboardSidebar() {
    const pathname = usePathname();
    const { profile, signOut } = useUser();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);

    const toggleSubMenu = (name: string) => {
        setOpenSubMenu(openSubMenu === name ? null : name);
    };

    return (
        <motion.aside
            initial={false}
            animate={{ width: isCollapsed ? 80 : 256 }}
            className="bg-white border-r border-gray-100 flex flex-col h-[calc(100vh-64px)] sticky top-16 transition-all duration-300 ease-in-out overflow-hidden"
        >
            {/* Toggle Button */}
            <div className={`p-4 flex ${isCollapsed ? 'justify-center' : 'justify-end'} border-b border-gray-50`}>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-orange-500 transition-colors"
                >
                    {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                </button>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 px-3 space-y-2 py-6 overflow-y-auto">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href || (item.subItems?.some(si => pathname === si.href));
                    const isSubMenuOpen = openSubMenu === item.name;

                    if (item.subItems && !isCollapsed) {
                        return (
                            <div key={item.name} className="space-y-1">
                                <button
                                    onClick={() => toggleSubMenu(item.name)}
                                    className={`w-full flex items-center justify-between group px-3 py-3 rounded-2xl transition-all duration-200 ${isActive
                                        ? 'bg-orange-50 text-orange-600'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-orange-600' : 'text-gray-400 group-hover:text-gray-900'}`} />
                                        <span className={`font-bold text-sm whitespace-nowrap ${isActive ? 'text-orange-600' : ''}`}>
                                            {item.name}
                                        </span>
                                    </div>
                                    <motion.div
                                        animate={{ rotate: isSubMenuOpen ? 90 : 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <ChevronRight className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-gray-300'}`} />
                                    </motion.div>
                                </button>

                                <AnimatePresence>
                                    {isSubMenuOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden bg-gray-50/50 rounded-2xl mx-1"
                                        >
                                            {item.subItems.map((subItem) => {
                                                const isSubActive = pathname === subItem.href;
                                                return (
                                                    <Link
                                                        key={subItem.name}
                                                        href={subItem.href}
                                                        className={`flex items-center px-10 py-2.5 text-xs font-bold transition-all ${isSubActive
                                                            ? 'text-orange-600'
                                                            : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100/50'
                                                            }`}
                                                    >
                                                        {isSubActive && <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-2" />}
                                                        {subItem.name}
                                                    </Link>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            title={isCollapsed ? item.name : ''}
                            className={`flex items-center group px-3 py-3 rounded-2xl transition-all duration-200 ${isActive
                                ? 'bg-orange-50 text-orange-600 shadow-sm'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
                        >
                            <div className="flex items-center space-x-3">
                                <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-orange-600' : 'text-gray-400 group-hover:text-gray-900'}`} />
                                {!isCollapsed && (
                                    <span className={`font-bold text-sm whitespace-nowrap overflow-hidden ${isActive ? 'text-orange-600' : ''}`}>
                                        {item.name}
                                    </span>
                                )}
                            </div>
                            {!isCollapsed && isActive && <ChevronRight className="w-4 h-4 text-orange-400" />}
                        </Link>
                    );
                })}
            </nav>

            {/* User Profile Summary */}
            <div className="p-3 mt-auto">
                <div className={`bg-gray-50 rounded-3xl border border-gray-100 mb-4 transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-4'}`}>
                    <div className={`flex items-center mb-3 ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex-shrink-0 flex items-center justify-center text-orange-600 font-bold border-2 border-white shadow-sm">
                            {profile?.first_name?.[0] || 'L'}
                        </div>
                        {!isCollapsed && (
                            <div className="overflow-hidden">
                                <div className="text-sm font-black text-gray-900 line-clamp-1">{profile?.full_name || 'Learner'}</div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{profile?.role || 'Student'}</div>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={signOut}
                        title={isCollapsed ? 'Sign Out' : ''}
                        className={`w-full flex items-center justify-center py-2 rounded-xl text-xs font-bold transition-colors ${isCollapsed
                            ? 'text-red-400 hover:bg-red-50'
                            : 'space-x-2 px-4 text-red-500 hover:bg-red-50 hover:text-red-600'
                            }`}
                    >
                        <LogOut className="w-4 h-4" />
                        {!isCollapsed && <span>Sign Out</span>}
                    </button>
                </div>

                {!isCollapsed && (
                    <div className="text-center pb-2">
                        <p className="text-[10px] text-gray-400 font-medium tracking-tight">Version 1.2.0</p>
                    </div>
                )}
            </div>
        </motion.aside>
    );
}
