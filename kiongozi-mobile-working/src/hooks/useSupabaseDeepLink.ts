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

      // Extract tokens from query params or hash fragment (Supabase uses both)
      function extractTokens() {
        let access_token = (queryParams as Record<string, string>)?.access_token
        let refresh_token = (queryParams as Record<string, string>)?.refresh_token
        if (!access_token && url.includes('#')) {
          const hashParams = new URLSearchParams(url.split('#')[1])
          access_token = hashParams.get('access_token') || ''
          refresh_token = hashParams.get('refresh_token') || ''
        }
        return { access_token, refresh_token }
      }

      // kiongozi://auth/callback — email verification / OAuth
      const isAuthCallback =
        (hostname === 'auth' && path === '/callback') ||
        hostname === 'auth-callback'

      // kiongozi://reset-password — password recovery email link
      const isPasswordReset = hostname === 'reset-password'

      if (isAuthCallback) {
        const { access_token, refresh_token } = extractTokens()

        if (access_token && refresh_token) {
          const { data, error } = await supabase.auth.setSession({ access_token, refresh_token })
          if (error) {
            Alert.alert('Authentication Error', 'Failed to complete sign in. Please try again.')
            return
          }
          if (options?.onAuthSuccess) {
            options.onAuthSuccess()
          }
        } else {
          // No tokens — email verification confirmation, try refreshing
          const { data, error } = await supabase.auth.refreshSession()
          if (!error && data.session && options?.onAuthSuccess) {
            options.onAuthSuccess()
          }
        }
      }

      if (isPasswordReset) {
        const { access_token, refresh_token } = extractTokens()
        if (access_token && refresh_token) {
          // Setting the session with a recovery token fires PASSWORD_RECOVERY via onAuthStateChange
          const { error } = await supabase.auth.setSession({ access_token, refresh_token })
          if (error) {
            Alert.alert('Link Expired', 'This password reset link has expired. Please request a new one.')
          }
          // App.tsx PASSWORD_RECOVERY listener will show ResetPasswordScreen automatically
        } else {
          Alert.alert('Invalid Link', 'This password reset link is invalid. Please request a new one.')
        }
      }
    } catch (error) {
      console.error('Deep link handling error:', error)
    }
  }
}
