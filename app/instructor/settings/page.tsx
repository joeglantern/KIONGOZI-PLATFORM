"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { createClient } from '@/app/utils/supabase/client';
import { AuthIdentityManager } from '@/components/settings/AuthIdentityManager';
import {
    Settings,
    Bell,
    Lock,
    User,
    Globe,
    CheckCircle2,
    Shield,
    Loader2,
    Mail,
    AlertCircle,
    Accessibility,
} from 'lucide-react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useUser } from '@/app/contexts/UserContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

const NOTIFICATION_STORAGE_KEY = 'kiongozi-instructor-notifications';
const NOTIFICATION_OPTIONS = [
    { id: 'enrollments', title: 'Student enrollment alerts', desc: 'Notify me when someone joins my courses' },
    { id: 'messages', title: 'Message notifications', desc: 'Get alerted about new messages from students' },
    { id: 'reviews', title: 'Course review alerts', desc: 'Notify me when students leave feedback' },
] as const;
type NotificationPrefs = Record<typeof NOTIFICATION_OPTIONS[number]['id'], boolean>;
const DEFAULT_NOTIFICATIONS: NotificationPrefs = { enrollments: true, messages: true, reviews: true };

const LANGUAGE_OPTIONS = [
    { value: 'en', label: 'English' },
    { value: 'sw', label: 'Kiswahili' },
] as const;

const TAB_TITLES: Record<string, { title: string; desc: string }> = {
    account: { title: 'Account', desc: 'Your name and username as students see them.' },
    notifications: { title: 'Notifications', desc: 'Choose which alerts you want to receive.' },
    security: { title: 'Security', desc: 'Password and sign-in methods.' },
    accessibility: { title: 'Accessibility', desc: 'Contrast and text size for this device.' },
    preference: { title: 'Preferences', desc: 'Interface language.' },
};

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
    return (
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
                type="checkbox"
                className="sr-only peer"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                aria-label={label}
            />
            <span className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-focus-visible:ring-2 peer-focus-visible:ring-orange-500 peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-gray-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></span>
        </label>
    );
}

const tabs = [
    { id: 'account', name: 'Account', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Lock },
    { id: 'accessibility', name: 'Accessibility', icon: Accessibility },
    { id: 'preference', name: 'Preferences', icon: Globe },
];

