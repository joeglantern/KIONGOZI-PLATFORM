"use client";

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/app/utils/supabase/client';
import { useUser } from '@/app/contexts/UserContext';
import Link from 'next/link';
import { ArrowRight, BookOpen, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

interface ContinueCourse {
    course_id: string;
    course_title: string;
    progress: number;
    last_module_id?: string;
}

/**
 * "Continue where you left off" banner for the dashboard.
 * Shows the most recently accessed enrolled course.
 */
export function ContinueLearningBanner() {
    const { user } = useUser();
    const supabase = createBrowserClient();
    const [course, setCourse] = useState<ContinueCourse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContinueCourse = async () => {
            if (!user) return;
            try {
                const { data } = await supabase
                    .from('course_enrollments')
                    .select(`
                        course_id,
                        progress_percentage,
                        courses(title)
                    `)
                    .eq('user_id', user.id)
                    .neq('status', 'completed')
                    .order('last_accessed_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (data) {
                    const courseData: any = Array.isArray(data.courses) ? data.courses[0] : data.courses;
                    setCourse({
                        course_id: data.course_id,
                        course_title: courseData?.title || 'Untitled Course',
                        progress: data.progress_percentage || 0,
                    });
                }
            } catch (err) {
                console.error('Error fetching continue course:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchContinueCourse();
    }, [user]);

    if (loading) {
        return (
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <Skeleton className="h-5 w-48 bg-white/20 mb-3" />
                <Skeleton className="h-4 w-64 bg-white/20 mb-4" />
                <Skeleton className="h-2 w-full bg-white/20 rounded-full" />
            </div>
        );
    }

    if (!course) return null;

    return (
        <Link href={`/courses/${course.course_id}`}>
            <div className="group relative overflow-hidden bg-orange-600 rounded-2xl p-6 shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 transition-all cursor-pointer">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-20 w-24 h-24 bg-white/5 rounded-full translate-y-1/2" />

                <div className="relative flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <BookOpen className="w-4 h-4 text-white/80" />
                            <span className="text-xs font-black text-white/80 uppercase tracking-widest">Continue Learning</span>
                        </div>
                        <h3 className="text-lg font-black text-white truncate mb-3">{course.course_title}</h3>

                        {/* Progress Bar */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white rounded-full transition-all duration-500"
                                    style={{ width: `${course.progress}%` }}
                                />
                            </div>
                            <span className="text-xs font-black text-white/90">{course.progress}%</span>
                        </div>
                    </div>

                    <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                        <ArrowRight className="w-6 h-6 text-white group-hover:translate-x-0.5 transition-transform" />
                    </div>
                </div>
            </div>
        </Link>
    );
}
