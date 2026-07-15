import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, NavigationContainerRef, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';
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
import { useNotificationStore } from '../stores/notificationStore';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../utils/supabaseClient';
import { useTheme } from '../hooks/useTheme';

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
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStack.Screen name="DMList" component={DMListScreen} />
      <ProfileStack.Screen name="DMConversation" component={DMConversationScreen} />
      <ProfileStack.Screen name="PublicProfile" component={PublicProfileScreen} />
      <ProfileStack.Screen name="Bookmarks" component={BookmarksScreen} />
      <ProfileStack.Screen name="FollowList" component={FollowListScreen} />
      <ProfileStack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
      <ProfileStack.Screen name="MutedUsers" component={MutedUsersScreen} />
    </ProfileStack.Navigator>
  );
}

// ─── Tab Icon Components ─────────────────────────────────────────────────────

// ── Design-exact tab icons (SVG paths copied from Kiongozi Redesign.dc.html) ──

function HomeIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

function ExploreIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M21 21l-4.3-4.3" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function BellIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M13.7 21a2 2 0 0 1-3.4 0"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

function PersonIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M4 21a8 8 0 0 1 16 0" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function NotificationTabIcon({ color }: { color: string }) {
  const { unreadCount } = useNotificationStore();
  return (
    <View style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
      <BellIcon color={color} />
      {unreadCount > 0 && (
        <View style={styles.tabBadge}>
          <Text style={styles.tabBadgeText}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
        </View>
      )}
    </View>
  );
}

function AIChatTabIcon() {
  const T = useTheme();
  return (
    <View
      style={[
        styles.aiTabIcon,
        {
          borderColor: T.accent,
          backgroundColor: T.bg,
          shadowColor: T.acc25,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 16,
          shadowOpacity: 1,
          elevation: 8,
        },
      ]}
    >
      <Image
        source={require('../../assets/kchat-logo.png')}
        style={styles.aiTabLogo}
        resizeMode="contain"
      />
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
  const internalNavRef = useRef<NavigationContainerRef<any>>(null);
  const navRef = externalNavRef ?? internalNavRef;
  const { addNotification, fetchNotifications } = useNotificationStore();
  const { user, sessionExpired } = useAuthStore();
  const insets = useSafeAreaInsets();
  const T = useTheme();
  const { isDark } = useThemeStore();
  const TAB_BAR_HEIGHT = 84 + insets.bottom;

  // Prevents the white/light flash when navigating between screens in dark mode
  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      background: isDark ? '#111111' : '#FFFFFF',
      card: isDark ? '#0C0C0C' : '#FFFFFF',
      border: isDark ? '#2C2C2E' : '#E9E9EE',
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

  return (
    <View style={styles.root}>
      <NavigationContainer ref={navRef} theme={navTheme}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarShowLabel: false,
            tabBarStyle: {
              height: TAB_BAR_HEIGHT,
              paddingBottom: insets.bottom,
              paddingTop: 8,
              backgroundColor: T.tabBar,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: T.tabBarBorder,
              elevation: 8,
              shadowColor: '#000',
              shadowOpacity: 0.06,
              shadowOffset: { width: 0, height: -2 },
              shadowRadius: 8,
            },
            tabBarActiveTintColor: T.tabIconActive,
            tabBarInactiveTintColor: T.tabIconInactive,
            tabBarIcon: ({ color }) => {
              if (route.name === 'Feed') return <HomeIcon color={color} />;
              if (route.name === 'Explore') return <ExploreIcon color={color} />;
              if (route.name === 'Notifications') return <NotificationTabIcon color={color} />;
              if (route.name === 'Profile') return <PersonIcon color={color} />;
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  aiTabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiTabIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
  },
  aiTabLogo: {
    width: 44,
    height: 44,
  },
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
