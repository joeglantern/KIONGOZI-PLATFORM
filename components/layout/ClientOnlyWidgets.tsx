"use client";

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { PendingMissionClaim } from '@/components/landing/PendingMissionClaim';

// ssr: false is only valid inside Client Components.
// This wrapper lets the Server Component layout.tsx defer
// these browser-only widgets without violating that rule.
const OfflineDetector = dynamic(
  () => import('@/components/ui/OfflineDetector').then(m => ({ default: m.OfflineDetector })),
  { ssr: false }
);

const CookieConsentLoader = dynamic(
  () => import('@/components/layout/CookieConsentLoader').then(m => ({ default: m.CookieConsentLoader })),
  { ssr: false }
);

export function ClientOnlyWidgets() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().then((success) => {
            if (success) {
              console.log('Successfully unregistered service worker in development mode.');
              window.location.reload();
            }
          });
        }
      });
    }
  }, []);

  return (
    <>
      <OfflineDetector />
      <CookieConsentLoader />
      <PendingMissionClaim />
    </>
  );
}