export default function InstructorSettingsPage() {
    const { user, profile, refreshProfile } = useUser();
    const { contrast, setContrast, fontScale, setFontScale } = useTheme();
    const { language, setLanguage } = useLanguage();
    const [notifications, setNotifications] = useState<NotificationPrefs>(DEFAULT_NOTIFICATIONS);
    const supabase = useMemo(() => createClient(), []);
    const [activeTab, setActiveTab] = useState('account');
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const showsProfileActions = activeTab === 'account';

    const [form, setForm] = useState({
        username: profile?.username || '',
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
    });

    useEffect(() => {
        try {
            const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
            if (stored) setNotifications({ ...DEFAULT_NOTIFICATIONS, ...JSON.parse(stored) });
        } catch {
            // Ignore unreadable or blocked storage; defaults stay in place.
        }
    }, []);

    const updateNotification = (id: keyof NotificationPrefs, value: boolean) => {
        setNotifications((prev) => {
            const next = { ...prev, [id]: value };
            try {
                localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(next));
            } catch {
                // Storage can be unavailable (private mode); the toggle still reflects the choice.
            }
            return next;
        });
    };

    const handleDiscard = () => {
        setError(null);
        setForm({
            username: profile?.username || '',
            first_name: profile?.first_name || '',
            last_name: profile?.last_name || '',
        });
    };

    const isDirty =
        form.username !== (profile?.username || '') ||
        form.first_name !== (profile?.first_name || '') ||
        form.last_name !== (profile?.last_name || '');

    // Update form when profile loads
    useEffect(() => {
        if (profile) {
            setForm({
                username: profile.username || '',
                first_name: profile.first_name || '',
                last_name: profile.last_name || '',
            });
        }
    }, [profile]);

    const handleSave = async () => {
        if (!user) return;

        if (form.username.trim() && !/^[a-zA-Z0-9_]{3,30}$/.test(form.username.trim())) {
            setError('Usernames need 3 to 30 letters, numbers or underscores.');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    username: form.username.trim() ? form.username.trim().toLowerCase() : null,
                    first_name: form.first_name.trim(),
                    last_name: form.last_name.trim(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            await refreshProfile();
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            console.error('Error updating profile:', err);
            setError(err?.code === '23505'
                ? 'That username is already taken. Try another one.'
                : err.message || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ProtectedRoute allowedRoles={['instructor', 'admin']}>
            <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Settings className="w-8 h-8 text-orange-500" />
                            Instructor Settings
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Manage your instructor account and preferences
                        </p>
                    </div>
                    <AnimatePresence>
                        {saved && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex items-center space-x-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-4 py-2 rounded-2xl border border-green-100 dark:border-green-800"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-xs font-black uppercase tracking-widest">Saved</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="mt-4">
                    <Breadcrumb
                        items={[
                            { label: 'Dashboard', href: '/instructor/dashboard' },
                            { label: 'Settings' }
                        ]}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Tabs Sidebar: horizontal scroller on small screens */}
                    <div role="tablist" aria-label="Settings sections" className="flex lg:flex-col gap-2 overflow-x-auto pb-1 lg:pb-0 -mx-1 px-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`shrink-0 lg:w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${activeTab === tab.id
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                    : 'text-gray-500 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white border border-transparent hover:border-gray-100 dark:hover:border-gray-700'
                                    }`}
                            >
                                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-gray-400'}`} />
                                <span>{tab.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-3">
                        <section role="tabpanel" className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                            <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                                    {TAB_TITLES[activeTab]?.title}
                                </h2>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{TAB_TITLES[activeTab]?.desc}</p>
                            </div>

                            <div className="p-6 sm:p-8 space-y-8">
                                {activeTab === 'account' && (
                                    <div className="space-y-6">
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label htmlFor="instructor-first-name" className="text-xs font-black text-gray-400 uppercase tracking-widest">First name</label>
                                                <input
                                                    id="instructor-first-name"
                                                    autoComplete="given-name"
                                                    maxLength={60}
                                                    type="text"
                                                    value={form.first_name}
                                                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label htmlFor="instructor-last-name" className="text-xs font-black text-gray-400 uppercase tracking-widest">Last name</label>
                                                <input
                                                    id="instructor-last-name"
                                                    autoComplete="family-name"
                                                    maxLength={60}
                                                    type="text"
                                                    value={form.last_name}
                                                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="instructor-username" className="text-xs font-black text-gray-400 uppercase tracking-widest">Username</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold" aria-hidden="true">@</span>
                                                <input
                                                    id="instructor-username"
                                                    autoComplete="username"
                                                    maxLength={30}
                                                    type="text"
                                                    value={form.username}
                                                    onChange={(e) => setForm({ ...form, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                                                    className="w-full pl-9 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Instructor ID (reference)</p>
                                            <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-400 font-bold truncate text-xs">
                                                {user?.id}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Email address</p>
                                            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-500 dark:text-gray-400 font-bold min-w-0">
                                                <Mail className="w-4 h-4 shrink-0" />
                                                <span className="truncate">{user?.email}</span>
                                                <div className="ml-auto shrink-0 text-[10px] bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-md uppercase tracking-tighter">
                                                    {user?.email_confirmed_at ? 'Verified' : 'Unverified'}
                                                </div>
                                            </div>
                                        </div>

                                        <AuthIdentityManager email={user?.email} />

                                        {error && (
                                            <div role="alert" className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4" />
                                                {error}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'notifications' && (
                                    <div className="space-y-4">
                                        {NOTIFICATION_OPTIONS.map((opt) => (
                                            <div key={opt.id} className="flex items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                                                <div>
                                                    <div className="text-sm font-black text-gray-900 dark:text-white">{opt.title}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{opt.desc}</div>
                                                </div>
                                                <Toggle
                                                    label={opt.title}
                                                    checked={notifications[opt.id]}
                                                    onChange={(next) => updateNotification(opt.id, next)}
                                                />
                                            </div>
                                        ))}
                                        <p className="text-xs text-gray-400">These choices are saved on this device.</p>
                                    </div>
                                )}

                                {activeTab === 'security' && (
                                    <div className="space-y-6">
                                        <div className="p-6 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-[1.5rem] flex items-start space-x-4">
                                            <div className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                                                <Shield className="w-5 h-5 text-orange-500" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-orange-900 dark:text-orange-200">Security Recommendation</div>
                                                <p className="text-xs font-medium text-orange-800 dark:text-orange-300 leading-relaxed mt-1">
                                                    Ensure your password is strong and changed regularly to protect your course content and student data.
                                                </p>
                                            </div>
                                        </div>
                                        <Link
                                            href="/forgot-password"
                                            className="block w-full text-center px-6 py-4 bg-gray-900 dark:bg-gray-700 text-white font-black rounded-2xl hover:bg-gray-800 dark:hover:bg-gray-600 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                                        >
                                            Change password
                                        </Link>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center -mt-3">We&apos;ll email you a secure link to set a new password.</p>
                                    </div>
                                )}

                                {activeTab === 'accessibility' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                                            <div className="flex items-center space-x-3">
                                                <Shield className="w-5 h-5 text-gray-400" />
                                                <div>
                                                    <div className="text-sm font-black text-gray-900 dark:text-white">High Contrast Mode</div>
                                                    <div className="text-xs text-gray-500 font-medium tracking-tight">Increases contrast for better visibility (Yellow on Black)</div>
                                                </div>
                                            </div>
                                            <Toggle
                                                label="High contrast mode"
                                                checked={contrast === 'high'}
                                                onChange={(next) => setContrast(next ? 'high' : 'standard')}
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Text Scaling (Global)</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                                {[
                                                    { label: 'Normal', value: 1.0 },
                                                    { label: 'Large', value: 1.25 },
                                                    { label: 'Extra Large', value: 1.5 },
                                                ].map((scale) => (
                                                    <button
                                                        key={scale.value}
                                                        type="button"
                                                        aria-pressed={fontScale === scale.value}
                                                        onClick={() => setFontScale(scale.value)}
                                                        className={`p-4 rounded-2xl border transition-all font-bold text-center ${fontScale === scale.value
                                                            ? 'bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-600/20'
                                                            : 'bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-transparent hover:border-gray-200'
                                                            }`}
                                                    >
                                                        <div className="text-sm">{scale.label}</div>
                                                        <div className="text-[10px] mt-1 opacity-60">{(scale.value * 100).toFixed(0)}%</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'preference' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                                            <div className="flex items-center space-x-3">
                                                <Globe className="w-5 h-5 text-gray-400" />
                                                <div>
                                                    <div className="text-sm font-black text-gray-900 dark:text-white">Interface Language</div>
                                                    <div className="text-xs text-gray-500">Choose your preferred language</div>
                                                </div>
                                            </div>
                                            <label htmlFor="instructor-language" className="sr-only">Interface language</label>
                                            <select
                                                id="instructor-language"
                                                value={LANGUAGE_OPTIONS.some(o => o.value === language) ? language : 'en'}
                                                onChange={(e) => setLanguage(e.target.value as 'en' | 'sw')}
                                                className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                                            >
                                                {LANGUAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {showsProfileActions && (
                                    <div className="pt-8 flex justify-end items-center space-x-4">
                                        <button
                                            type="button"
                                            onClick={handleDiscard}
                                            disabled={!isDirty || isSaving}
                                            className="text-sm font-black text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            Discard
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSave}
                                            disabled={isSaving || !isDirty}
                                            className="px-8 py-3 bg-orange-600 text-white font-black rounded-2xl shadow-lg shadow-orange-600/20 hover:bg-orange-700 transition-all flex items-center space-x-2 active:scale-95 disabled:opacity-50"
                                        >
                                            {isSaving ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <span>Update profile</span>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
