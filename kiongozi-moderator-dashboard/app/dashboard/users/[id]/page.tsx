"use client";

import { useState, useEffect, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import apiClient from '@/app/utils/apiClient';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Calendar } from 'lucide-react';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  created_at: string;
  last_login_at?: string;
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total_courses: 0,
    completed_courses: 0,
    in_progress: 0,
    total_time: 0
  });

  useEffect(() => {
    loadUser();
  }, [resolvedParams.id]);

  const loadUser = async () => {
    try {
      setLoading(true);
      console.log('Loading user with ID:', resolvedParams.id);

      // Load user details
      const userResponse = await apiClient.get(`/admin/users/${resolvedParams.id}`);
      console.log('User detail API response:', userResponse);

      if (userResponse.success && userResponse.data) {
        // Backend returns: { success: true, data: { user: {...}, stats: { conversations, messages, lastLogin, loginCount }, recentLogins: [...] } }
        const responseData = userResponse.data as any;
        const userData = responseData.user;
        console.log('User data:', userData);
        console.log('Backend stats:', responseData.stats);

        setUser(userData);

        // Backend provides chat stats, not LMS stats
        // For now, initialize with zeros - we'll need to fetch LMS stats separately or modify backend
        setStats({
          total_courses: 0,
          completed_courses: 0,
          in_progress: 0,
          total_time: 0
        });
      }

      // Load user enrollments using admin endpoint
      try {
        console.log('Loading enrollments for user:', resolvedParams.id);

        const enrollmentsResponse = await apiClient.get(`/admin/users/${resolvedParams.id}/enrollments`, {
          params: { limit: 100 }
        });

        console.log('Enrollments API response:', enrollmentsResponse);

        if (enrollmentsResponse.success && enrollmentsResponse.data) {
          const enrollmentsData = Array.isArray(enrollmentsResponse.data)
            ? enrollmentsResponse.data
            : [];

          console.log('Enrollments loaded:', enrollmentsData.length);
          setEnrollments(enrollmentsData);

          // Calculate LMS stats from enrollments
          const totalCourses = enrollmentsData.length;
          const completedCourses = enrollmentsData.filter((e: any) => e.status === 'completed').length;
          const inProgress = enrollmentsData.filter((e: any) => e.status === 'active').length;

          setStats({
            total_courses: totalCourses,
            completed_courses: completedCourses,
            in_progress: inProgress,
            total_time: 0 // Not available from enrollments data
          });
        } else {
          console.error('Failed to load enrollments:', enrollmentsResponse.error);
        }
      } catch (error) {
        console.error('Failed to load enrollments:', error);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      alert('Failed to load user details');
      router.push('/dashboard/users');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async () => {
    const newRole = prompt('Enter new role (user, moderator, content_editor, admin, org_admin):');
    if (!newRole) return;

    const validRoles = ['user', 'moderator', 'content_editor', 'admin', 'org_admin'];
    if (!validRoles.includes(newRole)) {
      alert('Invalid role');
      return;
    }

    try {
      await apiClient.patch(`/admin/users/${resolvedParams.id}/role`, { role: newRole });
      await loadUser();
      alert('Role updated successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update role');
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#c9975b] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/users"
          className="inline-flex items-center gap-2 text-[#c9975b] hover:text-[#b58647] mb-4"
        >
          <ArrowLeft size={20} />
          Back to Users
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{user.full_name}</h1>
        <p className="text-gray-600 mt-2">User profile and activity</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-[#c9975b] text-white rounded-full flex items-center justify-center text-2xl font-bold">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{user.full_name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Mail size={14} />
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Role</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin' ? 'bg-red-100 text-red-800' :
                      user.role === 'moderator' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                    <button
                      onClick={handleChangeRole}
                      className="text-xs text-[#c9975b] hover:text-[#b58647]"
                    >
                      Change
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-1 ${
                    user.status === 'active' ? 'bg-green-100 text-green-800' :
                    user.status === 'banned' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.status}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Calendar size={14} />
                    Joined
                  </p>
                  <p className="font-medium text-gray-900">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>

                {user.last_login_at && (
                  <div>
                    <p className="text-sm text-gray-600">Last Login</p>
                    <p className="font-medium text-gray-900">
                      {new Date(user.last_login_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats & Enrollments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-gray-900">{stats.total_courses}</div>
                <div className="text-sm text-gray-600">Total Courses</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-gray-900">{stats.completed_courses}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-gray-900">{stats.in_progress}</div>
                <div className="text-sm text-gray-600">In Progress</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-gray-900">{Math.round(stats.total_time / 60)}h</div>
                <div className="text-sm text-gray-600">Time Spent</div>
              </CardContent>
            </Card>
          </div>

          {/* Enrollments */}
          <Card>
            <CardHeader>
              <CardTitle>Course Enrollments</CardTitle>
            </CardHeader>
            <CardContent>
              {enrollments.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No enrollments yet</p>
              ) : (
                <div className="space-y-3">
                  {enrollments.map((enrollment: any) => (
                    <div
                      key={enrollment.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {enrollment.courses?.title || 'Unknown Course'}
                        </h4>
                        <p className="text-sm text-gray-500">
                          Enrolled: {new Date(enrollment.enrolled_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {enrollment.progress_percentage || 0}%
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          enrollment.status === 'completed' ? 'bg-green-100 text-green-800' :
                          enrollment.status === 'active' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {enrollment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
