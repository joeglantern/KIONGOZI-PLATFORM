import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { useAuthStore } from './src/stores/authStore';
import { useSocialStore } from './src/stores/socialStore';
import { useThemeStore } from './src/stores/themeStore';
import { supabase } from './src/utils/supabaseClient';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();
import { AnimatedSplashScreen } from './src/components/AnimatedSplashScreen';
import { useSupabaseDeepLink } from './src/hooks/useSupabaseDeepLink';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePrefs } from './src/stores/prefsStore';
import { watchInviteLinks, claimPendingInvite } from './src/utils/invites';
import {
  registerForPushNotifications,
  setupNotificationHandlers,
} from './src/utils/pushNotifications';

export default function App() {
  const { user, initialize, initialized } = useAuthStore();
  const { loadBlockedAndMuted } = useSocialStore();
  const initializeTheme = useThemeStore(s => s.initialize);
  const [isReady, setIsReady] = useState(false);
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const navRef = useRef<any>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const [, , onboardingDone] = await Promise.all([
          initialize(),
          initializeTheme(),
          AsyncStorage.getItem('onboarding_done'),
        ]);
        setShowOnboarding(!onboardingDone);
      } catch (error) {
        console.error('App initialization failed:', error);
      } finally {
        setIsReady(true);
      }
    };
    initializeApp();
  }, [initialize]);

  // Low-data mode + server feature switches; remember invite links (?ref=) that open the app
  useEffect(() => {
    usePrefs.getState().load().catch(() => {});
    return watchInviteLinks();
  }, []);

  // The animated splash plays over the app while it loads, then reveals it (it calls onFinish).

  // On auth: register push token + load block/mute lists
  useEffect(() => {
    if (user) {
      registerForPushNotifications().catch(err =>
        console.error('Push registration error:', err)
      );
      loadBlockedAndMuted().catch(() => {});
      claimPendingInvite();
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

  const appReady = isReady && initialized && fontsLoaded;
  const splash = showSplash ? <AnimatedSplashScreen ready={appReady} onFinish={() => setShowSplash(false)} /> : null;
  const withSplash = (node: React.ReactNode) => <View style={{ flex: 1, backgroundColor: '#000' }}>{node}{splash}</View>;

  if (!isReady || !initialized || !fontsLoaded) {
    return withSplash(
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#5CB85C" />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  if (showOnboarding) {
    return withSplash(
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <OnboardingScreen onDone={() => setShowOnboarding(false)} />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  return withSplash(
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemedStatusBar />
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

/** Status bar icons follow the theme (white on dark, black on light). */
function ThemedStatusBar() {
  const isDark = useThemeStore(s => s.isDark);
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}
