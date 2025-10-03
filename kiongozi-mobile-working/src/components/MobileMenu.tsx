import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  RefreshControl,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../utils/supabaseClient';

// Utility function for relative time formatting
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays}d ago`;

  // For older dates, show the actual date
  return date.toLocaleDateString();
};

interface Conversation {
  id: string;
  title?: string;
  updated_at: string;
  created_at: string;
  user_id: string;
}

interface MobileMenuProps {
  visible: boolean;
  onClose: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onSignOut: () => void;
  conversations?: Conversation[];
  loadingConversations?: boolean;
  refreshingConversations?: boolean;
  onSelectConversation?: (conversationId: string) => void;
  onNewChat?: () => void;
  onRefreshConversations?: () => void;
  onOpenProfile?: () => void;
  onDeleteConversation?: (conversationId: string) => void;
  onShareConversation?: () => void;
  onShowTutorial?: () => void;
  currentConversationId?: string;
}

// Swipeable Conversation Item Component
function SwipeableConversationItem({
  conversation,
  darkMode,
  onSelect,
  onDelete,
  isActive,
}: {
  conversation: Conversation;
  darkMode: boolean;
  onSelect: () => void;
  onDelete: () => void;
  isActive?: boolean;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;

      if (translationX < -100) {
        // Swipe left to delete
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
          'Delete Conversation',
          'Are you sure you want to delete this conversation? This action cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => {
              Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: true,
              }).start();
            }},
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => {
                // Animate out
                Animated.parallel([
                  Animated.timing(translateX, {
                    toValue: -400,
                    duration: 300,
                    useNativeDriver: true,
                  }),
                  Animated.timing(opacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                  }),
                ]).start(() => {
                  onDelete();
                });
              }
            }
          ]
        );
      } else {
        // Snap back
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  return (
    <Animated.View style={{ opacity }}>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View style={{ transform: [{ translateX }] }}>
          <TouchableOpacity
            style={[
              styles.conversationItem,
              darkMode && styles.conversationItemDark,
              isActive && styles.conversationItemActive,
              isActive && darkMode && styles.conversationItemActiveDark,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect();
            }}
          >
            <Text style={[styles.conversationTitle, darkMode && styles.conversationTitleDark]}>
              {conversation.title || 'Untitled Chat'}
            </Text>
            <Text style={[styles.conversationDate, darkMode && styles.conversationDateDark]}>
              {formatRelativeTime(conversation.updated_at)}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    </Animated.View>
  );
}

export default function MobileMenu({
  visible,
  onClose,
  darkMode,
  onToggleDarkMode,
  onSignOut,
  conversations = [],
  loadingConversations = false,
  refreshingConversations = false,
  onSelectConversation,
  onNewChat,
  onRefreshConversations,
  onOpenProfile,
  onDeleteConversation,
  onShareConversation,
  onShowTutorial,
  currentConversationId,
}: MobileMenuProps) {
  const { user } = useAuthStore();
  const [userProfile, setUserProfile] = useState<{ full_name?: string } | null>(null);
  const scrollIndicatorOpacity = useRef(new Animated.Value(1)).current;

  // Load user profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setUserProfile(data);
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };

    loadUserProfile();
  }, [user]);

  // Animate scroll indicator
  useEffect(() => {
    if (conversations.length > 2) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scrollIndicatorOpacity, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scrollIndicatorOpacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [conversations.length]);

  const menuItems = [
    {
      icon: '📤',
      title: 'Share Chat',
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (onShareConversation) {
          onShareConversation();
        }
        onClose();
      },
    },
    {
      icon: '👤',
      title: 'Profile',
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (onOpenProfile) {
          onOpenProfile();
        }
        onClose();
      },
    },
    {
      icon: '🎓',
      title: 'Show Tutorial',
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (onShowTutorial) {
          onShowTutorial();
        }
        onClose();
      },
    },
    {
      icon: darkMode ? '☀️' : '🌙',
      title: darkMode ? 'Light Mode' : 'Dark Mode',
      onPress: () => {
        onToggleDarkMode();
      },
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, darkMode && styles.containerDark]}>
        {/* Header */}
        <View style={[styles.header, darkMode && styles.headerDark]}>
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <View style={styles.aiIcon} />
              <View>
                <Text style={[styles.headerTitle, darkMode && styles.headerTitleDark]}>
                  Kiongozi<Text style={styles.platformText}>Platform</Text>
                </Text>
                <Text style={[styles.headerSubtitle, darkMode && styles.headerSubtitleDark]}>
                  Green & Digital Transition AI
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, darkMode && styles.closeButtonTextDark]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* User Info */}
        <TouchableOpacity
          style={[styles.userSection, darkMode && styles.userSectionDark]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (onOpenProfile) {
              onOpenProfile();
              onClose();
            }
          }}
          activeOpacity={0.7}
        >
          <View style={styles.userAvatarContainer}>
            <View style={[styles.userAvatar, darkMode && styles.userAvatarDark]}>
              <Text style={styles.userAvatarText}>
                {userProfile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.onlineIndicator} />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, darkMode && styles.userNameDark]}>
              {userProfile?.full_name || 'User'}
            </Text>
            <Text style={[styles.userEmail, darkMode && styles.userEmailDark]}>
              {user?.email || ''}
            </Text>
          </View>
          <Text style={[styles.profileArrow, darkMode && styles.profileArrowDark]}>›</Text>
        </TouchableOpacity>

        {/* Quick Actions & Recent Chats */}
        <View style={[styles.quickSection, darkMode && styles.quickSectionDark]}>
          {/* New Chat Button */}
          {onNewChat && (
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onNewChat();
                onClose();
              }}
              style={[styles.quickAction, styles.newChatQuickAction, darkMode && styles.newChatQuickActionDark]}
            >
              <Text style={styles.quickActionIcon}>💬</Text>
              <Text style={[styles.quickActionText, styles.newChatText]}>New Chat</Text>
            </TouchableOpacity>
          )}

          {/* Recent Conversations - Compact Display */}
          {conversations.length > 0 && (
            <View style={styles.recentChatsCompact}>
              <View style={styles.recentChatsHeader}>
                <Text style={[styles.recentChatsTitle, darkMode && styles.recentChatsTitleDark]}>
                  Recent
                </Text>
                {conversations.length > 2 && (
                  <Animated.View style={{ opacity: scrollIndicatorOpacity }}>
                    <Text style={[styles.scrollHint, darkMode && styles.scrollHintDark]}>
                      Swipe →
                    </Text>
                  </Animated.View>
                )}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.recentChatsScroll}
                contentContainerStyle={styles.recentChatsContent}
                decelerationRate="fast"
                snapToInterval={164}
                snapToAlignment="start"
              >
                {conversations.slice(0, 5).map((conversation) => (
                  <TouchableOpacity
                    key={conversation.id}
                    style={[
                      styles.recentChatCard,
                      darkMode && styles.recentChatCardDark,
                      conversation.id === currentConversationId && styles.recentChatCardActive,
                      conversation.id === currentConversationId && darkMode && styles.recentChatCardActiveDark,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (onSelectConversation) {
                        onSelectConversation(conversation.id);
                        onClose();
                      }
                    }}
                  >
                    <Text style={[styles.recentChatTitle, darkMode && styles.recentChatTitleDark]} numberOfLines={1}>
                      {conversation.title || 'New Chat'}
                    </Text>
                    <Text style={[styles.recentChatTime, darkMode && styles.recentChatTimeDark]}>
                      {formatRelativeTime(conversation.updated_at)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Menu Items */}
        <ScrollView style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, darkMode && styles.menuItemDark]}
              onPress={item.onPress}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={[styles.menuTitle, darkMode && styles.menuTitleDark]}>
                {item.title}
              </Text>
              <Text style={[styles.menuArrow, darkMode && styles.menuArrowDark]}>
                ›
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, darkMode && styles.footerDark]}>
          <TouchableOpacity
            style={[styles.signOutButton, darkMode && styles.signOutButtonDark]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onSignOut();
            }}
          >
            <Text style={styles.signOutIcon}>↗</Text>
            <Text style={[styles.signOutButtonText, darkMode && styles.signOutButtonTextDark]}>
              Sign Out
            </Text>
          </TouchableOpacity>

          <Text style={[styles.footerVersion, darkMode && styles.footerVersionDark]}>
            Kiongozi Platform v1.0.0
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerDark: {
    backgroundColor: '#1f2937',
    borderBottomColor: '#374151',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiIconText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerTitleDark: {
    color: '#f9fafb',
  },
  platformText: {
    color: '#3b82f6',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  headerSubtitleDark: {
    color: '#9ca3af',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6b7280',
  },
  closeButtonTextDark: {
    color: '#9ca3af',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  userSectionDark: {
    backgroundColor: '#1f2937',
    borderBottomColor: '#374151',
  },
  userAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  userAvatarDark: {
    shadowOpacity: 0.5,
  },
  userAvatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  userNameDark: {
    color: '#f9fafb',
  },
  userEmail: {
    fontSize: 13,
    color: '#6b7280',
  },
  userEmailDark: {
    color: '#9ca3af',
  },
  profileArrow: {
    fontSize: 24,
    color: '#d1d5db',
    marginLeft: 8,
  },
  profileArrowDark: {
    color: '#4b5563',
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  menuItemDark: {
    backgroundColor: '#1f2937',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
  },
  menuTitleDark: {
    color: '#f9fafb',
  },
  menuArrow: {
    fontSize: 20,
    color: '#9ca3af',
  },
  menuArrowDark: {
    color: '#6b7280',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    alignItems: 'center',
  },
  footerDark: {
    borderTopColor: '#374151',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  signOutButtonDark: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  signOutIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#6b7280',
    transform: [{ rotate: '45deg' }],
  },
  signOutButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  signOutButtonTextDark: {
    color: '#d1d5db',
  },
  footerVersion: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '400',
  },
  footerVersionDark: {
    color: '#6b7280',
  },
  quickSection: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  quickSectionDark: {
    backgroundColor: '#1f2937',
    borderBottomColor: '#374151',
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  newChatQuickAction: {
    backgroundColor: '#3b82f6',
  },
  newChatQuickActionDark: {
    backgroundColor: '#1d4ed8',
  },
  quickActionIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  newChatText: {
    color: '#ffffff',
  },
  recentChatsCompact: {
    marginTop: 8,
  },
  recentChatsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentChatsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  recentChatsTitleDark: {
    color: '#9ca3af',
  },
  scrollHint: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3b82f6',
  },
  scrollHintDark: {
    color: '#60a5fa',
  },
  recentChatsScroll: {
    flexGrow: 0,
  },
  recentChatsContent: {
    paddingRight: 20,
  },
  recentChatCard: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 140,
    maxWidth: 160,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  recentChatCardDark: {
    backgroundColor: '#374151',
  },
  recentChatCardActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  recentChatCardActiveDark: {
    backgroundColor: '#1e3a8a',
    borderColor: '#60a5fa',
  },
  recentChatTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  recentChatTitleDark: {
    color: '#f9fafb',
  },
  recentChatTime: {
    fontSize: 11,
    color: '#6b7280',
  },
  recentChatTimeDark: {
    color: '#9ca3af',
  },
});