"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[DashboardError]', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 max-w-md w-full text-center">
                <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <LayoutDashboard className="w-8 h-8 text-orange-400" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Dashboard failed to load</h2>
                <p className="text-gray-500 text-sm mb-8">
                    We couldn't load your dashboard data. Your progress is safe — please try again.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-all"
                    >
                        Retry
                    </button>
                    <Link
                        href="/courses"
                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all"
                    >
                        Browse Courses
                    </Link>
                </div>
            </div>
        </div>
    );
}
