import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kiongozi Platform',
  description: 'A civic education platform for Kenyan youth to learn about elections, leadership, and civic duties.',
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
        {children}
      </body>
    </html>
  )
} 