import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from './src/stores/authStore';
import { AnimatedSplashScreen } from './src/components/AnimatedSplashScreen';
import { useSupabaseDeepLink } from './src/hooks/useSupabaseDeepLink';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';

export default function App() {
  const { user, initialize, initialized } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initialize();
      } catch (error) {
        console.error('App initialization failed:', error);
      } finally {
        setIsReady(true);
      }
    };
    initializeApp();
  }, [initialize]);

  // Hide splash screen 3 seconds after init completes
  useEffect(() => {
    if (isReady && initialized) {
      const timer = setTimeout(() => setShowSplash(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isReady, initialized]);

  // Handle deep links for Supabase auth (email verification, OAuth)
  useSupabaseDeepLink({
    onAuthSuccess: () => initialize(),
  });

  if (showSplash) {
    return <AnimatedSplashScreen />;
  }

  if (!isReady || !initialized) {
    return (
      <GestureHandlerRootView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1a365d" />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      {user ? (
        // Authenticated: full social platform navigator
        <AppNavigator />
      ) : (
        // Unauthenticated: login screen (same as original app)
        <LoginScreen onLoginSuccess={() => {}} />
      )}
    </GestureHandlerRootView>
  );
}
