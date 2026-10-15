"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { InstructorSidebar } from './InstructorSidebar';
import { InstructorNavbar } from './InstructorNavbar';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

/**
 * Client UI shell for the instructor area (sidebar + navbar chrome).
 * Auth/role gating lives in the server-component layout that wraps this,
 * so the shell only owns presentation state.
 */
export function InstructorShell({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();

    // The shell persists across instructor routes, so close the mobile drawer
    // whenever the route changes instead of leaving it covering the new page.
    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!sidebarOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setSidebarOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [sidebarOpen]);

    return (
        // This shell covers the root layout's <main pt-16> completely; the root
        // Navbar and Footer both skip rendering on /instructor routes.
        <div className="fixed inset-0 flex bg-gray-50 dark:bg-gray-950 transition-colors overflow-hidden z-50">
            <a
                href="#instructor-main"
                className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-orange-600 focus:text-white focus:font-bold"
            >
                Skip to content
            </a>

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
                    aria-hidden="true"
                />
            )}

            {/* Mobile Sidebar */}
            <div
                id="instructor-mobile-nav"
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 transform transition-transform duration-200 ease-out lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full invisible'}`}
            >
                <ErrorBoundary fallbackMessage="Sidebar Error">
                    <InstructorSidebar onClose={() => setSidebarOpen(false)} />
                </ErrorBoundary>
            </div>

            {/* Main Content */}
            <div className="flex-1 lg:ml-64 flex flex-col h-[100dvh] min-h-0 min-w-0">
                <ErrorBoundary fallbackMessage="Navbar Error">
                    <InstructorNavbar onMenuClick={() => setSidebarOpen(true)} menuOpen={sidebarOpen} />
                </ErrorBoundary>
                <main id="instructor-main" tabIndex={-1} className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-8 focus:outline-none">
                    <ErrorBoundary>
                        {children}
                    </ErrorBoundary>
                </main>
            </div>
        </div>
    );
}
