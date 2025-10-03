import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../stores/authStore';
import { useUserStats } from '../hooks/useUserStats';
import { useChatStore } from '../stores/chatStore';
import ExportModal from '../components/ExportModal';
import ModernSwitch from '../components/ModernSwitch';
import { supabase } from '../utils/supabaseClient';
import apiClient from '../utils/apiClient';

interface ProfileScreenProps {
  visible: boolean;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onClose: () => void;
  onSignOut: () => void;
}

export default function ProfileScreen({
  visible,
  darkMode,
  onToggleDarkMode,
  onClose,
  onSignOut,
}: ProfileScreenProps) {
  const { user } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const { stats, loading: statsLoading, error: statsError, refreshStats } = useUserStats();
  const { conversations, currentConversation } = useChatStore();
  const [userProfile, setUserProfile] = useState<{ first_name?: string; last_name?: string; full_name?: string } | null>(null);

  // Fetch user profile from database
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, full_name')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setUserProfile(data);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };

    if (visible) {
      fetchUserProfile();
    }
  }, [visible, user?.id]);

  const handleSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: onSignOut
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your conversations and data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiClient.deleteAccount();

              if (response.success) {
                Alert.alert(
                  'Account Deleted',
                  'Your account has been permanently deleted.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        onSignOut(); // Sign out and redirect to login
                      }
                    }
                  ]
                );
              } else {
                Alert.alert('Error', response.error || 'Failed to delete account. Please try again.');
              }
            } catch (error: any) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          }
        }
      ]
    );
  };

  const settingsItems = [
    {
      icon: darkMode ? '☀️' : '🌙',
      title: 'Dark Mode',
      subtitle: 'Toggle between light and dark theme',
      type: 'switch' as const,
      value: darkMode,
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggleDarkMode();
      },
    },
    {
      icon: '🔔',
      title: 'Notifications',
      subtitle: 'Receive updates and reminders',
      type: 'switch' as const,
      value: notificationsEnabled,
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setNotificationsEnabled(!notificationsEnabled);
      },
    },
    {
      icon: '📤',
      title: 'Export Conversations',
      subtitle: 'Download your chat history',
      type: 'navigation' as const,
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExportModalVisible(true);
      },
    },
    {
      icon: '🔒',
      title: 'Privacy & Security',
      subtitle: 'Manage your data and privacy settings',
      type: 'navigation' as const,
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert('Coming Soon', 'Privacy settings will be available in a future update.');
      },
    },
    {
      icon: '❓',
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      type: 'navigation' as const,
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert('Coming Soon', 'Help & support will be available in a future update.');
      },
    },
  ];

  const getJoinDate = () => {
    if (stats?.join_date) {
      return new Date(stats.join_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    // Fallback to current date while loading
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, darkMode && styles.containerDark]}>
        {/* Header */}
        <View style={[styles.header, darkMode && styles.headerDark]}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            style={[styles.backButton, darkMode && styles.backButtonDark]}
          >
            <Text style={[styles.backButtonText, darkMode && styles.backButtonTextDark]}>
              ←
            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, darkMode && styles.headerTitleDark]}>
            Profile
          </Text>
          <View style={styles.placeholder} />
        </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={statsLoading}
            onRefresh={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              refreshStats();
            }}
            tintColor={darkMode ? '#3b82f6' : '#3b82f6'}
            colors={['#3b82f6']}
            title="Pull to refresh stats"
            titleColor={darkMode ? '#9ca3af' : '#6b7280'}
          />
        }
      >
        {/* User Info Section */}
        <View style={[styles.userSection, darkMode && styles.userSectionDark]}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userProfile?.first_name?.charAt(0).toUpperCase() ||
                 userProfile?.full_name?.charAt(0).toUpperCase() ||
                 user?.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={[styles.statusBadge, darkMode && styles.statusBadgeDark]}>
              <Text style={styles.statusBadgeText}>•</Text>
            </View>
          </View>

          <View style={styles.userInfo}>
            <Text style={[styles.userName, darkMode && styles.userNameDark]}>
              {userProfile?.full_name ||
               (userProfile?.first_name && userProfile?.last_name
                 ? `${userProfile.first_name} ${userProfile.last_name}`
                 : user?.email?.split('@')[0]) || 'User'}
            </Text>
            <Text style={[styles.userEmail, darkMode && styles.userEmailDark]}>
              {user?.email || 'user@example.com'}
            </Text>
            <Text style={[styles.userStatus, darkMode && styles.userStatusDark]}>
              Active Learner
            </Text>
            <Text style={[styles.joinDate, darkMode && styles.joinDateDark]}>
              Joined {getJoinDate()}
            </Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            {/* Topics Learned */}
            <View style={[styles.statCard, darkMode && styles.statCardDark]}>
              <View style={[styles.statIconContainer, styles.statIconBlue]}>
                <Text style={styles.statIcon}>📚</Text>
              </View>
              <View style={styles.statContent}>
                <Text style={[styles.statNumber, darkMode && styles.statNumberDark]}>
                  {statsLoading ? '...' : (stats?.topics_learned ?? 0)}
                </Text>
                <Text style={[styles.statLabel, darkMode && styles.statLabelDark]}>
                  Topics Learned
                </Text>
              </View>
            </View>

            {/* Streak */}
            <View style={[styles.statCard, darkMode && styles.statCardDark]}>
              <View style={[styles.statIconContainer, styles.statIconGreen]}>
                <Text style={styles.statIcon}>🔥</Text>
              </View>
              <View style={styles.statContent}>
                <Text style={[styles.statNumber, darkMode && styles.statNumberDark]}>
                  {statsLoading ? '...' : (stats?.days_active ?? 0)}
                </Text>
                <Text style={[styles.statLabel, darkMode && styles.statLabelDark]}>
                  Day Streak
                </Text>
              </View>
            </View>

            {/* AI Chats */}
            <View style={[styles.statCard, darkMode && styles.statCardDark]}>
              <View style={[styles.statIconContainer, styles.statIconPurple]}>
                <Text style={styles.statIcon}>💬</Text>
              </View>
              <View style={styles.statContent}>
                <Text style={[styles.statNumber, darkMode && styles.statNumberDark]}>
                  {statsLoading ? '...' : (stats?.conversations_count ?? 0)}
                </Text>
                <Text style={[styles.statLabel, darkMode && styles.statLabelDark]}>
                  AI Chats
                </Text>
              </View>
            </View>

            {/* Joined Date */}
            <View style={[styles.statCard, darkMode && styles.statCardDark]}>
              <View style={[styles.statIconContainer, styles.statIconOrange]}>
                <Text style={styles.statIcon}>📅</Text>
              </View>
              <View style={styles.statContent}>
                <Text style={[styles.statNumber, styles.statDateText, darkMode && styles.statNumberDark]}>
                  {statsLoading ? '...' : (stats?.join_date
                    ? new Date(stats.join_date).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric'
                      })
                    : 'N/A')}
                </Text>
                <Text style={[styles.statLabel, darkMode && styles.statLabelDark]}>
                  Joined
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark]}>
            Settings
          </Text>

          {settingsItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.settingItem, darkMode && styles.settingItemDark]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.settingContent}>
                <Text style={styles.settingIcon}>{item.icon}</Text>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, darkMode && styles.settingTitleDark]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.settingSubtitle, darkMode && styles.settingSubtitleDark]}>
                    {item.subtitle}
                  </Text>
                </View>
              </View>

              {item.type === 'switch' ? (
                <ModernSwitch
                  value={item.value}
                  onValueChange={item.onPress}
                  darkMode={darkMode}
                />
              ) : (
                <Text style={[styles.settingArrow, darkMode && styles.settingArrowDark]}>
                  ›
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Account Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.actionButton, styles.signOutButton]}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton, darkMode && styles.deleteButtonDark]}
            onPress={handleDeleteAccount}
          >
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.footerSection}>
          <Text style={[styles.footerText, darkMode && styles.footerTextDark]}>
            Kiongozi Platform v1.0.0
          </Text>
          <Text style={[styles.footerSubtext, darkMode && styles.footerSubtextDark]}>
            Empowering Kenyan youth through Twin Green & Digital Transition
          </Text>
        </View>
      </ScrollView>

      {/* Export Modal */}
      <ExportModal
        visible={exportModalVisible}
        darkMode={darkMode}
        onClose={() => setExportModalVisible(false)}
        conversations={conversations}
        currentConversation={currentConversation}
      />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    backdropFilter: 'blur(20px)',
  },
  headerDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  backButtonText: {
    fontSize: 20,
    color: '#4b5563',
  },
  backButtonTextDark: {
    color: '#d1d5db',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerTitleDark: {
    color: '#f9fafb',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  userSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  userSectionDark: {
    backgroundColor: 'rgba(51, 65, 85, 0.4)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  statusBadgeDark: {
    borderColor: '#1f2937',
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  userNameDark: {
    color: '#f9fafb',
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  userEmailDark: {
    color: '#9ca3af',
  },
  userStatus: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '500',
    marginBottom: 4,
  },
  userStatusDark: {
    color: '#10b981',
  },
  joinDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  joinDateDark: {
    color: '#9ca3af',
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 12,
    width: '48%',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCardDark: {
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  statIconBlue: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  statIconGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  statIconPurple: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  statIconOrange: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
  },
  statIcon: {
    fontSize: 16,
  },
  statContent: {
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  statNumberDark: {
    color: '#f9fafb',
  },
  statDateText: {
    fontSize: 14,
  },
  statLabel: {
    fontSize: 10,
    color: '#6b7280',
  },
  statLabelDark: {
    color: '#9ca3af',
  },
  settingsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  sectionTitleDark: {
    color: '#f9fafb',
  },
  settingItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    backdropFilter: 'blur(10px)',
  },
  settingItemDark: {
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  settingTitleDark: {
    color: '#f9fafb',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  settingSubtitleDark: {
    color: '#9ca3af',
  },
  settingArrow: {
    fontSize: 20,
    color: '#9ca3af',
  },
  settingArrowDark: {
    color: '#6b7280',
  },
  actionsSection: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 24,
  },
  actionButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  signOutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  signOutButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
  },
  deleteButtonDark: {
    backgroundColor: 'rgba(156, 163, 175, 0.2)',
  },
  deleteButtonText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
  footerSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  footerTextDark: {
    color: '#9ca3af',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  footerSubtextDark: {
    color: '#6b7280',
  },
});