import { RN_EASE_OUT } from '../theme/motion';
import { appAlert } from '../utils/alert';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Image, Animated, Platform, ScrollView, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { NATIVE_TABS } from './tabInset';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, NavigationContainerRef, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../stores/themeStore';

// Screens
import FeedScreen from '../screens/social/FeedScreen';
import ExploreScreen from '../screens/social/ExploreScreen';
import MitaaScreen from '../screens/social/MitaaScreen';
import NotificationsScreen from '../screens/social/NotificationsScreen';
import PostDetailScreen from '../screens/social/PostDetailScreen';
import PublicProfileScreen from '../screens/social/PublicProfileScreen';
import EditProfileScreen from '../screens/social/EditProfileScreen';
import BookmarksScreen from '../screens/social/BookmarksScreen';
import DMListScreen from '../screens/social/DMListScreen';
import DMConversationScreen from '../screens/social/DMConversationScreen';
import FollowListScreen from '../screens/social/FollowListScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileTabScreen from '../screens/social/ProfileTabScreen';
import SettingsScreen from '../screens/social/SettingsScreen';
import BlockedUsersScreen from '../screens/social/BlockedUsersScreen';
import MutedUsersScreen from '../screens/social/MutedUsersScreen';
import FindFriendsScreen from '../screens/social/FindFriendsScreen';
import InviteScreen from '../screens/social/InviteScreen';
import DevicesScreen from '../screens/social/DevicesScreen';
import FirstFeedScreen from '../screens/FirstFeedScreen';
import { FIRST_FEED_PENDING_KEY } from '../screens/LoginScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FollowRequestsScreen from '../screens/social/FollowRequestsScreen';
import StorageDataScreen from '../screens/social/StorageDataScreen';
import NotificationPrefsScreen from '../screens/social/NotificationPrefsScreen';
import { useNotificationStore } from '../stores/notificationStore';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../utils/supabaseClient';
import { useTheme } from '../hooks/useTheme';
import { useForceUpdate, openStore } from '../hooks/useForceUpdate';
import { StoryViewer } from '../components/stories/StoryViewer';
import { StoryComposer } from '../components/stories/StoryComposer';
import { MzingaHost } from '../components/mzinga/MzingaHive';
import { BarazaHost } from '../components/baraza/BarazaHost';
import { AvatarHost } from '../components/social/AvatarHost';
import { storyNav } from '../components/stories/storyAssets';
import { OrbVideo } from '../components/ai/OrbVideo';
import { useProfileStore } from '../stores/profileStore';
import { ConfettiHost } from '../components/Confetti';
import { onAppEvent } from '../utils/appEvents';
import { ScreenErrorBoundary } from '../components/ScreenError';

// Every screen gets its own crash card ("Try again" / "Go back") instead of taking the app down
const screenLayout = ({ children, route, navigation }: any) => (
  <ScreenErrorBoundary name={route.name} onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}>
    {children}
  </ScreenErrorBoundary>
);

// ─── Stack Navigators ────────────────────────────────────────────────────────

const FeedStack = createNativeStackNavigator();
function FeedStackNavigator() {
  return (
    <FeedStack.Navigator screenOptions={{ headerShown: false }} screenLayout={screenLayout}>
      <FeedStack.Screen name="FeedMain" component={FeedScreen} />
      <FeedStack.Screen name="PostDetail" component={PostDetailScreen} />
      <FeedStack.Screen name="Search" component={ExploreScreen} />
      <FeedStack.Screen name="FindFriends" component={FindFriendsScreen} />
      <FeedStack.Screen name="Invite" component={InviteScreen} />
      <FeedStack.Screen name="PublicProfile" component={PublicProfileScreen} />
      <FeedStack.Screen name="EditProfile" component={EditProfileScreen} />
      <FeedStack.Screen name="Bookmarks" component={BookmarksScreen} />
      <FeedStack.Screen name="DMList" component={DMListScreen} />
      <FeedStack.Screen name="DMConversation" component={DMConversationScreen} />
      <FeedStack.Screen name="FollowList" component={FollowListScreen} />
    </FeedStack.Navigator>
  );
}

