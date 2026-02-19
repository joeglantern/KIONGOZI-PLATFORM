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
    const { user, profile, loading } = useUser();

    useEffect(() => {
        if (!loading) {
            // Not authenticated
            if (!user) {
                router.push(redirectTo);
                return;
            }

            // Authenticated but role not allowed
            if (profile && !allowedRoles.includes(profile.role)) {
                // Redirect based on their actual role
                if (profile.role === 'admin') {
                    router.push('/admin/dashboard');
                } else if (profile.role === 'instructor') {
                    router.push('/instructor/dashboard');
                } else {
                    router.push('/dashboard');
                }
            }
        }
    }, [user, profile, loading, router, allowedRoles, redirectTo]);

    // Show loading state
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

    // Not authenticated
    if (!user) {
        return null;
    }

    // Authenticated but wrong role
    if (profile && !allowedRoles.includes(profile.role)) {
        return null;
    }

    // Authenticated and correct role
    return <>{children}</>;
}
