"use client";

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail } from 'lucide-react';

const SUPPORT_EMAIL = 'user.support@kiongozi.org';

const platformLinks = [
    { label: 'Browse courses', href: '/courses' },
    { label: 'Community', href: '/community' },
    { label: 'Impact map', href: '/impact-map' },
];

const legalLinks = [
    { label: 'Privacy policy', href: '/privacy-policy' },
    { label: 'Terms of service', href: '/terms-of-service' },
    { label: 'Cookie notice', href: '/cookie-notice' },
];

const linkClass =
    'rounded-sm text-gray-400 hover:text-orange-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900';

export function Footer() {
    const pathname = usePathname();
    const currentYear = new Date().getFullYear();

    // The instructor portal is a full-screen app shell with its own chrome.
    // Rendering the site footer underneath it leaves invisible, still-focusable
    // links behind the shell, so skip it there (the root Navbar does the same).
    if (pathname?.startsWith('/instructor')) return null;

    return (
        <footer className="bg-gray-900 text-gray-300" aria-labelledby="site-footer-heading">
            <h2 id="site-footer-heading" className="sr-only">Site footer</h2>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-8">
                    {/* Brand */}
                    <div className="sm:col-span-2">
                        <Link href="/" className={`inline-flex items-center gap-2 mb-4 ${linkClass}`}>
                            <Image
                                src="/logo.png"
                                alt=""
                                width={40}
                                height={40}
                                className="w-10 h-10 object-contain drop-shadow-sm"
                            />
                            <span className="text-xl font-bold text-white">Kiongozi</span>
                        </Link>
                        <p className="text-gray-400 mb-5 max-w-md leading-relaxed">
                            Skills for Kenya&apos;s youth in the green economy, civic leadership and the digital future.
                        </p>
                        <a
                            href={`mailto:${SUPPORT_EMAIL}`}
                            className={`inline-flex items-center gap-2 text-sm ${linkClass}`}
                        >
                            <Mail className="w-4 h-4" aria-hidden="true" />
                            <span>{SUPPORT_EMAIL}</span>
                        </a>
                    </div>

                    <nav aria-label="Platform">
                        <h3 className="text-white font-semibold mb-4">Platform</h3>
                        <ul className="space-y-2.5">
                            {platformLinks.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className={linkClass}>{link.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <nav aria-label="Support">
                        <h3 className="text-white font-semibold mb-4">Support</h3>
                        <ul className="space-y-2.5">
                            <li>
                                <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>Contact us</a>
                            </li>
                            {legalLinks.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className={linkClass}>{link.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-800">
                    <p className="text-gray-500 text-sm text-center md:text-left">
                        © {currentYear} Kiongozi Platform. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
