"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/app/contexts/UserContext';
import { MascotLoader } from '@/components/mascots/LottieMascots';

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
            const currentPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';
            const nextUrl = currentPath ? `${redirectTo}?next=${encodeURIComponent(currentPath)}` : redirectTo;
            router.push(nextUrl);
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
                <MascotLoader className="w-28 h-28" label="Loading…" />
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