// Mitaa keeps its own stack so opening a profile from a clip stays in the tab,
// and Back lands on the same clip
const MitaaStack = createNativeStackNavigator();
function MitaaStackNavigator() {
  return (
    <MitaaStack.Navigator screenOptions={{ headerShown: false }} screenLayout={screenLayout}>
      <MitaaStack.Screen name="MitaaMain" component={MitaaScreen} />
      <MitaaStack.Screen name="PublicProfile" component={PublicProfileScreen} />
      <MitaaStack.Screen name="PostDetail" component={PostDetailScreen} />
      <MitaaStack.Screen name="EditProfile" component={EditProfileScreen} />
      <MitaaStack.Screen name="DMConversation" component={DMConversationScreen} />
      <MitaaStack.Screen name="FollowList" component={FollowListScreen} />
    </MitaaStack.Navigator>
  );
}

const ExploreStack = createNativeStackNavigator();
function ExploreStackNavigator() {
  return (
    <ExploreStack.Navigator screenOptions={{ headerShown: false }} screenLayout={screenLayout}>
      <ExploreStack.Screen name="ExploreMain" component={ExploreScreen} />
      <ExploreStack.Screen name="PostDetail" component={PostDetailScreen} />
      <ExploreStack.Screen name="PublicProfile" component={PublicProfileScreen} />
      <ExploreStack.Screen name="EditProfile" component={EditProfileScreen} />
      <ExploreStack.Screen name="Bookmarks" component={BookmarksScreen} />
      <ExploreStack.Screen name="DMConversation" component={DMConversationScreen} />
      <ExploreStack.Screen name="FollowList" component={FollowListScreen} />
      <ExploreStack.Screen name="FindFriends" component={FindFriendsScreen} />
      <ExploreStack.Screen name="Invite" component={InviteScreen} />
    </ExploreStack.Navigator>
  );
}

const NotificationsStack = createNativeStackNavigator();
function NotificationsStackNavigator() {
  return (
    <NotificationsStack.Navigator screenOptions={{ headerShown: false }} screenLayout={screenLayout}>
      <NotificationsStack.Screen name="NotificationsMain" component={NotificationsScreen} />
      <NotificationsStack.Screen name="FollowRequests" component={FollowRequestsScreen} />
      <NotificationsStack.Screen name="PostDetail" component={PostDetailScreen} />
      <NotificationsStack.Screen name="PublicProfile" component={PublicProfileScreen} />
      <NotificationsStack.Screen name="DMList" component={DMListScreen} />
      <NotificationsStack.Screen name="DMConversation" component={DMConversationScreen} />
      <NotificationsStack.Screen name="FollowList" component={FollowListScreen} />
    </NotificationsStack.Navigator>
  );
}

const ProfileStack = createNativeStackNavigator();
function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }} screenLayout={screenLayout}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileTabScreen} />
      <ProfileStack.Screen name="PostDetail" component={PostDetailScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
      <ProfileStack.Screen name="StorageData" component={StorageDataScreen} />
      <ProfileStack.Screen name="NotificationPrefs" component={NotificationPrefsScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStack.Screen name="DMList" component={DMListScreen} />
      <ProfileStack.Screen name="DMConversation" component={DMConversationScreen} />
      <ProfileStack.Screen name="PublicProfile" component={PublicProfileScreen} />
      <ProfileStack.Screen name="Bookmarks" component={BookmarksScreen} />
      <ProfileStack.Screen name="FollowList" component={FollowListScreen} />
      <ProfileStack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
      <ProfileStack.Screen name="Devices" component={DevicesScreen} />
      <ProfileStack.Screen name="MutedUsers" component={MutedUsersScreen} />
      <ProfileStack.Screen name="FindFriends" component={FindFriendsScreen} />
      <ProfileStack.Screen name="Invite" component={InviteScreen} />
    </ProfileStack.Navigator>
  );
}

// ─── Tab Icon Components ─────────────────────────────────────────────────────

/** Tab icon: outline → filled with a small quick swell that settles. Slim, no pills, no glow. */
function TabIcon({ name, focused, color, children, size = 26 }: { name: string; focused: boolean; color: string; children?: React.ReactNode; size?: number }) {
  const v = React.useRef(new Animated.Value(focused ? 1 : 0)).current;
  React.useEffect(() => {
    Animated.timing(v, { toValue: focused ? 1 : 0, duration: 240, easing: RN_EASE_OUT, useNativeDriver: true }).start();
  }, [focused]);
  const pop = v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1.14, 1] });
  return (
    <View style={styles.tabIconBox}>
      <Animated.View style={{ transform: [{ scale: pop }] }}>
        <Ionicons name={(focused ? name : `${name}-outline`) as any} size={size} color={color} />
      </Animated.View>
      {children}
    </View>
  );
}

function NotificationTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const { unreadCount } = useNotificationStore();
  return (
    <TabIcon name="heart" focused={focused} color={color}>
      {unreadCount > 0 && <View style={styles.tabDot} />}
    </TabIcon>
  );
}

/** Profile tab = your own photo (ring when selected), like modern social apps. */
function ProfileTabIcon({ focused, color }: { focused: boolean; color: string }) {
  const T = useTheme();
  const me = useProfileStore(s => s.currentUserProfile);
  if (!me?.avatar_url) return <TabIcon name="person-circle" focused={focused} color={color} size={27} />;
  return (
    <View style={styles.tabIconBox}>
      <View style={{ width: 30, height: 30, borderRadius: 15, padding: 1.5, borderWidth: 1.5, borderColor: focused ? T.text : 'transparent' }}>
        <Image source={{ uri: me.avatar_url }} style={{ width: '100%', height: '100%', borderRadius: 13 }} />
      </View>
    </View>
  );
}

function AIChatTabIcon() {
  return (
    <View style={styles.tabIconBox}>
      <OrbVideo size={30} />
    </View>
  );
}

// ─── Bottom Tab Navigator ────────────────────────────────────────────────────

const Tab = createBottomTabNavigator();
// iPhone: Apple's own tab bar (Liquid Glass on iOS 26, shrinks while you scroll down)
const NativeTab = createNativeBottomTabNavigator();
const ROOT_SCREENS = new Set(['FeedMain', 'MitaaMain', 'ExploreMain', 'NotificationsMain', 'ProfileMain']);

/** Name of the screen actually showing (deepest focused route). */
function focusedLeaf(state: any): string | undefined {
  let st = state;
  let name: string | undefined;
  while (st?.routes) {
    // a partial state without index focuses its last route
    const r = st.routes[st.index ?? st.routes.length - 1];
    name = r?.name;
    st = r?.state;
  }
  return name;
}

/** Native tab bar only shows on a tab's root screen. */
function hidesTabBar(state: any): boolean {
  const leaf = focusedLeaf(state);
  // a tab that hasn't been opened yet has no nested state: its root is showing
  return !!leaf && !ROOT_SCREENS.has(leaf) && !['Feed', 'Mitaa', 'Explore', 'Notifications', 'Profile'].includes(leaf);
}

function EmptyScreen() {
  return <View />;
}

interface AppNavigatorProps {
  navRef?: React.MutableRefObject<any>;
}

