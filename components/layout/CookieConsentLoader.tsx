"use client";

import dynamic from 'next/dynamic';

const CookieConsentBanner = dynamic(
    () => import('@/components/layout/CookieConsentBanner').then(mod => mod.CookieConsentBanner),
    { ssr: false }
);

const CookiePreferencesModal = dynamic(
    () => import('@/components/layout/CookiePreferencesModal').then(mod => mod.CookiePreferencesModal),
    { ssr: false }
);

const CookieSettingsButton = dynamic(
    () => import('@/components/layout/CookieSettingsButton').then(mod => mod.CookieSettingsButton),
    { ssr: false }
);

export function CookieConsentLoader() {
    return (
        <>
            <CookieConsentBanner />
            <CookiePreferencesModal />
            <CookieSettingsButton />
        </>
    );
}
