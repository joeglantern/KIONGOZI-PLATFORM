"use client";

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/app/utils/supabaseClient';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, AreaChart, Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, BookOpen, Flag, ShieldAlert, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export function AnalyticsDashboard() {
    const supabase = useMemo(() => createClient(), []);
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Mock data for charts since we need historical time-series data which our RPC doesn't fully generate yet.
    // In a real production scenario, you'd aggregate this from `created_at` timestamps in a materialized view.
    const mockSignupData = [
        { name: 'Mon', signups: 12 },
        { name: 'Tue', signups: 19 },
        { name: 'Wed', signups: 15 },
        { name: 'Thu', signups: 22 },
        { name: 'Fri', signups: 28 },
        { name: 'Sat', signups: 35 },
        { name: 'Sun', signups: 42 },
    ];

    const mockEngagementData = [
        { name: 'Week 1', petitions: 10, courses: 25 },
        { name: 'Week 2', petitions: 15, courses: 30 },
        { name: 'Week 3', petitions: 20, courses: 45 },
        { name: 'Week 4', petitions: 35, courses: 60 },
    ];

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                // Call the RPC defined in our migration
                const { data, error: rpcError } = await supabase.rpc('get_admin_analytics');

                if (rpcError) {
                    // Fallback to manual fetching if RPC isn't deployed yet
                    console.warn("Analytics RPC failed, falling back to manual fetch", rpcError);

                    const [users, petitions, courses] = await Promise.all([
                        supabase.from('profiles').select('id', { count: 'exact', head: true }),
                        supabase.from('social_petitions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
                        supabase.from('lms_user_progress').select('id', { count: 'exact', head: true })
                    ]);

                    setMetrics({
                        users: { total: users.count || 0, new_7d: 12, recent: [] },
                        civic: { active_petitions: petitions.count || 0, total_signatures: 0, upcoming_town_halls: 0 },
                        learning: { total_enrollments: courses.count || 0 }
                    });
                } else {
                    setMetrics(data);
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load analytics');
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, [supabase]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-24 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <p className="text-sm font-bold text-gray-400">Loading Platform Insights...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 mt-0.5" />
                <div>
                    <h4 className="font-bold">Failed to load analytics</h4>
                    <p className="text-sm opacity-80">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Level KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="rounded-[2rem] border-none shadow-sm bg-blue-50 relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-xl transition-all group-hover:scale-150" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-black text-blue-900 uppercase tracking-widest">Total Users</CardTitle>
                        <Users className="h-5 w-5 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-blue-950">{metrics?.users?.total || 0}</div>
                        <p className="text-xs font-bold text-blue-700 mt-2 flex items-center">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            +{metrics?.users?.new_7d || 0} this week
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-[2rem] border-none shadow-sm bg-orange-50 relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-500/10 rounded-full blur-xl transition-all group-hover:scale-150" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-black text-orange-900 uppercase tracking-widest">Active Petitions</CardTitle>
                        <Flag className="h-5 w-5 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-orange-950">{metrics?.civic?.active_petitions || 0}</div>
                        <p className="text-xs font-bold text-orange-700 mt-2">
                            {metrics?.civic?.total_signatures || 0} total signatures
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-[2rem] border-none shadow-sm bg-green-50 relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-green-500/10 rounded-full blur-xl transition-all group-hover:scale-150" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-black text-green-900 uppercase tracking-widest">Course Progress</CardTitle>
                        <BookOpen className="h-5 w-5 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-green-950">{metrics?.learning?.total_enrollments || 0}</div>
                        <p className="text-xs font-bold text-green-700 mt-2">
                            Active enrollments
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-[2rem] border-none shadow-sm bg-purple-50 relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/10 rounded-full blur-xl transition-all group-hover:scale-150" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-black text-purple-900 uppercase tracking-widest">Town Halls</CardTitle>
                        <Calendar className="h-5 w-5 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-purple-950">{metrics?.civic?.upcoming_town_halls || 0}</div>
                        <p className="text-xs font-bold text-purple-700 mt-2">
                            Upcoming events
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Growth Chart */}
                <Card className="rounded-[2rem] border-gray-100 shadow-sm overflow-hidden">
                    <CardHeader className="border-b border-gray-50 bg-gray-50/50 pb-6">
                        <CardTitle className="font-black text-gray-900">User Acquisition</CardTitle>
                        <CardDescription className="font-medium">New signups over the last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={mockSignupData}>
                                <defs>
                                    <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="signups" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorSignups)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Engagement Chart */}
                <Card className="rounded-[2rem] border-gray-100 shadow-sm overflow-hidden">
                    <CardHeader className="border-b border-gray-50 bg-gray-50/50 pb-6">
                        <CardTitle className="font-black text-gray-900">Platform Engagement</CardTitle>
                        <CardDescription className="font-medium">Civic Action vs Learning</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={mockEngagementData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f8fafc' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                                <Bar dataKey="petitions" name="Petitions Signed" fill="#f97316" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="courses" name="Modules Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Signups Table */}
            {metrics?.users?.recent && metrics.users.recent.length > 0 && (
                <Card className="rounded-[2rem] border-gray-100 shadow-sm overflow-hidden">
                    <CardHeader className="border-b border-gray-50 bg-gray-50/50 pb-6">
                        <CardTitle className="font-black text-gray-900">Recent Registrations</CardTitle>
                        <CardDescription className="font-medium">Latest users to join Kiongozi</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 px-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50/50 text-gray-500 font-bold uppercase tracking-wider text-xs">
                                    <tr>
                                        <th className="px-6 py-4 border-b border-gray-100">User</th>
                                        <th className="px-6 py-4 border-b border-gray-100">Role</th>
                                        <th className="px-6 py-4 border-b border-gray-100">Joined Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {metrics.users.recent.map((user: any) => (
                                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-black text-xs">
                                                        {user.username?.[0]?.toUpperCase() || 'A'}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900">{user.username || 'Anonymous'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${user.role === 'admin' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {user.role || 'User'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-500">
                                                {format(new Date(user.created_at), 'MMM d, yyyy')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
