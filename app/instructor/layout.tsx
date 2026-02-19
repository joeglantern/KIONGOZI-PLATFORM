"use client";

import { useState } from 'react';
import { InstructorSidebar } from './components/InstructorSidebar';
import { InstructorNavbar } from './components/InstructorNavbar';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useUser } from '@/app/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

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

    // Show loading while checking auth
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    // Block render for non-instructors
    if (!user || (profile && profile.role !== 'instructor' && profile.role !== 'admin')) {
        return null;
    }

    return (
        <div className="flex min-h-screen bg-gray-50/50 dark:bg-gray-950 transition-colors">
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
