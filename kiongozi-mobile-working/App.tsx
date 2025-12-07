import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from './src/stores/authStore';
import LoginScreen from './src/screens/LoginScreen';
import ChatScreen from './src/screens/ChatScreen';
import { AnimatedSplashScreen } from './src/components/AnimatedSplashScreen';
import { useSupabaseDeepLink } from './src/hooks/useSupabaseDeepLink';

export default function App() {
  const { user, initialized, initialize } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

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

  // Hide splash screen after 3 seconds once app is ready
  useEffect(() => {
    if (isReady && initialized) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isReady, initialized]);

  // Handle deep links for Supabase authentication (email verification, OAuth)
  useSupabaseDeepLink({
    onAuthSuccess: () => {
      // Re-initialize to refresh user state
      initialize();
    }
  });

  // Show splash screen during initialization or for 3 seconds after ready
  if (showSplash) {
    return <AnimatedSplashScreen />;
  }

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
