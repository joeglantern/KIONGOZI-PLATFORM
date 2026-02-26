import { Skeleton } from '@/components/ui/Skeleton';

export default function MyLearningLoading() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header skeleton */}
                <div className="mb-8 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>

                {/* Tab bar skeleton */}
                <div className="flex gap-2 mb-6">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-10 w-28 rounded-xl" />
                    ))}
                </div>

                {/* Course cards skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                            <Skeleton className="h-40 w-full rounded-none" />
                            <div className="p-5 space-y-3">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-3 w-full" />
                                <div className="flex items-center justify-between pt-2">
                                    <Skeleton className="h-2 w-full rounded-full" />
                                </div>
                                <Skeleton className="h-4 w-20" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
