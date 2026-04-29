"use client";

import { useState } from 'react';
import { InstructorSidebar } from './components/InstructorSidebar';
import { InstructorNavbar } from './components/InstructorNavbar';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useUser } from '@/app/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

export default function InstructorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, profile, loading } = useUser();
    const router = useRouter();

    // Role guard: redirect non-instructors/admins away
    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
                return;
            }
            if (profile && profile.role !== 'instructor' && profile.role !== 'admin') {
                router.push('/dashboard');
            }
        }
    }, [user, profile, loading, router]);

    // Show layout skeleton while checking auth
    if (loading) {
        return (
            <div className="flex min-h-screen bg-gray-50/50 dark:bg-gray-950">
                <div className="hidden lg:block w-64 bg-white border-r border-gray-100" />
                <div className="flex-1 lg:ml-64">
                    <div className="h-16 bg-white border-b border-gray-100" />
                    <div className="p-8 space-y-4">
                        <Skeleton className="h-8 w-48" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[...Array(4)].map((_, i) => (
                                <Skeleton key={i} className="h-24 rounded-2xl" />
                            ))}
                        </div>
                        <Skeleton className="h-64 rounded-2xl" />
                    </div>
                </div>
            </div>
        );
    }

    // Block render for non-instructors
    if (!user || (profile && profile.role !== 'instructor' && profile.role !== 'admin')) {
        return null;
    }

    return (
        // This shell covers the root layout's <main pt-16> and <Footer> completely.
        <div className="fixed inset-0 flex bg-gray-50 dark:bg-gray-950 transition-colors overflow-hidden z-50">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block w-64 fixed inset-y-0">
                <ErrorBoundary fallbackMessage="Sidebar Error">
                    <InstructorSidebar />
                </ErrorBoundary>
            </div>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 transform transition-transform duration-200 ease-in-out lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <ErrorBoundary fallbackMessage="Sidebar Error">
                    <InstructorSidebar />
                </ErrorBoundary>
            </div>

            {/* Main Content */}
            <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
                <ErrorBoundary fallbackMessage="Navbar Error">
                    <InstructorNavbar onMenuClick={() => setSidebarOpen(true)} />
                </ErrorBoundary>
                <main className="flex-1 p-4 lg:p-8">
                    <ErrorBoundary>
                        {children}
                    </ErrorBoundary>
                </main>
            </div>
        </div>
    );
}
