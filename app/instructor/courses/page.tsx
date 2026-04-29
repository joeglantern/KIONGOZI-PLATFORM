"use client";

import { useState, useEffect, useMemo } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useUser } from '@/app/contexts/UserContext';
import { createClient } from '@/app/utils/supabaseClient';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import {
    Search,
    Plus,
    BookOpen,
    Users,
    Clock,
    Star,
    Edit3,
    X,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

const DIFFICULTY_COLORS: Record<string, string> = {
    beginner: 'bg-green-100 text-green-700',
    intermediate: 'bg-blue-100 text-blue-700',
    advanced: 'bg-orange-100 text-orange-700',
};

interface CourseData {
    id: string;
    title: string;
    description: string;
    difficulty_level: string;
    status: string;
    created_at: string;
    enrollment_count: number;
    avg_rating: number;
    estimated_duration_hours: number;
    thumbnail_url: string | null;
}

export default function InstructorCoursesPage() {
    const { user } = useUser();
    const supabase = useMemo(() => createClient(), []);
    const [courses, setCourses] = useState<CourseData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!user) return;

        const fetchCourses = async () => {
            try {
                const { data: myCourses, error } = await supabase
                    .from('courses')
                    .select('id, title, description, difficulty_level, status, created_at, estimated_duration_hours, thumbnail_url')
                    .eq('author_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                if (!myCourses?.length) { setLoading(false); return; }

                const courseIds = myCourses.map(c => c.id);

                const [{ data: enrollments }, { data: reviews }] = await Promise.all([
                    supabase.from('course_enrollments').select('course_id').in('course_id', courseIds),
                    supabase.from('course_reviews').select('course_id, rating').in('course_id', courseIds),
                ]);

                const enrollCountByCourse = new Map<string, number>();
                for (const e of enrollments ?? []) {
                    enrollCountByCourse.set(e.course_id, (enrollCountByCourse.get(e.course_id) ?? 0) + 1);
                }

                const reviewsByCourse = new Map<string, number[]>();
                for (const r of reviews ?? []) {
                    const list = reviewsByCourse.get(r.course_id) ?? [];
                    list.push(r.rating);
                    reviewsByCourse.set(r.course_id, list);
                }

                setCourses(myCourses.map(course => {
                    const ratings = reviewsByCourse.get(course.id) ?? [];
                    const avgRating = ratings.length > 0
                        ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
                        : 0;
                    return {
                        ...course,
                        enrollment_count: enrollCountByCourse.get(course.id) ?? 0,
                        avg_rating: avgRating,
                    };
                }));
            } catch (err) {
                console.error('Error fetching courses:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, [user, supabase]);

    const filteredCourses = courses.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <ProtectedRoute allowedRoles={['instructor', 'admin']}>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 mb-1">My Courses</h1>
                        {!loading && (
                            <p className="text-gray-500 text-sm">
                                {courses.length === 0
                                    ? 'No courses yet'
                                    : `${courses.length} course${courses.length !== 1 ? 's' : ''}`}
                            </p>
                        )}
                    </div>
                    <Link href="/instructor/courses/new">
                        <Button className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20 w-full sm:w-auto">
                            <Plus className="w-5 h-5 mr-2" />
                            Create New Course
                        </Button>
                    </Link>
                </div>

                {/* Search */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by title or description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                aria-label="Clear search"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Course List */}
                {loading ? (
                    <div className="grid gap-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6 flex flex-col md:flex-row gap-6">
                                <Skeleton className="w-full md:w-48 h-32 rounded-xl flex-shrink-0" />
                                <div className="flex-1 space-y-3">
                                    <Skeleton className="h-4 w-20 rounded-full" />
                                    <Skeleton className="h-6 w-3/4" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-2/3" />
                                    <div className="flex gap-6">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-4 w-20" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : courses.length === 0 ? (
                    /* No courses at all */
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="w-8 h-8 text-orange-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No courses yet</h3>
                        <p className="text-gray-500 mb-6">Get started by creating your first course</p>
                        <Link href="/instructor/courses/new">
                            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                                Create Course
                            </Button>
                        </Link>
                    </div>
                ) : filteredCourses.length === 0 ? (
                    /* Search returned no results */
                    <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">No results for "{searchQuery}"</h3>
                        <p className="text-gray-500 text-sm mb-4">Try a different keyword</p>
                        <button
                            onClick={() => setSearchQuery('')}
                            className="text-sm font-semibold text-orange-600 hover:text-orange-700"
                        >
                            Clear search
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredCourses.map((course) => (
                            <div
                                key={course.id}
                                className="group bg-white rounded-2xl border border-gray-100 p-4 md:p-6 flex flex-col md:flex-row gap-5 hover:shadow-md hover:border-gray-200 transition-all"
                            >
                                {/* Thumbnail */}
                                <Link
                                    href={`/instructor/courses/${course.id}/edit`}
                                    className="relative w-full md:w-48 h-36 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                                >
                                    {course.thumbnail_url
                                        ? <Image src={course.thumbnail_url} alt={course.title} fill className="object-cover" unoptimized />
                                        : <BookOpen className="w-10 h-10 text-gray-300" />
                                    }
                                </Link>

                                {/* Content */}
                                <div className="flex-1 min-w-0 flex flex-col">
                                    {/* Badges row */}
                                    <div className="flex items-center gap-2 mb-2">
                                        {course.difficulty_level && (
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${DIFFICULTY_COLORS[course.difficulty_level] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {course.difficulty_level}
                                            </span>
                                        )}
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${course.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {course.status || 'draft'}
                                        </span>
                                    </div>

                                    {/* Title + Edit button */}
                                    <div className="flex items-start gap-3 mb-2">
                                        <Link href={`/instructor/courses/${course.id}/edit`} className="flex-1 min-w-0">
                                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2 leading-snug">
                                                {course.title}
                                            </h3>
                                        </Link>
                                        <Link href={`/instructor/courses/${course.id}/edit`} className="flex-shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-transparent hover:border-orange-100 transition-all"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                                <span className="hidden sm:inline">Edit</span>
                                            </Button>
                                        </Link>
                                    </div>

                                    <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-1">
                                        {course.description || 'No description provided.'}
                                    </p>

                                    {/* Stats */}
                                    <div className="flex items-center gap-5 text-sm text-gray-500">
                                        <div className="flex items-center gap-1.5">
                                            <Users className="w-4 h-4" />
                                            <span>{course.enrollment_count} student{course.enrollment_count !== 1 ? 's' : ''}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Star className={`w-4 h-4 ${course.avg_rating > 0 ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                                            <span>{course.avg_rating > 0 ? course.avg_rating : '—'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-4 h-4" />
                                            <span>{course.estimated_duration_hours ? `${course.estimated_duration_hours}h` : '—'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}