export default function AppNavigator({ navRef: externalNavRef }: AppNavigatorProps = {}) {
  const [chatVisible, setChatVisible] = useState(false);
  const [tabBarHidden, setTabBarHidden] = useState(false);
  // "Who should be in your feed?" once, right after an account is created
  const [firstFeed, setFirstFeed] = useState(false);
  // Ads and links can open Kiongozi AI (kchat://ai)
  useEffect(() => onAppEvent('openAI', () => setChatVisible(true)), []);
  const forceUpdate = useForceUpdate();
  const internalNavRef = useRef<NavigationContainerRef<any>>(null);
  const navRef = externalNavRef ?? internalNavRef;
  const { addNotification, fetchNotifications, unreadCount } = useNotificationStore();
  const { user, sessionExpired } = useAuthStore();
  const insets = useSafeAreaInsets();
  const T = useTheme();
  const { isDark } = useThemeStore();
  const { height: winH } = useWindowDimensions();
  // iOS: the home indicator only needs ~22pt of its 34pt inset, so trim it for a slim bar.
  // Android (edge-to-edge, SDK 54): the inset IS the system nav bar (48dp 3-button / ~16-24dp gesture),
  // so never trim it or the icons end up under the nav buttons / gesture zone. 0 inset → small pad.
  const TAB_BOTTOM = Platform.OS === 'ios'
    ? (insets.bottom > 0 ? Math.max(insets.bottom - 12, 8) : 6)
    : Math.max(insets.bottom, 6);
  const TAB_BAR_HEIGHT = 48 + TAB_BOTTOM;

  // Prevents the white/light flash when navigating between screens in dark mode
  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      background: isDark ? '#000000' : '#FFFFFF',
      card: isDark ? '#000000' : '#FFFFFF',
      border: isDark ? '#1C1C1E' : '#E9E9EE',
      text: isDark ? '#FFFFFF' : '#111111',
      primary: '#5CB85C',
    },
  };

  useEffect(() => {
    if (sessionExpired) {
      appAlert('Session expired', 'Your session has expired. Please sign in again.');
    }
  }, [sessionExpired]);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    AsyncStorage.multiGet(['onboarded_v1', FIRST_FEED_PENDING_KEY]).then(rows => {
      if (!alive) return;
      const onboarded = rows[0]?.[1] === '1';
      const pending = rows[1]?.[1] === '1';
      // Sign-up sets the pending flag; an account made in the last 15 minutes (Google / Apple / email link) counts too
      const fresh = !!user.created_at && Date.now() - new Date(user.created_at).getTime() < 15 * 60 * 1000;
      if (!onboarded && (pending || fresh)) setFirstFeed(true);
      else if (pending) AsyncStorage.removeItem(FIRST_FEED_PENDING_KEY).catch(() => {});
    }).catch(() => {});
    return () => { alive = false; };
  }, [user?.id]);

  const finishFirstFeed = () => {
    setFirstFeed(false);
    AsyncStorage.multiSet([['onboarded_v1', '1'], [FIRST_FEED_PENDING_KEY, '0']]).catch(() => {});
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchNotifications(true);
    const channel = supabase
      .channel(`global-notifications-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'social_notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.new) addNotification(payload.new);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const linking = {
    prefixes: ['https://api.kiongozi.org', 'kiongozi://'],
    config: {
      screens: {
        Feed: {
          screens: {
            PostDetail: {
              path: 'posts/:postId',
            },
            PublicProfile: {
              path: 'u/:username',
            },
          },
        },
      },
    },
  };

  return (
    <View style={styles.root}>
      <NavigationContainer
        ref={navRef}
        theme={navTheme}
        linking={linking}
        onReady={() => {
          storyNav.current = navRef.current as any;
          // onStateChange skips the first state, so a cold-start link (posts/:id) needs this
          if (NATIVE_TABS) setTabBarHidden(hidesTabBar(navRef.current?.getRootState()));
        }}
        onStateChange={st => {
          if (NATIVE_TABS) setTabBarHidden(hidesTabBar(st));
        }}
      >
        {NATIVE_TABS ? (
          <NativeTab.Navigator
            tabBarHidden={tabBarHidden}
            minimizeBehavior="onScrollDown"
            // no hapticFeedbackEnabled: the tabPress listener below already ticks
            tabBarActiveTintColor={isDark ? '#FFFFFF' : '#111111'}
            screenListeners={{ tabPress: () => { Haptics.selectionAsync(); } }}
          >
            <NativeTab.Screen name="Feed" component={FeedStackNavigator} options={{ title: 'Home', tabBarIcon: ({ focused }) => ({ sfSymbol: focused ? 'house.fill' : 'house' }) }} />
            <NativeTab.Screen name="Mitaa" component={MitaaStackNavigator} options={{ title: 'Mitaa', tabBarIcon: ({ focused }) => ({ sfSymbol: focused ? 'play.rectangle.on.rectangle.fill' : 'play.rectangle.on.rectangle' }) }} />
            <NativeTab.Screen
              name="AIChat"
              component={EmptyScreen}
              options={{ title: 'Kiongozi', preventsDefault: true, tabBarIcon: () => ({ sfSymbol: 'sparkles' }) }}
              listeners={{ tabPress: () => setChatVisible(true) }}
            />
            <NativeTab.Screen
              name="Notifications"
              component={NotificationsStackNavigator}
              options={{ title: 'Activity', tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : undefined, tabBarIcon: ({ focused }) => ({ sfSymbol: focused ? 'heart.fill' : 'heart' }) }}
            />
            <NativeTab.Screen name="Profile" component={ProfileStackNavigator} options={{ title: 'Profile', tabBarIcon: ({ focused }) => ({ sfSymbol: focused ? 'person.crop.circle.fill' : 'person.crop.circle' }) }} />
            {/* Search & trending: opened from the Home header and hashtags, not a tab of its own */}
            <NativeTab.Screen name="Explore" component={ExploreStackNavigator} options={{ title: 'Explore', tabBarItemHidden: true, tabBarIcon: () => ({ sfSymbol: 'magnifyingglass' }) }} />
          </NativeTab.Navigator>
        ) : (
        <Tab.Navigator
          screenListeners={{ tabPress: () => { Haptics.selectionAsync(); } }}
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarShowLabel: false,
            tabBarStyle: {
              height: TAB_BAR_HEIGHT,
              paddingBottom: TAB_BOTTOM,
              paddingTop: 0,
              backgroundColor: T.tabBar,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: T.tabBarBorder,
              elevation: 0,
              shadowOpacity: 0,
            },
            tabBarActiveTintColor: T.tabIconActive,
            tabBarInactiveTintColor: T.tabIconInactive,
            tabBarIcon: ({ color, focused }) => {
              if (route.name === 'Feed') return <TabIcon name="home" focused={focused} color={color} />;
              if (route.name === 'Mitaa') return <TabIcon name="play-circle" focused={focused} color={color} size={27} />;
              if (route.name === 'Notifications') return <NotificationTabIcon color={color} focused={focused} />;
              if (route.name === 'Profile') return <ProfileTabIcon focused={focused} color={color} />;
              return null;
            },
          })}
        >
          <Tab.Screen name="Feed" component={FeedStackNavigator} />
          <Tab.Screen name="Mitaa" component={MitaaStackNavigator} />

          {/* Center AI tab — opens Kiongozi chat modal, no navigation */}
          <Tab.Screen
            name="AIChat"
            component={EmptyScreen}
            options={{
              tabBarButton: () => (
                <TouchableOpacity
                  style={styles.aiTabButton}
                  onPress={() => setChatVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Open Kiongozi AI"
                >
                  <AIChatTabIcon />
                </TouchableOpacity>
              ),
            }}
          />

          <Tab.Screen name="Notifications" component={NotificationsStackNavigator} />
          <Tab.Screen name="Profile" component={ProfileStackNavigator} />
          {/* Search & trending: opened from the Home header and hashtags, not a tab of its own */}
          <Tab.Screen name="Explore" component={ExploreStackNavigator} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        </Tab.Navigator>
        )}
      </NavigationContainer>

      {/* Stories: viewer and composer, opened from anywhere via the story store */}
      <StoryViewer />
      <StoryComposer />
      <MzingaHost />
      <BarazaHost />
      <AvatarHost />
      <ConfettiHost />

      {/* First run, step 2: county, topics and people to follow */}
      <Modal visible={firstFeed} animationType="fade" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={finishFirstFeed}>
        <FirstFeedScreen onDone={finishFirstFeed} />
      </Modal>

      {/* Kiongozi AI Chat Modal — fullscreen */}
      <Modal
        visible={chatVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => setChatVisible(false)}
      >
        <ChatScreen onClose={() => setChatVisible(false)} />
      </Modal>

      {/* Force update — non-dismissable */}
      <Modal visible={forceUpdate.required} transparent animationType="fade">
        <View style={[styles.updateOverlay, winH < 600 && { padding: 16 }]}>
          <View style={[styles.updateCard, { backgroundColor: T.bg, borderColor: T.border, maxHeight: winH * 0.85 }, winH < 600 && { padding: 20 }]}>
            <Text style={styles.updateEmoji}>🚀</Text>
            <Text style={[styles.updateTitle, { color: T.text }]}>Update Required</Text>
            <ScrollView style={{ flexGrow: 0, alignSelf: 'stretch' }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.updateMessage, { color: T.textSub }]}>{forceUpdate.message}</Text>
            </ScrollView>
            <TouchableOpacity
              style={[styles.updateBtn, { backgroundColor: T.accent }]}
              onPress={() => openStore(forceUpdate.storeUrl)}
            >
              <Text style={styles.updateBtnText}>Update Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  updateOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  updateCard: {
    width: '100%', borderRadius: 24, padding: 28,
    alignItems: 'center', borderWidth: 1, gap: 12,
  },
  updateEmoji: { fontSize: 44 },
  updateTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  updateMessage: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  updateBtn: {
    marginTop: 8, width: '100%', paddingVertical: 14,
    borderRadius: 22, alignItems: 'center',
  },
  updateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  aiTabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconBox: { width: 48, height: 40, alignItems: 'center', justifyContent: 'center' },
  tabDot: { position: 'absolute', top: 6, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3040' },
  tabBadge: {
    position: 'absolute',
    top: -2,
    right: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
});
