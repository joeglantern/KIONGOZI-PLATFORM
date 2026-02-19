"use client";

import { useState } from 'react';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
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
    Accessibility,
    Volume2
} from 'lucide-react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useUser } from '@/app/contexts/UserContext';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const tabs = [
    { id: 'account', name: 'Account', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Lock },
    { id: 'accessibility', name: 'Accessibility', icon: Accessibility },
    { id: 'preference', name: 'Preferences', icon: Globe },
];

export default function SettingsPage() {
    const { user } = useUser();
    const { contrast, setContrast, fontScale, setFontScale } = useTheme();
    const [activeTab, setActiveTab] = useState('account');
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }, 1000);
    };

    return (
        <ProtectedRoute allowedRoles={['user', 'instructor', 'admin']}>
            <div className="flex min-h-screen bg-gray-50/50">
                <div className="hidden lg:block">
                    <DashboardSidebar />
                </div>

                <div className="flex-1 flex flex-col min-h-screen">
                    {/* Header Nav */}
                    <div className="bg-white border-b border-gray-100 px-8 py-6 sticky top-0 z-10 flex flex-col space-y-4">
                        <div className="flex items-center justify-between">
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">Settings</h1>
                            <AnimatePresence>
                                {saved && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="flex items-center space-x-2 bg-green-50 text-green-600 px-4 py-2 rounded-2xl border border-green-100"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span className="text-xs font-black uppercase tracking-widest">Saved Successfully</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <Breadcrumb items={[{ label: 'Settings' }]} />
                    </div>

                    <div className="max-w-5xl w-full mx-auto px-4 py-12">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                            {/* Tabs Sidebar */}
                            <div className="space-y-2">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${activeTab === tab.id
                                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                            : 'text-gray-500 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-100'
                                            }`}
                                    >
                                        <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-gray-400'}`} />
                                        <span>{tab.name}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Main Content Area */}
                            <div className="lg:col-span-3">
                                <section className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="p-8 border-b border-gray-50 bg-gray-50/50">
                                        <h2 className="text-xl font-black text-gray-900 tracking-tight capitalize">
                                            {activeTab} Settings
                                        </h2>
                                        <p className="text-sm font-medium text-gray-400">Manage your {activeTab} information and preferences.</p>
                                    </div>

                                    <div className="p-8 space-y-8">
                                        {activeTab === 'account' && (
                                            <div className="space-y-6">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Email Address</label>
                                                    <div className="flex items-center space-x-3 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-400 font-bold">
                                                        <Mail className="w-4 h-4" />
                                                        <span>{user?.email || 'user@example.com'}</span>
                                                        <div className="ml-auto text-[10px] bg-gray-200 px-2 py-1 rounded-md uppercase tracking-tighter">Verified</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === 'accessibility' && (
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group transition-all border border-transparent hover:border-gray-100">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="p-2 bg-orange-50 text-orange-500 rounded-xl group-hover:scale-110 transition-transform">
                                                            <Accessibility className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black text-gray-900">High Contrast Mode</div>
                                                            <div className="text-xs text-gray-500 font-medium leading-tight">Increases contrast for better visibility (Yellow on Black)</div>
                                                        </div>
                                                    </div>
                                                    <div className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={contrast === 'high'}
                                                            onChange={(e) => setContrast(e.target.checked ? 'high' : 'standard')}
                                                        />
                                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
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
                                                                    ? 'bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-600/20 scale-[1.02]'
                                                                    : 'bg-gray-50 text-gray-900 border-transparent hover:border-gray-200 hover:bg-gray-100'
                                                                    }`}
                                                            >
                                                                <div className="text-sm">{scale.label}</div>
                                                                <div className="text-[10px] mt-1 opacity-60">{(scale.value * 100).toFixed(0)}%</div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group transition-all">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="p-2 bg-blue-50 text-blue-500 rounded-xl">
                                                            <Volume2 className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black text-gray-900">Audio Assistance</div>
                                                            <div className="text-xs text-gray-500 font-medium">Text-to-Speech is available in lesson viewer</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs font-black text-orange-500 uppercase tracking-widest">Active</div>
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === 'notifications' && (
                                            <div className="space-y-4">
                                                {[
                                                    { title: 'Email Notifications', desc: 'Receive updates about your courses via email' },
                                                    { title: 'Browser Push', desc: 'Get real-time alerts about announcements' },
                                                    { title: 'Achievement Alerts', desc: 'Be notified when you earn a new badge' },
                                                ].map((opt, i) => (
                                                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all">
                                                        <div>
                                                            <div className="text-sm font-black text-gray-900">{opt.title}</div>
                                                            <div className="text-xs text-gray-500 font-medium">{opt.desc}</div>
                                                        </div>
                                                        <div className="relative inline-flex items-center cursor-pointer">
                                                            <input type="checkbox" className="sr-only peer" defaultChecked />
                                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {activeTab === 'security' && (
                                            <div className="space-y-6">
                                                <div className="p-6 bg-orange-50 border border-orange-100 rounded-[1.5rem] flex items-start space-x-4">
                                                    <div className="p-2 bg-white rounded-xl shadow-sm">
                                                        <Shield className="w-5 h-5 text-orange-500" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-orange-900">Security Recommendation</div>
                                                        <p className="text-xs font-medium text-orange-800 leading-relaxed mt-1">
                                                            We recommend enabling Two-Factor Authentication (2FA) to keep your learning progress safe from unauthorized access.
                                                        </p>
                                                    </div>
                                                </div>
                                                <Link
                                                    href="/forgot-password"
                                                    className="inline-block w-full text-center px-6 py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-gray-800 transition-all hover:scale-[1.01] active:scale-[0.98]"
                                                >
                                                    Manage Password
                                                </Link>
                                            </div>
                                        )}

                                        {activeTab === 'preference' && (
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer group border border-transparent hover:border-gray-100">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="p-2 bg-blue-50 text-blue-500 rounded-xl">
                                                            <Globe className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-sm font-bold text-gray-700">Interface Language</span>
                                                    </div>
                                                    <span className="text-xs font-black text-gray-400 group-hover:text-orange-500 transition-colors">English (US)</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="pt-8 flex justify-end items-center space-x-4">
                                            <button className="text-sm font-black text-gray-400 hover:text-gray-600 transition-colors">Discard Changes</button>
                                            <button
                                                onClick={handleSave}
                                                disabled={isSaving}
                                                className="px-8 py-3 bg-orange-600 text-white font-black rounded-2xl shadow-lg shadow-orange-600/20 hover:bg-orange-700 transition-all flex items-center space-x-2 active:scale-95 disabled:opacity-50"
                                            >
                                                {isSaving ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <span>Save Preferences</span>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
