import './globals.css';
import { Suspense } from 'react';
import { Roboto } from 'next/font/google';
import dynamic from 'next/dynamic';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-roboto',
});
import type { Metadata } from 'next';
import { UserProvider } from './contexts/UserContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { CookieConsentProvider } from './contexts/CookieConsentContext';
import { QueryProvider } from './providers/QueryProvider';
import { Navbar } from '@/components/layout/Navbar';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Toaster } from '@/components/ui/toaster';

// Lazy-load non-critical layout pieces so they don't block initial paint
const Footer = dynamic(() => import('@/components/layout/Footer').then(m => ({ default: m.Footer })), {
  ssr: true,
  loading: () => null,
});
const OfflineDetector = dynamic(() => import('@/components/ui/OfflineDetector').then(m => ({ default: m.OfflineDetector })), {
  ssr: false,
});
const CookieConsentLoader = dynamic(() => import('@/components/layout/CookieConsentLoader').then(m => ({ default: m.CookieConsentLoader })), {
  ssr: false,
});

export const metadata: Metadata = {
  title: 'The Kiongozi Platform | Empowering Civic Action & Climate Advocacy',
  description: 'Join Kenya\'s premier community for green tech, civic governance, and climate advocacy. Master skills, organize events, and drive real-world impact.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://learn.kiongozi.org'),
  openGraph: {
    title: 'The Kiongozi Platform',
    description: 'Empowering civic action, climate advocacy, and green tech innovation across Kenya.',
    url: 'https://learn.kiongozi.org',
    siteName: 'Kiongozi Platform',
    locale: 'en_KE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Kiongozi Platform',
    description: 'Empowering civic action and climate advocacy.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ea580c" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={`${roboto.variable} antialiased font-sans`}>
        <QueryProvider>
          <UserProvider>
            <ThemeProvider>
              <CookieConsentProvider>
                <OfflineDetector />
                <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
                  <Navbar />
                  <main className="flex-1 pt-16">
                    <ErrorBoundary>
                      <Suspense fallback={null}>
                        {children}
                      </Suspense>
                    </ErrorBoundary>
                  </main>
                  <Suspense fallback={null}>
                    <Footer />
                  </Suspense>
                  <Toaster />
                </div>
                <CookieConsentLoader />
              </CookieConsentProvider>
            </ThemeProvider>
          </UserProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
