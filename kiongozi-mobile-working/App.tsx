import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator, Linking } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from './src/stores/authStore';
import LoginScreen from './src/screens/LoginScreen';
import ChatScreen from './src/screens/ChatScreen';
import { supabase } from './src/utils/supabaseClient';

export default function App() {
  const { user, initialized, initialize } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initialize();
        setIsReady(true);
      } catch (error) {
        console.error('App initialization failed:', error);
        setIsReady(true); // Still render the app even if init fails
      }
    };
    initializeApp();
  }, [initialize]);

  // Handle deep links for OAuth callback
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      console.log('Deep link received:', url);

      // Extract the query params from the URL
      if (url.includes('#access_token=')) {
        // Supabase auth callback
        const params = new URLSearchParams(url.split('#')[1]);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          // Set the session
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }
      }
    };

    // Listen for incoming deep links
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (!isReady || !initialized) {
    return (
      <GestureHandlerRootView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a365d" />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="auto" />
      {user ? (
        <ChatScreen />
      ) : (
        <LoginScreen onLoginSuccess={() => {}} />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
  },
});
