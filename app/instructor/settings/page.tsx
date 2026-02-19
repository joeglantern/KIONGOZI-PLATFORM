"use client";

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { createClient } from '@/app/utils/supabaseClient';
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
    Type,
    Volume2
} from 'lucide-react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useUser } from '@/app/contexts/UserContext';
import { motion, AnimatePresence } from 'framer-motion';

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
    const supabase = createClient();
    const [activeTab, setActiveTab] = useState('account');
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        full_name: profile?.full_name || '',
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
    });

    // Update form when profile loads
    useEffect(() => {
        if (profile) {
            setForm({
                full_name: profile.full_name || '',
                first_name: profile.first_name || '',
                last_name: profile.last_name || '',
            });
        }
    }, [profile]);

    const handleSave = async () => {
        if (!user) return;

        setIsSaving(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    full_name: form.full_name,
                    first_name: form.first_name,
                    last_name: form.last_name,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            await refreshProfile();
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            console.error('Error updating profile:', err);
            setError(err.message || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ProtectedRoute allowedRoles={['instructor', 'admin']}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
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
                    {/* Tabs Sidebar */}
                    <div className="space-y-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${activeTab === tab.id
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
                        <section className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="p-8 border-b border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight capitalize">
                                    {activeTab} Settings
                                </h2>
                                <p className="text-sm font-medium text-gray-400">Manage your {activeTab} information.</p>
                            </div>

                            <div className="p-8 space-y-8">
                                {activeTab === 'account' && (
                                    <div className="space-y-6">
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">First Name</label>
                                                <input
                                                    type="text"
                                                    value={form.first_name}
                                                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Last Name</label>
                                                <input
                                                    type="text"
                                                    value={form.last_name}
                                                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Full Name (Display Name)</label>
                                            <input
                                                type="text"
                                                value={form.full_name}
                                                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Instructor ID (Reference)</label>
                                            <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-400 font-bold truncate text-xs">
                                                {user?.id}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Email Address</label>
                                            <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-400 font-bold">
                                                <Mail className="w-4 h-4" />
                                                <span>{user?.email}</span>
                                                <div className="ml-auto text-[10px] bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-md uppercase tracking-tighter">Verified</div>
                                            </div>
                                        </div>

                                        {error && (
                                            <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4" />
                                                {error}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'notifications' && (
                                    <div className="space-y-4">
                                        {[
                                            { title: 'Student Enrollment Alerts', desc: 'Notify me when someone joins my courses' },
                                            { title: 'Message Notifications', desc: 'Get alerted about new messages from students' },
                                            { title: 'Course Review Alerts', desc: 'Notify me when students leave feedback' },
                                        ].map((opt, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl group transition-all">
                                                <div>
                                                    <div className="text-sm font-black text-gray-900 dark:text-white">{opt.title}</div>
                                                    <div className="text-xs text-gray-500 font-medium">{opt.desc}</div>
                                                </div>
                                                <div className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" className="sr-only peer" defaultChecked />
                                                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                                </div>
                                            </div>
                                        ))}
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
                                        <button
                                            className="w-full text-center px-6 py-4 bg-gray-900 dark:bg-gray-700 text-white font-black rounded-2xl hover:bg-gray-800 dark:hover:bg-gray-600 transition-all hover:scale-[1.01] active:scale-[0.98]"
                                        >
                                            Change Password
                                        </button>
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
                                            <div className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={contrast === 'high'}
                                                    onChange={(e) => setContrast(e.target.checked ? 'high' : 'standard')}
                                                />
                                                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Text Scaling (Global)</label>
                                            <div className="grid grid-cols-3 gap-4">
                                                {[
                                                    { label: 'Normal', value: 1.0 },
                                                    { label: 'Large', value: 1.25 },
                                                    { label: 'Extra Large', value: 1.5 },
                                                ].map((scale) => (
                                                    <button
                                                        key={scale.value}
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
                                            <span className="text-sm font-black text-orange-500">English (US)</span>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-8 flex justify-end items-center space-x-4">
                                    <button className="text-sm font-black text-gray-400 hover:text-gray-600 transition-colors">Discard</button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="px-8 py-3 bg-orange-600 text-white font-black rounded-2xl shadow-lg shadow-orange-600/20 hover:bg-orange-700 transition-all flex items-center space-x-2 active:scale-95 disabled:opacity-50"
                                    >
                                        {isSaving ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <span>Update Profile</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
