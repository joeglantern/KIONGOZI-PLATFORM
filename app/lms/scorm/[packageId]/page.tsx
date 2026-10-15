'use client';

import { useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/app/utils/supabase/client';
import { useUser } from '@/app/contexts/UserContext';
import ScormPlayer from '@/components/scorm/ScormPlayer';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ChevronLeft, ChevronRight, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ContentItem {
  id: string;
  type: 'module' | 'scorm';
  title: string;
  href: string;
}

export default function ScormPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, profile } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const packageId = params.packageId as string;
  const previewRequested = searchParams.get('preview') === '1';

  const { data: pkg, isLoading: loadingPkg } = useQuery({
    queryKey: ['scorm-package', packageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scorm_packages')
        .select('id, title, course_id')
        .eq('id', packageId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!packageId,
    staleTime: 5 * 60 * 1000,
  });

  const courseId = pkg?.course_id;

  const { data: courseData, isLoading: loadingCourse } = useQuery({
    queryKey: ['scorm-nav-context', courseId],
    queryFn: async () => {
      const [courseResult, modulesResult, scormResult] = await Promise.all([
        supabase
          .from('courses')
          .select('id, title, author_id')
          .eq('id', courseId!)
          .single(),
        supabase
          .from('course_modules')
          .select('order_index, module_id')
          .eq('course_id', courseId!)
          .order('order_index'),
        supabase
          .from('scorm_packages')
          .select('id, title')
          .eq('course_id', courseId!)
          .eq('status', 'active')
          .order('created_at'),
      ]);

      if (courseResult.error) throw courseResult.error;

      const moduleLinks = modulesResult.data || [];
      const moduleIds = moduleLinks.map((m: any) => m.module_id).filter(Boolean);

      let moduleTitles = new Map<string, string>();
      if (moduleIds.length > 0) {
        const source = profile?.role === 'admin' || courseResult.data.author_id === user?.id
          ? 'learning_modules'
          : 'learning_module_previews';
        const { data: mods } = await supabase
          .from(source)
          .select('id, title')
          .in('id', moduleIds);
        moduleTitles = new Map((mods || []).map((m: any) => [m.id, m.title]));
      }

      const moduleItems: ContentItem[] = moduleLinks
        .filter((ml: any) => moduleTitles.has(ml.module_id))
        .map((ml: any) => ({
          id: ml.module_id,
          type: 'module',
          title: moduleTitles.get(ml.module_id)!,
          href: `/courses/${courseId}/modules/${ml.module_id}`,
        }));

      const scormItems: ContentItem[] = (scormResult.data || []).map((p: any) => ({
        id: p.id,
        type: 'scorm',
        title: p.title,
        href: `/lms/scorm/${p.id}`,
      }));

      return {
        course: courseResult.data,
        items: [...moduleItems, ...scormItems],
      };
    },
    enabled: !!courseId && !!user,
    staleTime: 5 * 60 * 1000,
  });

  const items = courseData?.items || [];
  const course = courseData?.course;
  const isPreviewMode =
    previewRequested &&
    !!(profile?.role === 'admin' || course?.author_id === user?.id);
  const previewSuffix = isPreviewMode ? '?preview=1' : '';
  const currentIndex = items.findIndex((item) => item.type === 'scorm' && item.id === packageId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < items.length - 1;
  const courseHref = courseId ? `/courses/${courseId}${previewSuffix}` : '/my-learning';

  // A preview launch must not start until we know whether the viewer may
  // preview; otherwise the player would init (and track) as a normal attempt.
  const waitingForPreviewCheck = previewRequested && !!courseId && (loadingCourse || !profile);

  const navigateTo = (direction: 'prev' | 'next') => {
    const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    router.push(`${items[targetIndex].href}${previewSuffix}`);
  };

  // Refresh course progress views once the package reports completion.
  const handleCompleted = useCallback(() => {
    if (!courseId) return;
    void queryClient.invalidateQueries({ queryKey: ['course-full-details', courseId] });
    void queryClient.invalidateQueries({ queryKey: ['my-enrolled-courses'] });
    void queryClient.invalidateQueries({ queryKey: ['my-scorm-packages'] });
  }, [courseId, queryClient]);

  if (loadingPkg || waitingForPreviewCheck) {
    return (
      <ProtectedRoute allowedRoles={['user', 'instructor', 'admin']}>
        <div className="flex items-center justify-center min-h-[60vh]" role="status">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          <span className="sr-only">Loading lesson…</span>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['user', 'instructor', 'admin']}>
      <div className="min-h-[calc(100dvh-4rem)] bg-gray-50 dark:bg-gray-950 flex flex-col">
        {/* Top bar (sits below the fixed site navbar) */}
        <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 sticky top-16 z-30 px-4 py-3 sm:px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black text-gray-900 dark:text-white truncate leading-tight mb-1">
                {pkg?.title || 'Interactive lesson'}
              </h1>
              {course && (
                <Breadcrumb items={[
                  { label: 'Courses', href: '/courses' },
                  { label: course.title, href: courseHref },
                  { label: currentIndex >= 0 ? `Lesson ${currentIndex + 1}` : 'Interactive lesson' },
                ]} />
              )}
            </div>
            <Link
              href={courseHref}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{course ? 'Back to course' : 'My learning'}</span>
            </Link>
          </div>
        </header>

        {/* Player */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-2 sm:px-4 py-4 sm:py-6">
          {pkg ? (
            <ScormPlayer packageId={packageId} preview={isPreviewMode} onCompleted={handleCompleted} />
          ) : (
            <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800" role="alert">
              <p className="font-bold text-gray-900 dark:text-white mb-1">This lesson isn&apos;t available</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">You may need to enroll in the course first, or the lesson was removed.</p>
              <Link href="/my-learning" className="text-sm font-bold text-orange-600 hover:text-orange-700">Go to My learning</Link>
            </div>
          )}
        </main>

        {/* Navigation Footer */}
        {items.length > 1 && (
          <nav aria-label="Lesson navigation" className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-3 sm:p-4 shrink-0">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigateTo('prev')}
                disabled={!hasPrev}
                className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-bold disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Previous</span>
              </button>

              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest tabular-nums">
                {currentIndex >= 0 ? currentIndex + 1 : 0} / {items.length}
              </div>

              <button
                type="button"
                onClick={() => navigateTo('next')}
                disabled={!hasNext}
                className="flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl bg-gray-900 dark:bg-white hover:bg-black dark:hover:bg-gray-100 text-white dark:text-gray-900 transition-all font-bold disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </nav>
        )}
      </div>
    </ProtectedRoute>
  );
}
