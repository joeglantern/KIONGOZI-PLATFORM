import type { Metadata } from 'next'
import './globals.css'
import ClientProvider from './components/ClientProvider'

export const metadata: Metadata = {
  title: 'Kiongozi Chat',
  description: 'An AI-powered chatbot for conversations and assistance.',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/Kiongozi.png',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-screen" suppressHydrationWarning>
        <ClientProvider>
          {children}
        </ClientProvider>
      </body>
    </html>
  )
} 