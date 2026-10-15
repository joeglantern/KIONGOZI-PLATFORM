"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useUser } from '@/app/contexts/UserContext';
import { createClient } from '@/app/utils/supabase/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
    Search,
    Plus,
    BookOpen,
    Users,
    Clock,
    Star,
    Edit3,
    Eye,
    Trash2,
    Loader2,
    X,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

const DIFFICULTY_COLORS: Record<string, string> = {
    beginner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    intermediate: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    advanced: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const STATUS_FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'published', label: 'Published' },
    { id: 'draft', label: 'Drafts' },
] as const;

type StatusFilter = typeof STATUS_FILTERS[number]['id'];

interface CourseData {
    id: string;
    title: string;
    description: string | null;
    difficulty_level: string | null;
    status: string | null;
    created_at: string;
    enrollment_count: number;
    avg_rating: number;
    estimated_duration_hours: number | null;
    thumbnail_url: string | null;
}

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900';

export default function InstructorCoursesPage() {
    const { user } = useUser();
    const supabase = useMemo(() => createClient(), []);
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [courses, setCourses] = useState<CourseData[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [pendingDelete, setPendingDelete] = useState<CourseData | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Keep the box in sync when the navbar search submits a new ?q= value.
    useEffect(() => {
        setSearchQuery(searchParams.get('q') ?? '');
    }, [searchParams]);

    const fetchCourses = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setLoadError(null);
        try {
            const { data: myCourses, error } = await supabase
                .from('courses')
                .select('id, title, description, difficulty_level, status, created_at, estimated_duration_hours, thumbnail_url')
                .eq('author_id', user.id)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (!myCourses?.length) {
                setCourses([]);
                return;
            }

            const courseIds = myCourses.map(c => c.id);

            const [{ data: enrollments, error: enrollError }, { data: reviews, error: reviewError }] = await Promise.all([
                supabase.from('course_enrollments').select('course_id').in('course_id', courseIds),
                supabase.from('course_reviews').select('course_id, rating').in('course_id', courseIds),
            ]);
            if (enrollError) throw enrollError;
            if (reviewError) throw reviewError;

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
            setLoadError('We could not load your courses. Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }, [user, supabase]);

    useEffect(() => {
        void fetchCourses();
    }, [fetchCourses]);

    // Soft delete: matches how existing courses are retired (deleted_at), keeps
    // enrollments, certificates and history intact, and unpublishes the course.
    const handleConfirmDelete = async () => {
        if (!pendingDelete) return;
        try {
            setDeleting(true);
            const { error } = await supabase
                .from('courses')
                .update({ deleted_at: new Date().toISOString(), status: 'draft' })
                .eq('id', pendingDelete.id);
            if (error) throw error;
            setCourses(prev => prev.filter(c => c.id !== pendingDelete.id));
            toast({ title: 'Course deleted', description: `"${pendingDelete.title}" was removed from your courses.` });
            setPendingDelete(null);
        } catch (err: any) {
            toast({ title: 'Could not delete course', description: err.message, variant: 'destructive' });
        } finally {
            setDeleting(false);
        }
    };

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredCourses = courses.filter(course => {
        const status = course.status || 'draft';
        if (statusFilter !== 'all' && status !== statusFilter) return false;
        if (!normalizedQuery) return true;
        return (
            course.title.toLowerCase().includes(normalizedQuery) ||
            (course.description ?? '').toLowerCase().includes(normalizedQuery)
        );
    });

    const clearFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
    };

    const publishedCount = courses.filter(c => c.status === 'published').length;

    return (
        <ProtectedRoute allowedRoles={['instructor', 'admin']}>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">My courses</h1>
                        {!loading && !loadError && (
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                {courses.length === 0
                                    ? 'No courses yet'
                                    : `${courses.length} course${courses.length !== 1 ? 's' : ''}, ${publishedCount} published`}
                            </p>
                        )}
                    </div>
                    <Button asChild className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20 w-full sm:w-auto rounded-xl">
                        <Link href="/instructor/courses/new">
                            <Plus className="w-5 h-5 mr-2" />
                            Create new course
                        </Link>
                    </Button>
                </div>

                {/* Search + status filter */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 mb-6 flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <label htmlFor="course-search" className="sr-only">Search courses</label>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                            id="course-search"
                            type="search"
                            placeholder="Search by title or description…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors ${focusRing}`}
                                aria-label="Clear search"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div role="group" aria-label="Filter by status" className="flex gap-1 p-1 bg-gray-50 dark:bg-gray-800 rounded-xl self-start md:self-auto">
                        {STATUS_FILTERS.map(f => (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => setStatusFilter(f.id)}
                                aria-pressed={statusFilter === f.id}
                                className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-colors ${focusRing} ${statusFilter === f.id
                                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Course List */}
                {loading ? (
                    <div className="grid gap-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 md:p-6 flex flex-col md:flex-row gap-6">
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
                ) : loadError ? (
                    <div role="alert" className="text-center py-16 bg-white dark:bg-gray-900 rounded-3xl border border-red-200 dark:border-red-900/40">
                        <p className="text-gray-900 dark:text-white font-bold mb-1">Something went wrong</p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">{loadError}</p>
                        <Button variant="outline" onClick={() => void fetchCourses()} className="rounded-xl">Try again</Button>
                    </div>
                ) : courses.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                        <div className="w-16 h-16 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="w-8 h-8 text-orange-500" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No courses yet</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">Get started by creating your first course.</p>
                        <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl">
                            <Link href="/instructor/courses/new">Create course</Link>
                        </Button>
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                            {normalizedQuery ? `No results for "${searchQuery.trim()}"` : 'No courses match this filter'}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Try a different keyword or status.</p>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className={`text-sm font-semibold text-orange-600 hover:text-orange-700 rounded ${focusRing}`}
                        >
                            Clear filters
                        </button>
                    </div>
                ) : (
                    <ul className="grid gap-4">
                        {filteredCourses.map((course) => {
                            const editHref = `/instructor/courses/${course.id}/edit`;
                            const status = course.status || 'draft';
                            return (
                                <li
                                    key={course.id}
                                    className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 md:p-6 flex flex-col md:flex-row gap-5 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all"
                                >
                                    {/* Thumbnail */}
                                    <Link
                                        href={editHref}
                                        tabIndex={-1}
                                        aria-hidden="true"
                                        className="relative w-full md:w-48 h-36 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                                    >
                                        {course.thumbnail_url
                                            ? <Image src={course.thumbnail_url} alt="" fill className="object-cover" unoptimized />
                                            : <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                                        }
                                    </Link>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 flex flex-col">
                                        <div className="flex items-center gap-2 mb-2">
                                            {course.difficulty_level && (
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${DIFFICULTY_COLORS[course.difficulty_level] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                                    {course.difficulty_level}
                                                </span>
                                            )}
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${status === 'published'
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                                                {status}
                                            </span>
                                        </div>

                                        <div className="flex items-start gap-3 mb-2">
                                            <Link href={editHref} className={`flex-1 min-w-0 rounded ${focusRing}`}>
                                                <h2 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-2 leading-snug">
                                                    {course.title}
                                                </h2>
                                            </Link>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <Button
                                                    asChild
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-orange-600 dark:text-orange-400 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 font-bold gap-1.5 px-3 rounded-lg"
                                                >
                                                    <Link href={editHref} aria-label={`Edit ${course.title}`}>
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                        <span className="hidden sm:inline">Edit</span>
                                                    </Link>
                                                </Button>
                                                <Button
                                                    asChild
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 px-2.5 rounded-lg"
                                                >
                                                    <Link href={`/courses/${course.id}?preview=1`} target="_blank" rel="noopener noreferrer" aria-label={`Preview ${course.title} (opens in a new tab)`}>
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setPendingDelete(course)}
                                                    aria-label={`Delete ${course.title}`}
                                                    className="text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2.5 rounded-lg"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-4 flex-1">
                                            {course.description || 'No description provided.'}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center gap-1.5">
                                                <Users className="w-4 h-4" aria-hidden="true" />
                                                <span>{course.enrollment_count} student{course.enrollment_count !== 1 ? 's' : ''}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Star className={`w-4 h-4 ${course.avg_rating > 0 ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}`} aria-hidden="true" />
                                                <span>{course.avg_rating > 0 ? `${course.avg_rating} rating` : 'No ratings yet'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-4 h-4" aria-hidden="true" />
                                                <span>{course.estimated_duration_hours ? `${course.estimated_duration_hours}h` : 'Duration not set'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <Dialog open={!!pendingDelete} onOpenChange={(open) => { if (!open && !deleting) setPendingDelete(null); }}>
                <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">Delete this course?</DialogTitle>
                        <DialogDescription className="text-gray-500 dark:text-gray-400">
                            &quot;{pendingDelete?.title}&quot; will be unpublished and removed from your courses.
                            {pendingDelete && pendingDelete.enrollment_count > 0 && (
                                <> {pendingDelete.enrollment_count} enrolled student{pendingDelete.enrollment_count === 1 ? '' : 's'} will lose access to it.</>
                            )}
                            {' '}It is archived rather than erased, so it can be recovered later.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={deleting} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmDelete}
                            disabled={deleting}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl gap-2"
                        >
                            {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Delete course
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </ProtectedRoute>
    );
}
