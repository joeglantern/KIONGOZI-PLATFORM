import { useEffect } from 'react'
import * as Linking from 'expo-linking'
import { supabase } from '../utils/supabaseClient'
import { Alert } from 'react-native'

interface UseSupabaseDeepLinkOptions {
  onAuthSuccess?: () => void
}

/**
 * Hook to handle Supabase authentication deep links
 *
 * Usage:
 * ```tsx
 * import { useSupabaseDeepLink } from './hooks/useSupabaseDeepLink'
 *
 * function App() {
 *   useSupabaseDeepLink({
 *     onAuthSuccess: () => {
 *       // Navigate to main screen
 *       navigation.navigate('Chat')
 *     }
 *   })
 * }
 * ```
 */
export function useSupabaseDeepLink(options?: UseSupabaseDeepLinkOptions) {
  useEffect(() => {
    // Handle deep link when app is already open
    const subscription = Linking.addEventListener('url', handleDeepLink)

    // Handle deep link when app opens from closed state
    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink({ url })
      }
    })

    return () => subscription.remove()
  }, [])

  async function handleDeepLink({ url }: { url: string }) {
    try {
      const { hostname, path, queryParams } = Linking.parse(url)

      console.log('Deep link received:', { hostname, path, url })

      // kiongozi://auth/callback → hostname='auth', path='/callback'
      // Also handle kiongozi://auth-callback for backwards compatibility
      const isAuthCallback =
        (hostname === 'auth' && path === '/callback') ||
        hostname === 'auth-callback'

      if (isAuthCallback) {
        // Tokens can come from query params or hash fragments
        // Supabase may send them as ?access_token=...&refresh_token=...
        // or as #access_token=...&refresh_token=...
        let access_token = (queryParams as Record<string, string>)?.access_token
        let refresh_token = (queryParams as Record<string, string>)?.refresh_token

        // Also check for hash fragment tokens (Supabase implicit flow)
        if (!access_token && url.includes('#')) {
          const hashParams = new URLSearchParams(url.split('#')[1])
          access_token = hashParams.get('access_token') || ''
          refresh_token = hashParams.get('refresh_token') || ''
        }

        if (access_token && refresh_token) {
          console.log('Setting Supabase session from deep link...')

          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token
          })

          if (error) {
            console.error('Failed to set session:', error)
            Alert.alert(
              'Authentication Error',
              'Failed to complete sign in. Please try again.',
              [{ text: 'OK' }]
            )
            return
          }

          console.log('Session set successfully:', data.user?.email)

          if (options?.onAuthSuccess) {
            options.onAuthSuccess()
          } else {
            Alert.alert(
              'Success!',
              'You have been signed in successfully.',
              [{ text: 'OK' }]
            )
          }
        } else {
          // No tokens — might be an email verification confirmation
          // Try refreshing the session to pick up the verified status
          console.log('No tokens in deep link, attempting session refresh...')
          const { data, error } = await supabase.auth.refreshSession()
          if (!error && data.session) {
            console.log('Session refreshed after email verification')
            if (options?.onAuthSuccess) {
              options.onAuthSuccess()
            }
          } else {
            console.warn('No tokens found and session refresh failed')
          }
        }
      }
    } catch (error) {
      console.error('Deep link handling error:', error)
    }
  }
}
