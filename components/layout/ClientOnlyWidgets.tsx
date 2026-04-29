"use client";

import dynamic from 'next/dynamic';

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
  return (
    <>
      <OfflineDetector />
      <CookieConsentLoader />
    </>
  );
}
