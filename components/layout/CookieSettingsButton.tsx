"use client";

import React from 'react';
import { useCookieConsent } from '@/app/contexts/CookieConsentContext';
import { Cookie } from 'lucide-react';

export function CookieSettingsButton() {
    const { hydrated, consentGiven, setShowPreferences } = useCookieConsent();

    // Only show after hydration and after user has given consent
    if (!hydrated || !consentGiven) return null;

    return (
        <button
            onClick={() => setShowPreferences(true)}
            aria-label="Cookie settings"
            title="Manage cookie preferences"
            className="fixed bottom-4 left-4 z-[9990] w-11 h-11 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-all duration-200 hover:scale-110 active:scale-95 group"
        >
            <Cookie className="w-5 h-5 transition-transform duration-200 group-hover:rotate-12" />
        </button>
    );
}
