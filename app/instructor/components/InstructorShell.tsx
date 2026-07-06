"use client";

import { useState } from 'react';
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
