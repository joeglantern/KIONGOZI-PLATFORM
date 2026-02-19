"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useUser } from '@/app/contexts/UserContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    Users,
    BookOpen,
    BarChart3,
    Settings,
    Shield,
    TrendingUp,
    UserCheck,
    AlertTriangle
} from 'lucide-react';

export default function AdminDashboardPage() {
    const { profile } = useUser();

    return (
        <ProtectedRoute allowedRoles={['admin']}>
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Welcome Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">
                            Admin Dashboard 🛠️
                        </h1>
                        <p className="text-xl text-gray-600">
                            Manage platform users, courses, and system settings
                        </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <Users className="w-6 h-6 text-blue-600" />
                                </div>
                                <TrendingUp className="w-5 h-5 text-green-500" />
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">20</div>
                            <div className="text-sm text-gray-600">Total Users</div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                    <BookOpen className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">22</div>
                            <div className="text-sm text-gray-600">Total Courses</div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                    <UserCheck className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">20</div>
                            <div className="text-sm text-gray-600">Active Users</div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">0</div>
                            <div className="text-sm text-gray-600">Pending Reviews</div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="grid lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            {/* Quick Actions */}
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Link href="/admin/users">
                                        <Button className="w-full bg-orange-600 hover:bg-orange-700 justify-start">
                                            <Users className="w-5 h-5 mr-2" />
                                            Manage Users
                                        </Button>
                                    </Link>
                                    <Link href="/admin/courses">
                                        <Button variant="outline" className="w-full justify-start border-2">
                                            <BookOpen className="w-5 h-5 mr-2" />
                                            Manage Courses
                                        </Button>
                                    </Link>
                                    <Link href="/admin/reports">
                                        <Button variant="outline" className="w-full justify-start border-2">
                                            <BarChart3 className="w-5 h-5 mr-2" />
                                            View Reports
                                        </Button>
                                    </Link>
                                    <Link href="/admin/settings">
                                        <Button variant="outline" className="w-full justify-start border-2">
                                            <Settings className="w-5 h-5 mr-2" />
                                            System Settings
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Activity</h2>
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                            <Users className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">New user registered</p>
                                            <p className="text-xs text-gray-500">2 hours ago</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                            <BookOpen className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">Course published</p>
                                            <p className="text-xs text-gray-500">5 hours ago</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* System Health */}
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                                <h3 className="text-xl font-bold text-gray-900 mb-4">System Health</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Database</span>
                                        <span className="text-sm font-medium text-green-600">Healthy</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">API</span>
                                        <span className="text-sm font-medium text-green-600">Healthy</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Storage</span>
                                        <span className="text-sm font-medium text-green-600">Healthy</span>
                                    </div>
                                </div>
                            </div>

                            {/* Admin Tools */}
                            <div className="bg-purple-600 rounded-2xl shadow-lg p-6 text-white">
                                <Shield className="w-12 h-12 mb-3" />
                                <h3 className="text-xl font-bold mb-3">Admin Tools</h3>
                                <p className="text-purple-100 mb-4 text-sm">
                                    Access advanced system configuration and management tools
                                </p>
                                <Button className="w-full bg-white text-purple-600 hover:bg-gray-50">
                                    Open Tools
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
