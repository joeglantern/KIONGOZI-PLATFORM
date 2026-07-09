import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from './src/stores/authStore';
import { useSocialStore } from './src/stores/socialStore';
import { supabase } from './src/utils/supabaseClient';
import { AnimatedSplashScreen } from './src/components/AnimatedSplashScreen';
import { useSupabaseDeepLink } from './src/hooks/useSupabaseDeepLink';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  registerForPushNotifications,
  setupNotificationHandlers,
} from './src/utils/pushNotifications';

export default function App() {
  const { user, initialize, initialized } = useAuthStore();
  const { loadBlockedAndMuted } = useSocialStore();
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const navRef = useRef<any>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const [, onboardingDone] = await Promise.all([
          initialize(),
          AsyncStorage.getItem('onboarding_done'),
        ]);
        await AsyncStorage.removeItem('onboarding_done'); // DEV: force onboarding
        setShowOnboarding(true);
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

  // Listen for PASSWORD_RECOVERY event from deep link
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowResetPassword(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Handle deep links for Supabase auth (email verification, OAuth)
  useSupabaseDeepLink({
    onAuthSuccess: () => initialize(),
  });

  if (showSplash) {
    return (
      <SafeAreaProvider>
        <AnimatedSplashScreen />
      </SafeAreaProvider>
    );
  }

  if (!isReady || !initialized) {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1a365d" />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  if (showOnboarding) {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <OnboardingScreen onDone={() => setShowOnboarding(false)} />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="auto" />
        {user ? (
          <AppNavigator navRef={navRef} />
        ) : (
          <LoginScreen onLoginSuccess={() => {}} />
        )}
        <ResetPasswordScreen
          visible={showResetPassword}
          onDismiss={() => setShowResetPassword(false)}
        />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
