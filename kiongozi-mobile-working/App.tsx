import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './src/stores/authStore';
import { useSocialStore } from './src/stores/socialStore';
import { AnimatedSplashScreen } from './src/components/AnimatedSplashScreen';
import { useSupabaseDeepLink } from './src/hooks/useSupabaseDeepLink';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import {
  registerForPushNotifications,
  setupNotificationHandlers,
} from './src/utils/pushNotifications';

export default function App() {
  const { user, initialize, initialized } = useAuthStore();
  const { loadBlockedAndMuted } = useSocialStore();
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const navRef = useRef<any>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await Promise.all([
          initialize(),
          AsyncStorage.getItem('onboarding_done').then(val => {
            setOnboardingDone(val === 'true');
          }),
        ]);
      } catch (error) {
        console.error('App initialization failed:', error);
        setOnboardingDone(false);
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

  // On auth: register push token + load block/mute lists
  useEffect(() => {
    if (user) {
      registerForPushNotifications().catch(err =>
        console.error('Push registration error:', err)
      );
      loadBlockedAndMuted().catch(() => {});
    }
  }, [user]);

  // Set up notification tap handlers once nav is ready
  useEffect(() => {
    if (navRef.current) {
      const cleanup = setupNotificationHandlers(navRef.current);
      return cleanup;
    }
  }, []);

  // Handle deep links for Supabase auth (email verification, OAuth)
  useSupabaseDeepLink({
    onAuthSuccess: () => initialize(),
  });

  if (showSplash) {
    return <AnimatedSplashScreen />;
  }

  if (!isReady || !initialized || onboardingDone === null) {
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
        <AppNavigator navRef={navRef} />
      ) : onboardingDone ? (
        // Onboarding already seen: go straight to login
        <LoginScreen onLoginSuccess={() => {}} />
      ) : (
        // First launch: show onboarding, then login
        <OnboardingScreen onDone={() => setOnboardingDone(true)} />
      )}
    </GestureHandlerRootView>
  );
}
