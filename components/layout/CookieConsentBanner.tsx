"use client";

import React from 'react';
import Link from 'next/link';
import { useCookieConsent } from '@/app/contexts/CookieConsentContext';
import { Shield, Settings, X } from 'lucide-react';

export function CookieConsentBanner() {
    const { hydrated, consentGiven, acceptAll, rejectAll, setShowPreferences } = useCookieConsent();

    // Don't render until hydrated (localStorage read), or if consent already given
    if (!hydrated || consentGiven) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9998] transition-opacity duration-300"
                aria-hidden="true"
            />

            {/* Banner */}
            <div
                role="dialog"
                aria-label="Cookie consent"
                aria-modal="true"
                className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6 animate-slide-up"
            >
                <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Header */}
                    <div className="bg-orange-50 dark:bg-orange-950/30 px-6 py-4 border-b border-orange-100 dark:border-orange-900/30">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Shield className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    We value your privacy
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    GDPR &amp; Data Protection Compliant
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-5">
                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">
                            We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic.
                            By clicking &quot;Accept All&quot;, you consent to our use of cookies. Non-essential cookies are{' '}
                            <strong className="text-gray-900 dark:text-white">disabled by default</strong> until you choose otherwise.
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">
                            Read our{' '}
                            <Link href="/cookie-notice" className="text-orange-600 hover:text-orange-700 underline font-medium">
                                Cookie Notice
                            </Link>{' '}
                            and{' '}
                            <Link href="/privacy-policy" className="text-orange-600 hover:text-orange-700 underline font-medium">
                                Privacy Policy
                            </Link>{' '}
                            for more details.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="px-6 pb-5 flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={acceptAll}
                            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:shadow-lg active:scale-[0.98] text-sm"
                        >
                            Accept All
                        </button>
                        <button
                            onClick={rejectAll}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-3 px-6 rounded-xl transition-all duration-200 text-sm"
                        >
                            Reject All
                        </button>
                        <button
                            onClick={() => setShowPreferences(true)}
                            className="flex-1 border-2 border-orange-200 dark:border-orange-800 hover:border-orange-400 dark:hover:border-orange-600 text-orange-600 dark:text-orange-400 font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
                        >
                            <Settings className="w-4 h-4" />
                            <span>Customize</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
