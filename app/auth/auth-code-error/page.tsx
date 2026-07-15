"use client";

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSafeNext } from '@/lib/auth/redirects';

export default function AuthCodeErrorPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
            <AuthCodeErrorContent />
        </Suspense>
    );
}

function AuthCodeErrorContent() {
    const searchParams = useSearchParams();
    const next = getSafeNext(searchParams.get('next'));
    const reason = searchParams.get('reason');
    const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : '/login';
    const signupHref = next ? `/signup?next=${encodeURIComponent(next)}` : '/signup';
    const reasonMessage = reason === 'oauth_callback_failed'
        ? 'Google returned to Kiongozi, but the session exchange did not complete'
        : reason === 'oauth_callback_exception'
            ? 'The server hit an unexpected issue while finishing Google sign in'
            : reason === 'missing_auth_code'
                ? 'The provider response was missing the expected auth code'
                : null;

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 shadow-xl">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                    <AlertCircle className="h-7 w-7 text-red-600" />
                </div>
                <div className="space-y-3 text-center">
                    <h1 className="text-2xl font-bold text-gray-900">We couldn't finish signing you in</h1>
                    <p className="text-sm text-gray-600">
                        Your login session did not complete successfully. Please try again, or use email and password if Google keeps failing.
                    </p>
                    {reasonMessage && (
                        <p className="text-xs font-medium text-gray-500">
                            Detail: {reasonMessage}
                        </p>
                    )}
                </div>
                <div className="mt-6 space-y-3">
                    <Button asChild className="w-full bg-orange-600 hover:bg-orange-700">
                        <Link href={loginHref}>Try Sign In Again</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                        <Link href={signupHref}>Go to Sign Up</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
