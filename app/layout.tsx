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

export const metadata: Metadata = {
  title: 'Kiongozi LMS - Empowering Kenya\'s Future Leaders',
  description: 'Master skills in green tech, digital innovation, and leadership. Interactive courses designed for Kenya\'s youth.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
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
              </div>
            </ThemeProvider>
          </UserProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
