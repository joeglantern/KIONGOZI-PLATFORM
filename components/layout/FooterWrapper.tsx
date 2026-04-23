"use client";

import { usePathname } from 'next/navigation';
import { Footer } from './Footer';

export function FooterWrapper() {
    const pathname = usePathname();
    if (pathname?.startsWith('/instructor')) return null;
    return <Footer />;
}
