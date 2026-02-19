"use client";

import { usePathname } from 'next/navigation';

export function ConditionalMain({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isInstructorRoute = pathname?.startsWith('/instructor');

    return (
        <main className={`flex-1 ${isInstructorRoute ? '' : 'pt-16'}`}>
            {children}
        </main>
    );
}
