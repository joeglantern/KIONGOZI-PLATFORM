"use client";

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { motion } from 'framer-motion';

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
}

import { usePathname } from 'next/navigation';

export function Breadcrumb({ items }: BreadcrumbProps) {
    const pathname = usePathname();
    const isInstructor = pathname?.startsWith('/instructor');
    const homeHref = isInstructor ? '/instructor/dashboard' : '/dashboard';

    return (
        <nav className="flex mb-8 items-center space-x-2 text-xs font-black uppercase tracking-widest text-gray-400 overflow-x-auto pb-2 scrollbar-hide">
            <Link
                href={homeHref}
                className="flex items-center hover:text-orange-500 transition-colors bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm"
            >
                <Home className="w-3.5 h-3.5" />
            </Link>

            {items.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                    {item.href ? (
                        <Link
                            href={item.href}
                            className="hover:text-orange-500 transition-colors bg-white px-4 py-1.5 rounded-xl border border-gray-100 shadow-sm whitespace-nowrap"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="bg-orange-500 text-white px-4 py-1.5 rounded-xl shadow-md whitespace-nowrap">
                            {item.label}
                        </span>
                    )}
                </div>
            ))}
        </nav>
    );
}
