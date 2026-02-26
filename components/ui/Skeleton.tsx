"use client";

/**
 * Premium loading skeleton components for a polished loading UX.
 * Replaces raw spinner-only states with shimmer placeholders.
 */

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <div
            className={`skeleton-shimmer rounded-lg ${className}`}
        />
    );
}

// ---- Dashboard Skeleton ----
export function DashboardSkeleton() {
    return (
        <div className="space-y-8 p-6">
            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100">
                        <Skeleton className="h-4 w-20 mb-3" />
                        <Skeleton className="h-8 w-16 mb-2" />
                        <Skeleton className="h-3 w-28" />
                    </div>
                ))}
            </div>
            {/* Continue Learning */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <Skeleton className="h-5 w-48 mb-4" />
                <div className="flex gap-4">
                    <Skeleton className="h-24 w-40 rounded-xl" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                </div>
            </div>
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                    <Skeleton className="h-5 w-32 mb-4" />
                    <Skeleton className="h-48 w-full rounded-xl" />
                </div>
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                    <Skeleton className="h-5 w-32 mb-4" />
                    <Skeleton className="h-48 w-full rounded-xl" />
                </div>
            </div>
        </div>
    );
}

// ---- Course Card Skeleton ----
export function CourseCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <Skeleton className="h-48 w-full rounded-none" />
            <div className="p-5 space-y-3">
                <div className="flex gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-9 w-28 rounded-xl" />
                </div>
            </div>
        </div>
    );
}

// ---- Course Grid Skeleton ----
export function CourseGridSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(count)].map((_, i) => (
                <CourseCardSkeleton key={i} />
            ))}
        </div>
    );
}

// ---- Module List Skeleton ----
export function ModuleListSkeleton() {
    return (
        <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
            ))}
        </div>
    );
}

// ---- Profile Skeleton ----
export function ProfileSkeleton() {
    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <div className="flex items-center gap-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-24" />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
                        <Skeleton className="h-8 w-16 mx-auto mb-2" />
                        <Skeleton className="h-3 w-20 mx-auto" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ---- Bookmarks Skeleton ----
export function BookmarksSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-[2.5rem] p-6 border border-gray-100">
                    <div className="flex items-start gap-3 mb-4">
                        <Skeleton className="h-12 w-12 rounded-2xl flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-5 w-3/4" />
                        </div>
                    </div>
                    <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-8 w-16 rounded-xl" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ---- Notes Skeleton ----
export function NotesSkeleton() {
    return (
        <div className="space-y-8">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden">
                    <div className="px-8 py-6 flex items-center gap-4 border-b border-gray-50">
                        <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    </div>
                    <div className="p-8 space-y-4">
                        {[...Array(2)].map((_, j) => (
                            <div key={j}>
                                <div className="flex items-center justify-between mb-2">
                                    <Skeleton className="h-4 w-40" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                                <Skeleton className="h-20 w-full rounded-2xl" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ---- Certificates Skeleton ----
export function CertificatesSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden">
                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-16 w-16 rounded-2xl flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        </div>
                        <div className="space-y-3 pt-2">
                            <div className="flex justify-between">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                            <div className="flex justify-between">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                            <Skeleton className="h-7 w-32 rounded-xl" />
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <Skeleton className="h-12 rounded-2xl" />
                            <Skeleton className="h-12 rounded-2xl" />
                        </div>
                        <Skeleton className="h-12 rounded-2xl" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ---- Course Detail Skeleton ----
export function CourseDetailSkeleton() {
    return (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
            {/* Course header card */}
            <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 space-y-4">
                        <div className="flex gap-2">
                            <Skeleton className="h-6 w-20 rounded-full" />
                            <Skeleton className="h-6 w-24 rounded-full" />
                        </div>
                        <Skeleton className="h-10 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                        <div className="flex gap-6 pt-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    </div>
                    <div className="min-w-[280px] bg-gray-50 rounded-lg p-6 border-2 border-gray-100 space-y-4">
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-2 w-full rounded-full" />
                        <Skeleton className="h-10 w-full rounded-xl" />
                        <Skeleton className="h-10 w-full rounded-xl" />
                    </div>
                </div>
            </div>
            {/* Tabs */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex border-b border-gray-100">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="flex-1 h-16 rounded-none" />
                    ))}
                </div>
                <div className="p-8 space-y-3">
                    <Skeleton className="h-7 w-32 mb-6" />
                    <ModuleListSkeleton />
                </div>
            </div>
        </div>
    );
}

// ---- Module Viewer Skeleton ----
export function ModuleViewerSkeleton() {
    return (
        <div className="min-h-screen bg-gray-50 flex overflow-hidden">
            {/* Sidebar */}
            <aside className="w-80 border-r border-gray-100 bg-white hidden lg:block flex-shrink-0">
                <div className="p-6 border-b border-gray-100">
                    <Skeleton className="h-5 w-40 mb-1" />
                    <Skeleton className="h-3 w-24 mt-2" />
                </div>
                <div className="p-4 space-y-2">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                            <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
                            <Skeleton className="h-4 flex-1" />
                        </div>
                    ))}
                </div>
            </aside>
            {/* Content */}
            <div className="flex-1 flex flex-col">
                <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                        <Skeleton className="h-5 w-64" />
                        <Skeleton className="h-3 w-40" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-9 w-20 rounded-xl" />
                        <Skeleton className="h-9 w-32 rounded-xl" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-4xl mx-auto px-8 py-12 space-y-8">
                        <Skeleton className="aspect-video w-full rounded-2xl" />
                        <div className="bg-white rounded-3xl p-12 border border-gray-100 space-y-4">
                            <Skeleton className="h-8 w-3/4" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

