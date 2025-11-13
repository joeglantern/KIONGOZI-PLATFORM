"use client";

import { useEffect, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import apiClient from '../utils/apiClient';
import Link from 'next/link';

interface DashboardStats {
  totalUsers: number;
  totalCourses: number;
  totalModules: number;
  activeEnrollments: number;
  publishedCourses: number;
  draftCourses: number;
}

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalCourses: 0,
    totalModules: 0,
    activeEnrollments: 0,
    publishedCourses: 0,
    draftCourses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userLoading && user) {
      loadDashboardStats();
    }
  }, [userLoading, user]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);

      // Fetch courses and calculate stats
      const coursesResponse = await apiClient.get('/content/courses', {
        params: { limit: 1000 } // Get all to count
      });

      console.log('Dashboard courses response:', coursesResponse);
      const courses = coursesResponse.success && Array.isArray(coursesResponse.data) ? coursesResponse.data : [];
      const publishedCount = courses.filter((c: any) => c.status === 'published').length;
      const draftCount = courses.filter((c: any) => c.status === 'draft').length;

      // Fetch modules
      const modulesResponse = await apiClient.get('/content/modules', {
        params: { limit: 1000 }
      });
      const modules = modulesResponse.success && Array.isArray(modulesResponse.data) ? modulesResponse.data : [];

      // Calculate total enrollments from courses
      const totalEnrollments = courses.reduce((sum: number, course: any) => {
        return sum + (course.enrollment_count || 0);
      }, 0);

      setStats({
        totalUsers: 0, // Will implement when we add admin endpoints
        totalCourses: courses.length,
        totalModules: modules.length,
        activeEnrollments: totalEnrollments,
        publishedCourses: publishedCount,
        draftCourses: draftCount,
      });
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#c9975b] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.first_name || user?.full_name}!
          </h2>
          <p className="text-gray-600 mt-2">
            Here's an overview of your platform
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Courses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {stats.totalCourses}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {stats.publishedCourses} published, {stats.draftCourses} drafts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Modules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {stats.totalModules}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Learning content pieces
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Active Enrollments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {stats.activeEnrollments}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Total course enrollments
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                href="/dashboard/courses/new"
                className="px-6 py-4 bg-[#c9975b] hover:bg-[#b58647] text-white rounded-lg font-medium transition-colors text-center"
              >
                Create Course
              </Link>
              <Link
                href="/dashboard/users"
                className="px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors text-center"
              >
                View Users
              </Link>
              <Link
                href="/dashboard/analytics"
                className="px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors text-center"
              >
                View Analytics
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity Placeholder */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 text-center py-8">
              Activity feed coming soon...
            </p>
          </CardContent>
        </Card>
    </div>
  );
}
