"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createBrowserClient } from '@/app/utils/supabase/client';
import { useUser } from '@/app/contexts/UserContext';
import { ModuleList } from '@/components/courses/ModuleList';
import {
    BookOpen,
    Clock,
    Users,
    TrendingUp,
    Loader2,
    CheckCircle,
    ArrowLeft,
    Sparkles,
    MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { startConversation, getCourseChatRoom, joinChatRoom } from '@/lib/chat';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { BookmarkButton } from '@/components/shared/BookmarkButton';
import { CourseReviews } from '@/components/courses/CourseReviews';

export default function CourseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useUser();
    const supabase = createBrowserClient();

    const courseId = params.id as string;

    const [enrolling, setEnrolling] = useState(false);
    const [messaging, setMessaging] = useState(false);
    const [activeTab, setActiveTab] = useState<'content' | 'discussion' | 'reviews'>('content');

    const { data: courseData, isLoading: loading } = useQuery({
        queryKey: ['course-full-details', courseId, user?.id],
        queryFn: async () => {
            if (!user || !courseId) return null;

            // 1. Fetch course details
            const { data: course, error: courseError } = await supabase
                .from('courses')
                .select(`
                  *,
                  module_categories(name, color)
                `)
                .eq('id', courseId)
                .single();

            if (courseError) throw courseError;

            // 2. Fetch enrollment status
            const { data: enrollment } = await supabase
                .from('course_enrollments')
                .select('*')
                .eq('course_id', courseId)
                .eq('user_id', user.id)
                .maybeSingle();

            // 3. Fetch course modules
            const { data: modulesData, error: modulesError } = await supabase
                .from('course_modules')
                .select(`
                  order_index,
                  is_required,
                  learning_modules(
                    id,
                    title,
                    description,
                    estimated_duration_minutes
                  )
                `)
                .eq('course_id', courseId)
                .order('order_index');

            if (modulesError) throw modulesError;

            // 4. Fetch user progress
            const moduleIds = (modulesData || []).map((m: any) => m.learning_modules.id);
            let progressMap = new Map();

            if (moduleIds.length > 0) {
                const { data: progressData } = await supabase
                    .from('user_progress')
                    .select('module_id, status')
                    .eq('user_id', user.id)
                    .in('module_id', moduleIds);

                progressMap = new Map(
                    (progressData || []).map((p: any) => [p.module_id, p])
                );
            }

            // Combine modules with progress
            const modulesWithProgress = (modulesData || []).map((m: any) => ({
                ...m,
                learning_modules: {
                    ...m.learning_modules,
                    user_progress: progressMap.has(m.learning_modules.id)
                        ? [progressMap.get(m.learning_modules.id)]
                        : []
                }
            }));

            // 5. Fetch course room ID
            const roomId = await getCourseChatRoom(supabase, courseId);

            return {
                course,
                enrollment,
                modules: modulesWithProgress,
                courseRoomId: roomId
            };
        },
        enabled: !!user && !!courseId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const course = courseData?.course;
    const modules = courseData?.modules || [];
    const enrollment = courseData?.enrollment;
    const courseRoomId = courseData?.courseRoomId;
    const queryClient = useQueryClient();

    const handleEnroll = async () => {
        if (!user || !course) return;

        try {
            setEnrolling(true);

            const { data, error } = await supabase
                .from('course_enrollments')
                .insert({
                    user_id: user.id,
                    course_id: course.id,
                    status: 'active',
                    progress_percentage: 0,
                    enrolled_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) throw error;

            // Invalidate to re-fetch enrollment status
            await queryClient.invalidateQueries({ queryKey: ['course-full-details', courseId] });

            // Redirect to first module
            if (modules.length > 0) {
                const firstModule = modules[0].learning_modules;
                router.push(`/courses/${courseId}/modules/${firstModule.id}`);
            }
        } catch (error: any) {
            console.error('Error enrolling:', error);
            alert(error.message || 'Failed to enroll in course');
        } finally {
            setEnrolling(false);
        }
    };

    const handleContinueLearning = () => {
        // Find first incomplete module or first module
        const incompleteModule = modules.find(
            (m: any) => m.learning_modules.user_progress?.[0]?.status !== 'completed'
        );

        const targetModule = incompleteModule || modules[0];
        if (targetModule) {
            router.push(`/courses/${courseId}/modules/${targetModule.learning_modules.id}`);
        }
    };

    const handleMessageInstructor = async () => {
        if (!user || !course?.author_id) return;

        try {
            setMessaging(true);
            const roomId = await startConversation(supabase, user.id, course.author_id);
            if (roomId) {
                router.push('/messages');
            }
        } catch (error) {
            console.error('Error starting conversation:', error);
        } finally {
            setMessaging(false);
        }
    };

    const handleTabChange = async (tab: 'content' | 'discussion' | 'reviews') => {
        setActiveTab(tab);
        if (tab === 'discussion' && courseRoomId && user) {
            await joinChatRoom(supabase, user.id, courseRoomId);
        }
    };

    const difficultyColors = {
        beginner: 'bg-orange-100 text-orange-700 border-orange-300',
        intermediate: 'bg-blue-100 text-blue-700 border-blue-300',
        advanced: 'bg-orange-500 text-white border-orange-600',
    };

    if (loading) {
        return (
            <ProtectedRoute allowedRoles={['user', 'instructor', 'admin']}>
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
            </ProtectedRoute>
        );
    }

    if (!course) {
        return (
            <ProtectedRoute allowedRoles={['user', 'instructor', 'admin']}>
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Course not found</h2>
                        <Link href="/courses">
                            <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                                Browse Courses
                            </Button>
                        </Link>
                    </div>
                </div>
            </ProtectedRoute>
        );
    }

    const isEnrolled = !!enrollment;
    const progress = enrollment?.progress_percentage || 0;
    const completedModules = modules.filter((m) => m.learning_modules.user_progress?.[0]?.status === 'completed').length;
    const totalModules = modules.length;

    return (
        <ProtectedRoute allowedRoles={['user', 'instructor', 'admin']}>
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-5xl mx-auto px-4 py-8">
                    <Breadcrumb items={[
                        { label: 'Courses', href: '/courses' },
                        { label: course.title }
                    ]} />

                    {/* Course Header */}
                    <div className="bg-white rounded-xl shadow-lg p-8 mb-6 border border-gray-100">
                        <div className="flex items-start justify-between gap-6 mb-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                    {course.module_categories && (
                                        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                                            {course.module_categories.name}
                                        </span>
                                    )}
                                    <span className={`px-3 py-1 rounded-full border text-sm font-medium ${difficultyColors[course.difficulty_level as keyof typeof difficultyColors] || difficultyColors.beginner
                                        }`}>
                                        {course.difficulty_level}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between mb-3">
                                    <h1 className="text-4xl font-bold text-gray-900">{course.title}</h1>
                                    <BookmarkButton
                                        itemId={courseId}
                                        itemType="course"
                                        metadata={{
                                            title: course.title,
                                            link: `/courses/${courseId}`,
                                            icon: 'course'
                                        }}
                                    />
                                </div>
                                <p className="text-lg text-gray-600 mb-4">{course.description}</p>

                                {/* Meta Info */}
                                <div className="flex items-center gap-6 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        <span>{course.estimated_duration_hours} hours</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="w-4 h-4" />
                                        <span>{totalModules} modules</span>
                                    </div>
                                </div>
                            </div>

                            {/* Enrollment Card */}
                            <div className="bg-gray-50 rounded-lg p-6 border-2 border-orange-200 min-w-[280px]">
                                {isEnrolled ? (
                                    <>
                                        <div className="flex items-center gap-2 mb-3">
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                            <span className="font-semibold text-gray-900">Enrolled</span>
                                        </div>
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between text-sm mb-1">
                                                <span className="text-gray-600">Progress</span>
                                                <span className="font-semibold text-gray-900">{progress}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-orange-600 transition-all duration-300"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-600 mt-1">
                                                {completedModules} of {totalModules} modules completed
                                            </p>
                                        </div>
                                        <Button
                                            onClick={handleContinueLearning}
                                            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                                        >
                                            <TrendingUp className="w-4 h-4 mr-2" />
                                            Continue Learning
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Sparkles className="w-5 h-5 text-orange-500" />
                                            <span className="font-semibold text-gray-900">Start Learning</span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-4">
                                            Enroll now to access all {totalModules} modules and start your learning journey!
                                        </p>
                                        <Button
                                            onClick={handleEnroll}
                                            disabled={enrolling}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                                        >
                                            {enrolling ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Enrolling...
                                                </>
                                            ) : (
                                                <>
                                                    <BookOpen className="w-4 h-4 mr-2" />
                                                    Enroll Now - Free
                                                </>
                                            )}
                                        </Button>
                                    </>
                                )}

                                {/* Message Instructor Button */}
                                <div className="mt-4 pt-4 border-t border-orange-100">
                                    {user?.id === course.author_id ? (
                                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 text-center">
                                            <p className="text-xs font-bold text-orange-700 uppercase tracking-widest mb-1">Instructor View</p>
                                            <p className="text-[10px] text-orange-600 font-medium whitespace-nowrap overflow-hidden text-ellipsis">You are the author of this course.</p>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            onClick={handleMessageInstructor}
                                            disabled={messaging}
                                            className="w-full border-2 border-orange-200 text-orange-600 hover:bg-orange-50 font-bold py-6 rounded-xl transition-all flex items-center justify-center gap-2"
                                        >
                                            {messaging ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <MessageSquare className="w-4 h-4" />
                                            )}
                                            Message Instructor
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Overview */}
                        {course.overview && (
                            <div className="border-t border-gray-200 pt-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Course Overview</h3>
                                <p className="text-gray-700 whitespace-pre-line">{course.overview}</p>
                            </div>
                        )}
                    </div>

                    {/* Main Content Tabs */}
                    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden min-h-[600px]">
                        <div className="flex border-b border-gray-100">
                            <button
                                onClick={() => handleTabChange('content')}
                                className={`flex-1 px-8 py-6 font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'content'
                                    ? 'bg-white text-orange-600 border-b-4 border-orange-500'
                                    : 'bg-gray-50/50 text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                Course Content
                            </button>
                            <button
                                onClick={() => handleTabChange('discussion')}
                                className={`flex-1 px-8 py-6 font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'discussion'
                                    ? 'bg-white text-orange-600 border-b-4 border-orange-500'
                                    : 'bg-gray-50/50 text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                {isEnrolled ? 'Community Discord' : 'Discussion Preview'}
                            </button>
                            <button
                                onClick={() => handleTabChange('reviews')}
                                className={`flex-1 px-8 py-6 font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'reviews'
                                    ? 'bg-white text-orange-600 border-b-4 border-orange-500'
                                    : 'bg-gray-50/50 text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                Reviews
                            </button>
                        </div>

                        <div className="p-8">
                            <AnimatePresence mode="wait">
                                {activeTab === 'content' ? (
                                    <motion.div
                                        key="content"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <h2 className="text-2xl font-black text-gray-900 mb-8">Modules</h2>
                                        {modules.length > 0 ? (
                                            <ModuleList modules={modules} isEnrolled={isEnrolled} courseId={courseId} />
                                        ) : (
                                            <p className="text-gray-600 text-center py-12 font-bold italic">No modules available yet</p>
                                        )}
                                    </motion.div>
                                ) : activeTab === 'discussion' ? (
                                    <motion.div
                                        key="discussion"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="h-full"
                                    >
                                        {!isEnrolled ? (
                                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                                <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center text-orange-500 mb-6">
                                                    <Users className="w-10 h-10" />
                                                </div>
                                                <h3 className="text-2xl font-black text-gray-900 mb-2">Enrolment Required</h3>
                                                <p className="text-gray-500 max-w-sm font-medium mb-8">
                                                    Join this course to participate in community discussions and learn together with other students.
                                                </p>
                                                <Button
                                                    onClick={handleEnroll}
                                                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-6 rounded-2xl"
                                                >
                                                    Enroll Now to Join
                                                </Button>
                                            </div>
                                        ) : courseRoomId ? (
                                            <ChatWindow
                                                roomId={courseRoomId}
                                                recipientName={`${course.title} Discussion`}
                                                recipientRole="Community"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                                <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-4" />
                                                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
                                                    Setting up discussion room...
                                                </p>
                                            </div>
                                        )}
                                    </motion.div>
                                ) : activeTab === 'reviews' ? (
                                    <motion.div
                                        key="reviews"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <h2 className="text-2xl font-black text-gray-900 mb-6">Course Reviews</h2>
                                        <CourseReviews courseId={courseId} />
                                    </motion.div>
                                ) : null}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
