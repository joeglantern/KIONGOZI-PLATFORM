"use client";

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[GlobalError]', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 max-w-md w-full text-center">
                <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">⚠️</span>
                </div>
                <h1 className="text-2xl font-black text-gray-900 mb-2">Something went wrong</h1>
                <p className="text-gray-500 text-sm mb-8">
                    An unexpected error occurred. Our team has been notified.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-all"
                    >
                        Try again
                    </button>
                    <Link
                        href="/"
                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all"
                    >
                        Go home
                    </Link>
                </div>
            </div>
        </div>
    );
}
