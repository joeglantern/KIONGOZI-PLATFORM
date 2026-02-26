import { CourseGridSkeleton } from '@/components/ui/Skeleton';

export default function CoursesLoading() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header skeleton */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
                        <div className="space-y-2">
                            <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
                            <div className="h-4 w-64 bg-gray-100 rounded-lg animate-pulse" />
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Filter sidebar skeleton */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl p-8 border border-gray-100 space-y-6">
                            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                            <div className="h-10 w-full bg-gray-100 rounded-xl animate-pulse" />
                            <div className="h-10 w-full bg-gray-100 rounded-xl animate-pulse" />
                            <div className="grid grid-cols-2 gap-2">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="h-9 bg-gray-100 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        </div>
                    </div>
                    {/* Course grid skeleton */}
                    <div className="lg:col-span-3">
                        <CourseGridSkeleton count={6} />
                    </div>
                </div>
            </div>
        </div>
    );
}
