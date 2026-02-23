import './globals.css';
import type { Metadata } from 'next';
import { UserProvider } from './contexts/UserContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { QueryProvider } from './providers/QueryProvider';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { OfflineDetector } from '@/components/ui/OfflineDetector';
import { ConditionalMain } from '@/components/layout/ConditionalMain';
import { Toaster } from '@/components/ui/toaster';

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
      <body className="antialiased font-sans">
        <QueryProvider>
          <UserProvider>
            <ThemeProvider>
              <OfflineDetector />
              <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
                <Navbar />
                <ConditionalMain>
                  <ErrorBoundary>
                    {children}
                  </ErrorBoundary>
                </ConditionalMain>
                <Footer />
                <Toaster />
              </div>
            </ThemeProvider>
          </UserProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
