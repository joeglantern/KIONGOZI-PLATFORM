import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, NavigationContainerRef, NavigationState } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Screens
import FeedScreen from '../screens/social/FeedScreen';
import ExploreScreen from '../screens/social/ExploreScreen';
import CreatePostScreen from '../screens/social/CreatePostScreen';
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
import { KiongoziChatFAB } from '../components/social/KiongoziChatFAB';
import { useNotificationStore } from '../stores/notificationStore';
import { useAuthStore } from '../stores/authStore';

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
    </ProfileStack.Navigator>
  );
}

// ─── Bottom Tab Navigator ────────────────────────────────────────────────────

const Tab = createBottomTabNavigator();

const ACTIVE_COLOR = '#1a365d';
const INACTIVE_COLOR = '#a0aec0';

// Placeholder screen used for the Create tab (never actually rendered)
function EmptyScreen() {
  return <View />;
}

// Recursively find the deepest active route name in the nav state
function getActiveRouteName(state: NavigationState | undefined): string {
  if (!state) return '';
  const route = state.routes[state.index];
  if (route.state) return getActiveRouteName(route.state as NavigationState);
  return route.name;
}

// Screens where the FAB should be hidden
const FAB_HIDDEN_SCREENS = new Set(['DMConversation', 'DMList']);

interface AppNavigatorProps {
  navRef?: React.MutableRefObject<any>;
}

export default function AppNavigator({ navRef: externalNavRef }: AppNavigatorProps = {}) {
  const [chatVisible, setChatVisible] = useState(false);
  const [createPostVisible, setCreatePostVisible] = useState(false);
  const [activeRoute, setActiveRoute] = useState('');
  const internalNavRef = useRef<NavigationContainerRef<any>>(null);
  const navRef = externalNavRef ?? internalNavRef;
  const { unreadCount } = useNotificationStore();
  const { sessionExpired } = useAuthStore();

  useEffect(() => {
    if (sessionExpired) {
      Alert.alert('Session expired', 'Your session has expired. Please sign in again.');
    }
  }, [sessionExpired]);

  const handleStateChange = useCallback((state: NavigationState | undefined) => {
    setActiveRoute(getActiveRouteName(state));
  }, []);

  const showFAB = !FAB_HIDDEN_SCREENS.has(activeRoute);

  return (
    // Outer View so FAB and Modals can sit ABOVE the NavigationContainer
    <View style={styles.root}>
      <NavigationContainer
        ref={navRef}
        onStateChange={handleStateChange}
      >
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarShowLabel: false,
            tabBarStyle: styles.tabBar,
            tabBarActiveTintColor: ACTIVE_COLOR,
            tabBarInactiveTintColor: INACTIVE_COLOR,
            tabBarIcon: ({ focused, color, size }) => {
              let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';
              if (route.name === 'Feed') iconName = focused ? 'home' : 'home-outline';
              else if (route.name === 'Explore') iconName = focused ? 'search' : 'search-outline';
              else if (route.name === 'Notifications') iconName = focused ? 'notifications' : 'notifications-outline';
              else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
              return <Ionicons name={iconName} size={size} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Feed" component={FeedStackNavigator} />
          <Tab.Screen name="Explore" component={ExploreStackNavigator} />
          <Tab.Screen
            name="CreatePost"
            component={EmptyScreen}
            options={{
              tabBarIcon: () => (
                <View style={styles.createButton}>
                  <Ionicons name="add" size={28} color="#fff" />
                </View>
              ),
              tabBarButton: (props) => (
                <TouchableOpacity
                  style={[styles.createTabButton, (props as any).style]}
                  onPress={() => setCreatePostVisible(true)}
                  accessibilityRole="button"
                >
                  <View style={styles.createButton}>
                    <Ionicons name="add" size={28} color="#fff" />
                  </View>
                </TouchableOpacity>
              ),
            }}
          />
          <Tab.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{
              tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
            }}
          />
          <Tab.Screen name="Profile" component={ProfileStackNavigator} />
        </Tab.Navigator>
      </NavigationContainer>

      {/* FAB hidden on DM screens so it doesn't cover the send button */}
      {showFAB && <KiongoziChatFAB onPress={() => setChatVisible(true)} />}

      {/* Create Post Modal */}
      <Modal
        visible={createPostVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCreatePostVisible(false)}
      >
        <CreatePostScreen onClose={() => setCreatePostVisible(false)} />
      </Modal>

      {/* @kiongozi Chat Modal */}
      <Modal
        visible={chatVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setChatVisible(false)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modalHandle} />
          <ChatScreen />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: '#fff',
    borderTopColor: '#e2e8f0',
    height: 60,
    paddingBottom: 8,
  },
  createButton: {
    backgroundColor: '#1a365d',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createTabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalWrap: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e0',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
});
