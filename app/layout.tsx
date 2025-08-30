import type { Metadata } from 'next'
import './globals.css'
import dynamic from 'next/dynamic'

const SupabaseTokenBridge = dynamic(() => import('./supabase-token-bridge'), { ssr: false })

export const metadata: Metadata = {
  title: 'AI Chatbot',
  description: 'An AI-powered chatbot for conversations and assistance.',
  icons: {
    icon: '/images/ai-head-icon.svg',
    apple: '/images/ai-head-icon.svg',
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
        <link rel="icon" href="/images/ai-head-icon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-screen" suppressHydrationWarning>
        <SupabaseTokenBridge />
        {children}
      </body>
    </html>
  )
} 