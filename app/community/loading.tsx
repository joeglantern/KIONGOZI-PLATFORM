import { Skeleton } from '@/components/ui/Skeleton';

export default function CommunityLoading() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-3xl mx-auto px-4 py-8">
                {/* Header skeleton */}
                <div className="mb-8 text-center">
                    <Skeleton className="h-10 w-56 mx-auto mb-3" />
                    <Skeleton className="h-4 w-72 mx-auto" />
                </div>

                {/* Post composer skeleton */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
                    <div className="flex items-start gap-3">
                        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                        <div className="flex-1 space-y-3">
                            <Skeleton className="h-20 w-full rounded-xl" />
                            <div className="flex justify-end">
                                <Skeleton className="h-9 w-24 rounded-xl" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Feed skeleton */}
                <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100">
                            <div className="flex items-center gap-3 mb-4">
                                <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                                <div className="space-y-1 flex-1">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                            </div>
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-4 w-5/6 mb-2" />
                            <Skeleton className="h-4 w-2/3 mb-4" />
                            <div className="flex gap-4 pt-3 border-t border-gray-100">
                                <Skeleton className="h-8 w-16 rounded-lg" />
                                <Skeleton className="h-8 w-16 rounded-lg" />
                                <Skeleton className="h-8 w-16 rounded-lg" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
