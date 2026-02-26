"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/app/contexts/UserContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: ('user' | 'instructor' | 'admin')[];
    redirectTo?: string;
}

export function ProtectedRoute({
    children,
    allowedRoles = ['user', 'instructor', 'admin'],
    redirectTo = '/login'
}: ProtectedRouteProps) {
    const router = useRouter();
    // `loading` is only true during the very first session check.
    // Once `user` is set, we render immediately — profile can load in background.
    const { user, profile, loading } = useUser();

    useEffect(() => {
        // If auth finished and there's no user, redirect to login
        if (!loading && !user) {
            router.push(redirectTo);
        }
    }, [loading, user, router, redirectTo]);

    // Role-based redirect: runs as soon as profile resolves (secondary, non-blocking)
    useEffect(() => {
        if (!loading && user && profile && !allowedRoles.includes(profile.role)) {
            if (profile.role === 'admin') {
                router.push('/admin/dashboard');
            } else if (profile.role === 'instructor') {
                router.push('/instructor/dashboard');
            } else {
                router.push('/dashboard');
            }
        }
    }, [loading, user, profile, allowedRoles, router]);

    // Only block on the initial session check (very fast — reads from cookie)
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Not authenticated — return null while redirect fires
    if (!user) {
        return null;
    }

    // Wrong role — return null while redirect fires
    if (profile && !allowedRoles.includes(profile.role)) {
        return null;
    }

    // ✅ Session confirmed — render immediately, don't wait for profile
    return <>{children}</>;
}
