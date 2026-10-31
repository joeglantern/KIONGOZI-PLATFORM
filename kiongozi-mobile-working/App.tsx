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
import { bootCrashReports, setCrashUser } from './src/utils/crash';

// Crash reports start before anything renders (uses the key saved from the last launch)
bootCrashReports();

WebBrowser.maybeCompleteAuthSession();
import { AnimatedSplashScreen } from './src/components/AnimatedSplashScreen';
import { useSupabaseDeepLink } from './src/hooks/useSupabaseDeepLink';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import OnboardingScreen, { OnboardingChoice } from './src/screens/OnboardingScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePrefs } from './src/stores/prefsStore';
import { watchInviteLinks, claimPendingInvite } from './src/utils/invites';
import { watchIncomingLinks } from './src/utils/links';
import * as Notifications from 'expo-notifications';
import { OfflineBanner } from './src/components/OfflineBanner';
import { ScreenErrorBoundary } from './src/components/ScreenError';
import { loadOutbox } from './src/utils/outbox';
import { FeedbackHost } from './src/components/FeedbackHost';
import { usePresence } from './src/stores/presenceStore';
import { useProfileStore } from './src/stores/profileStore';
import { useNotificationStore } from './src/stores/notificationStore';
import { useDMStore } from './src/stores/dmStore';
import { useStoryStore } from './src/stores/storyStore';
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
  // Which door the welcome screen was left through (sign up or sign in)
  const [authMode, setAuthMode] = useState<OnboardingChoice>('signin');
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

  // Low-data mode + server feature switches; remember invite links (?ref=) that open the app;
  // shared links (posts, profiles, stories, barazas) open where they point, after sign-in if signed out
  useEffect(() => {
    usePrefs.getState().load().catch(() => {});
    const stopInvites = watchInviteLinks();
    const stopLinks = watchIncomingLinks();
    return () => { stopInvites(); stopLinks(); };
  }, []);

  // The animated splash plays over the app while it loads, then reveals it (it calls onFinish).

  // On auth: register push token + load block/mute lists
  useEffect(() => {
    setCrashUser(user?.id ?? null);
    if (user) {
      registerForPushNotifications().catch(err =>
        console.error('Push registration error:', err)
      );
      loadBlockedAndMuted().catch(() => {});
      claimPendingInvite();
      // Offline-first: every main screen opens with what it showed last time
      useProfileStore.getState().hydrate().catch(() => {});
      useNotificationStore.getState().hydrate().catch(() => {});
      useDMStore.getState().loadPersistedDMState().catch(() => {});
      useStoryStore.getState().hydrate().catch(() => {});
      usePresence.getState().start(user.id);
      // Send whatever was done offline last time (messages, likes, follows)
      loadOutbox().catch(() => {});
    }
  }, [user]);

  // App icon badge = unread notifications + chats with unread messages (cleared as you read)
  useEffect(() => {
    if (!user) { Notifications.setBadgeCountAsync(0).catch(() => {}); return; }
    let t: ReturnType<typeof setTimeout> | null = null;
    let last = -1;
    const sync = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        const notes = useNotificationStore.getState().notifications.filter(n => !n.read && n.type !== 'dm').length;
        const chats = useDMStore.getState().conversations.filter(c => c.unread_count > 0).length;
        const n = notes + chats;
        if (n !== last) { last = n; Notifications.setBadgeCountAsync(n).catch(() => {}); }
      }, 400);
    };
    sync();
    const a = useNotificationStore.subscribe(sync);
    const b = useDMStore.subscribe(sync);
    return () => { a(); b(); if (t) clearTimeout(t); };
  }, [user]);

  // Foreground banners + notification taps. Taps wait for the navigator (it isn't mounted yet on a
  // cold start or while signed out); this used to need navRef.current here, which was always null.
  useEffect(() => setupNotificationHandlers(), []);

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
          <OnboardingScreen onDone={choice => { setAuthMode(choice); setShowOnboarding(false); }} />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  return withSplash(
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemedStatusBar />
        <ScreenErrorBoundary name={user ? 'app' : 'login'}>
          {user ? (
            <AppNavigator navRef={navRef} />
          ) : (
            <LoginScreen onLoginSuccess={() => {}} initialMode={authMode} onBack={() => setShowOnboarding(true)} />
          )}
        </ScreenErrorBoundary>
        <ResetPasswordScreen
          visible={showResetPassword}
          onDismiss={() => setShowResetPassword(false)}
        />
        <OfflineBanner />
        <FeedbackHost />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

/** Status bar icons follow the theme (white on dark, black on light). */
function ThemedStatusBar() {
  const isDark = useThemeStore(s => s.isDark);
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}
