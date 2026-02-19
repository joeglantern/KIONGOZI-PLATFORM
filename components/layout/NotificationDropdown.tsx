"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import {
    Bell,
    MessageCircle,
    BookOpen,
    Award,
    GraduationCap,
    CheckCircle2,
    TrendingUp,
    Flame,
    X,
    CheckCheck,
} from 'lucide-react';

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
    message: { icon: MessageCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
    new_course: { icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50' },
    badge_earned: { icon: Award, color: 'text-amber-600', bg: 'bg-amber-50' },
    certificate: { icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    course_completed: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    level_up: { icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
    streak: { icon: Flame, color: 'text-red-500', bg: 'bg-red-50' },
};

function timeAgo(dateString: string) {
    const diff = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateString).toLocaleDateString();
}

export function NotificationDropdown() {
    const { notifications, unreadCount, loading, markAsRead, markAllRead } = useNotifications();
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = (n: Notification) => {
        if (!n.is_read) markAsRead(n.id);
        if (n.link) router.push(n.link);
        setOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all"
                aria-label="Notifications"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-black rounded-full px-1 shadow-lg shadow-red-500/30 animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {open && (
                <div className="absolute right-0 mt-2 w-[380px] max-h-[480px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50" style={{ animation: 'fadeInDown 0.2s ease-out' }}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="text-[10px] font-black bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="text-xs font-bold text-orange-600 hover:text-orange-700 px-2 py-1 rounded-lg hover:bg-orange-50 transition-colors flex items-center gap-1"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    Read all
                                </button>
                            )}
                            <button
                                onClick={() => setOpen(false)}
                                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="overflow-y-auto max-h-[380px] divide-y divide-gray-50">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="text-center py-12 px-6">
                                <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Bell className="w-6 h-6 text-gray-300" />
                                </div>
                                <p className="text-sm font-bold text-gray-400">No notifications yet</p>
                                <p className="text-xs text-gray-300 mt-1">We'll notify you when something happens</p>
                            </div>
                        ) : (
                            notifications.map((n) => {
                                const config = typeConfig[n.type] || typeConfig.message;
                                const Icon = config.icon;
                                return (
                                    <button
                                        key={n.id}
                                        onClick={() => handleNotificationClick(n)}
                                        className={`w-full text-left px-5 py-3.5 flex items-start gap-3.5 hover:bg-gray-50/80 transition-colors ${!n.is_read ? 'bg-orange-50/30' : ''
                                            }`}
                                    >
                                        <div className={`flex-shrink-0 w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center mt-0.5`}>
                                            <Icon className={`w-4 h-4 ${config.color}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className={`text-xs font-bold leading-snug ${!n.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                                                    {n.title}
                                                </p>
                                                {!n.is_read && (
                                                    <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                                            <p className="text-[10px] text-gray-300 font-bold mt-1">{timeAgo(n.created_at)}</p>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}} />
        </div>
    );
}
