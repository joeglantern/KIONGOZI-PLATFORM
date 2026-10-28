import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert, Image, Animated, Platform, ScrollView, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, NavigationContainerRef, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../stores/themeStore';

// Screens
import FeedScreen from '../screens/social/FeedScreen';
import ExploreScreen from '../screens/social/ExploreScreen';
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
import { useNotificationStore } from '../stores/notificationStore';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../utils/supabaseClient';
import { useTheme } from '../hooks/useTheme';
import { useForceUpdate, openStore } from '../hooks/useForceUpdate';
import { StoryViewer } from '../components/stories/StoryViewer';
import { StoryComposer } from '../components/stories/StoryComposer';
import { storyNav } from '../components/stories/storyAssets';
import { OrbVideo } from '../components/ai/OrbVideo';
import { useProfileStore } from '../stores/profileStore';
import { ConfettiHost } from '../components/Confetti';

// ─── Stack Navigators ────────────────────────────────────────────────────────

const FeedStack = createNativeStackNavigator();
function FeedStackNavigator() {
  return (
    <FeedStack.Navigator screenOptions={{ headerShown: false }}>
      <FeedStack.Screen name="FeedMain" component={FeedScreen} />
      <FeedStack.Screen name="PostDetail" component={PostDetailScreen} />
      <FeedStack.Screen name="PublicProfile" component={PublicProfileScreen} />
      <FeedStack.Screen name="EditProfile" component={EditProfileScreen} />
      <FeedStack.Screen name="Bookmarks" component={BookmarksScreen} />
      <FeedStack.Screen name="DMList" component={DMListScreen} />
      <FeedStack.Screen name="DMConversation" component={DMConversationScreen} />
      <FeedStack.Screen name="FollowList" component={FollowListScreen} />
    </FeedStack.Navigator>
  );
}

const ExploreStack = createNativeStackNavigator();
function ExploreStackNavigator() {
  return (
    <ExploreStack.Navigator screenOptions={{ headerShown: false }}>
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
    <NotificationsStack.Navigator screenOptions={{ headerShown: false }}>
      <NotificationsStack.Screen name="NotificationsMain" component={NotificationsScreen} />
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
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileTabScreen} />
      <ProfileStack.Screen name="PostDetail" component={PostDetailScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStack.Screen name="DMList" component={DMListScreen} />
      <ProfileStack.Screen name="DMConversation" component={DMConversationScreen} />
      <ProfileStack.Screen name="PublicProfile" component={PublicProfileScreen} />
      <ProfileStack.Screen name="Bookmarks" component={BookmarksScreen} />
      <ProfileStack.Screen name="FollowList" component={FollowListScreen} />
      <ProfileStack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
      <ProfileStack.Screen name="MutedUsers" component={MutedUsersScreen} />
      <ProfileStack.Screen name="FindFriends" component={FindFriendsScreen} />
      <ProfileStack.Screen name="Invite" component={InviteScreen} />
    </ProfileStack.Navigator>
  );
}

// ─── Tab Icon Components ─────────────────────────────────────────────────────

/** Tab icon: outline → filled with a small springy pop. Slim, no pills, no glow. */
function TabIcon({ name, focused, color, children, size = 26 }: { name: string; focused: boolean; color: string; children?: React.ReactNode; size?: number }) {
  const v = React.useRef(new Animated.Value(focused ? 1 : 0)).current;
  React.useEffect(() => {
    Animated.spring(v, { toValue: focused ? 1 : 0, useNativeDriver: true, damping: 14, stiffness: 300 }).start();
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

function EmptyScreen() {
  return <View />;
}

interface AppNavigatorProps {
  navRef?: React.MutableRefObject<any>;
}

export default function AppNavigator({ navRef: externalNavRef }: AppNavigatorProps = {}) {
  const [chatVisible, setChatVisible] = useState(false);
  const forceUpdate = useForceUpdate();
  const internalNavRef = useRef<NavigationContainerRef<any>>(null);
  const navRef = externalNavRef ?? internalNavRef;
  const { addNotification, fetchNotifications } = useNotificationStore();
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
      Alert.alert('Session expired', 'Your session has expired. Please sign in again.');
    }
  }, [sessionExpired]);

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
      <NavigationContainer ref={navRef} theme={navTheme} linking={linking} onReady={() => { storyNav.current = navRef.current as any; }}>
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
              if (route.name === 'Explore') return <TabIcon name="search" focused={focused} color={color} size={25} />;
              if (route.name === 'Notifications') return <NotificationTabIcon color={color} focused={focused} />;
              if (route.name === 'Profile') return <ProfileTabIcon focused={focused} color={color} />;
              return null;
            },
          })}
        >
          <Tab.Screen name="Feed" component={FeedStackNavigator} />
          <Tab.Screen name="Explore" component={ExploreStackNavigator} />

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
        </Tab.Navigator>
      </NavigationContainer>

      {/* Stories: viewer and composer, opened from anywhere via the story store */}
      <StoryViewer />
      <StoryComposer />
      <ConfettiHost />

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
