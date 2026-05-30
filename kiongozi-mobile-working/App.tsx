import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from './src/stores/authStore';
import { useSocialStore } from './src/stores/socialStore';
import { supabase } from './src/utils/supabaseClient';
import { AnimatedSplashScreen } from './src/components/AnimatedSplashScreen';
import { useSupabaseDeepLink } from './src/hooks/useSupabaseDeepLink';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import {
  registerForPushNotifications,
  setupNotificationHandlers,
} from './src/utils/pushNotifications';

export default function App() {
  const { user, initialize, initialized } = useAuthStore();
  const { loadBlockedAndMuted } = useSocialStore();
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const navRef = useRef<any>(null);

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
        <AppNavigator navRef={navRef} />
      ) : (
        <LoginScreen onLoginSuccess={() => {}} />
      )}
      <ResetPasswordScreen
        visible={showResetPassword}
        onDismiss={() => setShowResetPassword(false)}
      />
    </GestureHandlerRootView>
  );
}
