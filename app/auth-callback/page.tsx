'use client'

import { useEffect, useState } from 'react'

export default function SupabaseAuthCallback() {
  const [status, setStatus] = useState<'redirecting' | 'success' | 'no-tokens'>('redirecting')

  useEffect(() => {
    // Extract tokens from URL fragment
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)

    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (accessToken && refreshToken) {
      // Construct deep link for mobile app
      const deepLink = `kiongozi://auth-callback?access_token=${accessToken}&refresh_token=${refreshToken}`

      console.log('Redirecting to mobile app with deep link:', deepLink)

      // Redirect to mobile app
      window.location.replace(deepLink)
      setStatus('redirecting')
    } else {
      setStatus('no-tokens')
    }
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        maxWidth: '400px',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        {status === 'redirecting' && (
          <>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 24px',
              border: '4px solid #e5e7eb',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
            <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
              Opening Kiongozi App...
            </h2>
            <p style={{ color: '#6b7280', lineHeight: '1.5' }}>
              You will be redirected to the mobile app automatically.
            </p>
          </>
        )}

        {status === 'no-tokens' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '24px' }}>✅</div>
            <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
              Email Verified Successfully!
            </h2>
            <p style={{ color: '#6b7280', lineHeight: '1.5', marginBottom: '20px' }}>
              Please open the Kiongozi mobile app to continue.
            </p>
            <p style={{ fontSize: '14px', color: '#9ca3af' }}>
              If the app doesn't open automatically, please switch to it manually.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
