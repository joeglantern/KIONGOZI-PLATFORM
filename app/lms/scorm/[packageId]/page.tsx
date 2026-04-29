'use client';

import { useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/app/utils/supabaseClient';
import { useUser } from '@/app/contexts/UserContext';
import ScormPlayer from '@/components/scorm/ScormPlayer';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
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
  const { user, profile } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const packageId = params.packageId as string;

  const { data: pkg, isLoading: loadingPkg } = useQuery({
    queryKey: ['scorm-package', packageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scorm_packages')
        .select('id, title, course_id')
        .eq('id', packageId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!packageId,
    staleTime: 5 * 60 * 1000,
  });

  const courseId = pkg?.course_id;

  const { data: courseData } = useQuery({
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
    searchParams.get('preview') === '1' &&
    !!(profile?.role === 'admin' || course?.author_id === user?.id);
  const currentIndex = items.findIndex((item) => item.type === 'scorm' && item.id === packageId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < items.length - 1;

  const navigateTo = (direction: 'prev' | 'next') => {
    const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    router.push(items[targetIndex].href);
  };

  if (loadingPkg) {
    return (
      <ProtectedRoute allowedRoles={['user', 'instructor', 'admin']}>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['user', 'instructor', 'admin']}>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Top bar */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30 px-4 py-3 sm:px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-black text-gray-900 truncate leading-tight mb-1">
                {pkg?.title || 'SCORM Content'}
              </h2>
              {course && (
                <Breadcrumb items={[
                  { label: 'Courses', href: '/courses' },
                  { label: course.title, href: `/courses/${courseId}` },
                  { label: `Lesson ${currentIndex >= 0 ? currentIndex + 1 : ''}` },
                ]} />
              )}
            </div>
            {course && (
              <Link
                href={`/courses/${courseId}`}
                className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
                Back to Course
              </Link>
            )}
          </div>
        </header>

        {/* Player */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
          <ScormPlayer packageId={packageId} preview={isPreviewMode} />
        </main>

        {/* Navigation Footer */}
        {items.length > 1 && (
          <footer className="bg-white border-t border-gray-100 p-4 shrink-0">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <button
                onClick={() => navigateTo('prev')}
                disabled={!hasPrev}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-gray-500 hover:text-gray-900 border border-transparent hover:border-gray-100 hover:bg-gray-50 transition-all font-bold disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Previous</span>
              </button>

              <div className="hidden sm:block text-xs font-bold text-gray-400 uppercase tracking-widest">
                {currentIndex >= 0 ? currentIndex + 1 : '–'} / {items.length}
              </div>

              <button
                onClick={() => navigateTo('next')}
                disabled={!hasNext}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white transition-all font-bold disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </footer>
        )}
      </div>
    </ProtectedRoute>
  );
}
