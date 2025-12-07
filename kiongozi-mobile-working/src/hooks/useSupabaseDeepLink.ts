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
      const { hostname, queryParams } = Linking.parse(url)

      console.log('Deep link received:', { hostname, url })

      if (hostname === 'auth-callback') {
        const { access_token, refresh_token } = queryParams as Record<string, string>

        if (access_token && refresh_token) {
          console.log('Setting Supabase session from deep link...')

          // Set Supabase session
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

          // Call success callback
          if (options?.onAuthSuccess) {
            options.onAuthSuccess()
          } else {
            // Show success message if no callback provided
            Alert.alert(
              'Success!',
              'You have been signed in successfully.',
              [{ text: 'OK' }]
            )
          }
        } else {
          console.warn('No tokens found in deep link')
        }
      }
    } catch (error) {
      console.error('Deep link handling error:', error)
    }
  }
}
