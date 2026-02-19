"use client";

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/app/utils/supabase/client';
import { useUser } from '@/app/contexts/UserContext';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import {
    User,
    Mail,
    Shield,
    Camera,
    Save,
    Loader2,
    CheckCircle2,
    ArrowLeft,
    Trophy,
    Star,
    Award
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProfilePage() {
    const { user, profile, refreshProfile } = useUser();
    const supabase = createBrowserClient();

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        full_name: '',
        bio: ''
    });

    useEffect(() => {
        if (profile) {
            setFormData({
                first_name: profile.first_name || '',
                last_name: profile.last_name || '',
                full_name: profile.full_name || '',
                bio: profile.bio || ''
            });
        }
    }, [profile]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            setLoading(true);
            setError(null);
            setSuccess(false);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    full_name: formData.full_name,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            await refreshProfile();
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
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
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">Your Profile</h1>
                            <div className="flex items-center space-x-2 bg-orange-50 px-4 py-2 rounded-2xl border border-orange-100">
                                <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
                                <span className="text-xs font-black text-orange-700 uppercase tracking-widest">
                                    VIP Learner
                                </span>
                            </div>
                        </div>
                        <Breadcrumb items={[{ label: 'Profile' }]} />
                    </div>

                    <div className="max-w-4xl w-full mx-auto px-4 py-12">
                        {/* Profile Hero Card */}
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 mb-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -mr-32 -mt-32 transition-colors group-hover:bg-orange-500/10" />

                            <div className="relative z-10 flex flex-col md:flex-row md:items-center space-y-6 md:space-y-0 md:space-x-8">
                                <div className="relative">
                                    <div className="w-32 h-32 bg-orange-100 rounded-[2rem] flex items-center justify-center text-4xl font-black text-orange-600 border-4 border-white shadow-xl ring-2 ring-orange-50">
                                        {profile?.first_name?.[0] || 'L'}
                                    </div>
                                    <button className="absolute -bottom-2 -right-2 p-2.5 bg-white rounded-2xl shadow-lg border border-gray-100 text-gray-400 hover:text-orange-500 transition-all hover:scale-110">
                                        <Camera className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex-1">
                                    <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-1">
                                        {profile?.full_name || 'Anonymous Learner'}
                                    </h2>
                                    <div className="flex flex-wrap gap-3 mb-4">
                                        <div className="flex items-center space-x-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                                            <span className="text-xs font-bold text-gray-600">{user?.email}</span>
                                        </div>
                                        <div className="flex items-center space-x-1.5 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100">
                                            <Shield className="w-3.5 h-3.5 text-orange-500" />
                                            <span className="text-xs font-black text-orange-700 uppercase">{profile?.role}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="text-center md:text-left">
                                            <div className="text-xl font-black text-gray-900">{profile?.total_xp || 0}</div>
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total XP</div>
                                        </div>
                                        <div className="text-center md:text-left border-x border-gray-100 px-4">
                                            <div className="text-xl font-black text-amber-600">Lvl {profile?.level || 1}</div>
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rank</div>
                                        </div>
                                        <div className="text-center md:text-left">
                                            <div className="text-xl font-black text-blue-600">
                                                {profile?.total_badges || 0}
                                            </div>
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Badges</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Edit Form */}
                            <div className="lg:col-span-2 space-y-8">
                                <section className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-lg font-black text-gray-900 tracking-tight">Personal Information</h3>
                                        <AnimatePresence>
                                            {success && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    className="flex items-center space-x-1 text-green-600"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    <span className="text-xs font-bold">Saved!</span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">First Name</label>
                                                <input
                                                    type="text"
                                                    value={formData.first_name}
                                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/30 transition-all font-bold text-gray-900"
                                                    placeholder="First Name"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Last Name</label>
                                                <input
                                                    type="text"
                                                    value={formData.last_name}
                                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/30 transition-all font-bold text-gray-900"
                                                    placeholder="Last Name"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Display Name (Visible to others)</label>
                                            <input
                                                type="text"
                                                value={formData.full_name}
                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/30 transition-all font-bold text-gray-900"
                                                placeholder="e.g. Leader Lion"
                                            />
                                        </div>

                                        {error && (
                                            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-red-600 text-xs font-bold">
                                                {error}
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full md:w-auto px-10 py-4 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-2xl shadow-lg shadow-orange-600/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center space-x-2"
                                        >
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                            <span>Save Changes</span>
                                        </button>
                                    </form>
                                </section>

                                {/* Security Section */}
                                <section className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8">
                                    <h3 className="text-lg font-black text-gray-900 tracking-tight mb-8">Security & Password</h3>
                                    <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-gray-50 rounded-[1.5rem] border border-gray-100 space-y-4 md:space-y-0">
                                        <div className="flex items-center space-x-4">
                                            <div className="p-3 bg-white rounded-xl shadow-sm">
                                                <Shield className="w-6 h-6 text-gray-400" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-gray-900">Account Password</div>
                                                <div className="text-xs font-medium text-gray-500">Update your security credentials regularly</div>
                                            </div>
                                        </div>
                                        <Link
                                            href="/forgot-password"
                                            className="px-6 py-3 bg-white hover:bg-gray-100 text-gray-900 font-black rounded-xl border border-gray-200 shadow-sm transition-all text-sm text-center"
                                        >
                                            Change Password
                                        </Link>
                                    </div>
                                </section>
                            </div>

                            {/* Sidebar Info */}
                            <div className="space-y-8">
                                <div className="bg-gray-900 rounded-[2rem] p-8 text-white relative overflow-hidden">
                                    <div className="relative z-10">
                                        <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                                            <Award className="w-6 h-6 text-orange-400" />
                                        </div>
                                        <h4 className="text-lg font-black mb-2 tracking-tight">Achievement Stats</h4>
                                        <p className="text-gray-400 text-sm font-medium italic mb-6">Keep learning to increase these metrics!</p>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                                                <span className="text-xs font-bold text-gray-300">Total XP</span>
                                                <span className="text-sm font-black">{profile?.total_xp || 0}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                                                <span className="text-xs font-bold text-gray-300">Current Streak</span>
                                                <span className="text-sm font-black">{profile?.current_streak || 0} Days</span>
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                                                <span className="text-xs font-bold text-gray-300">Level</span>
                                                <span className="text-sm font-black">{profile?.level || 1}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-orange-50 rounded-[2rem] p-8 border border-orange-100">
                                    <h4 className="text-sm font-black text-orange-900 uppercase tracking-widest mb-4">Quick Tip</h4>
                                    <p className="text-orange-800 text-sm font-medium leading-relaxed">
                                        A complete profile with a display name and avatar helps you stand out on the **Leaderboard** and build your reputation.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
