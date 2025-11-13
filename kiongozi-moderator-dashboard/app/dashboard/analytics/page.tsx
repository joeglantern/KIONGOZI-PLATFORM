"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import apiClient from '@/app/utils/apiClient';
import { TrendingUp, Users, BookOpen, Award, ArrowUp, ArrowDown } from 'lucide-react';

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  completedCourses: number;
  totalModules: number;
  avgCompletionRate: number;
  topCourses: Array<{
    id: string;
    title: string;
    enrollments: number;
    completionRate: number;
  }>;
  recentActivity: Array<{
    type: string;
    user: string;
    course: string;
    timestamp: string;
  }>;
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    activeUsers: 0,
    totalCourses: 0,
    publishedCourses: 0,
    totalEnrollments: 0,
    completedCourses: 0,
    totalModules: 0,
    avgCompletionRate: 0,
    topCourses: [],
    recentActivity: []
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Load users
      const usersResponse = await apiClient.get('/admin/users', { params: { limit: 1000 } });
      console.log('Analytics - Users response:', usersResponse);
      const users = usersResponse.success && Array.isArray(usersResponse.data) ? usersResponse.data : [];

      // Load courses
      const coursesResponse = await apiClient.get('/content/courses', { params: { limit: 1000 } });
      console.log('Analytics - Courses response:', coursesResponse);
      const courses = coursesResponse.success && Array.isArray(coursesResponse.data) ? coursesResponse.data : [];

      // Load modules
      const modulesResponse = await apiClient.get('/content/modules', { params: { limit: 1000 } });
      console.log('Analytics - Modules response:', modulesResponse);
      const modules = modulesResponse.success && Array.isArray(modulesResponse.data) ? modulesResponse.data : [];

      // Calculate stats
      const totalEnrollments = courses.reduce((sum: number, c: any) => sum + (c.enrollment_count || 0), 0);
      const publishedCount = courses.filter((c: any) => c.status === 'published').length;

      // Top courses by enrollment
      const topCourses = courses
        .sort((a: any, b: any) => (b.enrollment_count || 0) - (a.enrollment_count || 0))
        .slice(0, 5)
        .map((c: any) => ({
          id: c.id,
          title: c.title,
          enrollments: c.enrollment_count || 0,
          completionRate: c.completion_rate || 0
        }));

      // Calculate actual completion rate from courses data
      const coursesWithCompletions = courses.filter((c: any) => c.completion_rate !== undefined && c.completion_rate !== null);
      const avgCompletionRate = coursesWithCompletions.length > 0
        ? Math.round(coursesWithCompletions.reduce((sum: number, c: any) => sum + (c.completion_rate || 0), 0) / coursesWithCompletions.length)
        : 0;

      // Calculate actual completed courses from enrollments data
      const completedCourses = courses.reduce((sum: number, c: any) => sum + (c.completed_count || 0), 0);

      setAnalytics({
        totalUsers: users.length,
        activeUsers: users.filter((u: any) => u.status === 'active').length,
        totalCourses: courses.length,
        publishedCourses: publishedCount,
        totalEnrollments,
        completedCourses,
        totalModules: modules.length,
        avgCompletionRate,
        topCourses,
        recentActivity: []
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#c9975b] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-2">Platform performance and insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="text-[#c9975b]" size={24} />
              <span className="flex items-center text-green-600 text-sm font-medium">
                <ArrowUp size={16} />
                12%
              </span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{analytics.totalUsers}</div>
            <div className="text-sm text-gray-600">Total Users</div>
            <div className="text-xs text-gray-500 mt-1">
              {analytics.activeUsers} active
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <BookOpen className="text-[#c9975b]" size={24} />
              <span className="flex items-center text-green-600 text-sm font-medium">
                <ArrowUp size={16} />
                8%
              </span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{analytics.totalCourses}</div>
            <div className="text-sm text-gray-600">Total Courses</div>
            <div className="text-xs text-gray-500 mt-1">
              {analytics.publishedCourses} published
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="text-[#c9975b]" size={24} />
              <span className="flex items-center text-green-600 text-sm font-medium">
                <ArrowUp size={16} />
                15%
              </span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{analytics.totalEnrollments}</div>
            <div className="text-sm text-gray-600">Total Enrollments</div>
            <div className="text-xs text-gray-500 mt-1">
              {analytics.completedCourses} completed
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Award className="text-[#c9975b]" size={24} />
              <span className="flex items-center text-green-600 text-sm font-medium">
                <ArrowUp size={16} />
                3%
              </span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{analytics.avgCompletionRate}%</div>
            <div className="text-sm text-gray-600">Avg Completion Rate</div>
            <div className="text-xs text-gray-500 mt-1">
              Platform average
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Courses */}
        <Card>
          <CardHeader>
            <CardTitle>Top Courses by Enrollment</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.topCourses.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No course data available</p>
            ) : (
              <div className="space-y-4">
                {analytics.topCourses.map((course, index) => (
                  <div key={course.id} className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-[#c9975b] text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm">{course.title}</h4>
                      <p className="text-xs text-gray-500">
                        {course.enrollments} enrollments • {course.completionRate}% completion
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Content Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Learning Modules</p>
                  <p className="text-sm text-gray-500">Total content pieces</p>
                </div>
                <div className="text-2xl font-bold text-[#c9975b]">{analytics.totalModules}</div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Published Courses</p>
                  <p className="text-sm text-gray-500">Available to students</p>
                </div>
                <div className="text-2xl font-bold text-[#c9975b]">{analytics.publishedCourses}</div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Draft Courses</p>
                  <p className="text-sm text-gray-500">In development</p>
                </div>
                <div className="text-2xl font-bold text-gray-500">
                  {analytics.totalCourses - analytics.publishedCourses}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Engagement Stats */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Platform Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <div className="text-4xl font-bold text-blue-900 mb-2">
                  {Math.round((analytics.activeUsers / analytics.totalUsers) * 100) || 0}%
                </div>
                <p className="text-sm font-medium text-blue-800">Active User Rate</p>
                <p className="text-xs text-blue-600 mt-1">Users actively enrolled</p>
              </div>

              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                <div className="text-4xl font-bold text-green-900 mb-2">
                  {analytics.avgCompletionRate}%
                </div>
                <p className="text-sm font-medium text-green-800">Completion Rate</p>
                <p className="text-xs text-green-600 mt-1">Average across all courses</p>
              </div>

              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                <div className="text-4xl font-bold text-purple-900 mb-2">
                  {(analytics.totalEnrollments / analytics.publishedCourses).toFixed(1) || 0}
                </div>
                <p className="text-sm font-medium text-purple-800">Avg Enrollments</p>
                <p className="text-xs text-purple-600 mt-1">Per published course</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
