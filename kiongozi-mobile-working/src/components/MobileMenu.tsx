import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useAuthStore } from '../stores/authStore';

interface MobileMenuProps {
  visible: boolean;
  onClose: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onSignOut: () => void;
}

export default function MobileMenu({
  visible,
  onClose,
  darkMode,
  onToggleDarkMode,
  onSignOut,
}: MobileMenuProps) {
  const { user } = useAuthStore();

  const menuItems = [
    {
      icon: '💬',
      title: 'New Chat',
      subtitle: 'Start a new conversation',
      onPress: () => {
        onClose();
        // TODO: Start new chat
      },
    },
    {
      icon: '📚',
      title: 'Civic Education',
      subtitle: 'Learn about Kenyan governance',
      onPress: () => {
        onClose();
        // TODO: Navigate to civic education
      },
    },
    {
      icon: '🗳️',
      title: 'Elections & Democracy',
      subtitle: 'Understand electoral processes',
      onPress: () => {
        onClose();
        // TODO: Navigate to elections info
      },
    },
    {
      icon: '⚖️',
      title: 'Your Rights',
      subtitle: 'Know your constitutional rights',
      onPress: () => {
        onClose();
        // TODO: Navigate to rights info
      },
    },
    {
      icon: darkMode ? '☀️' : '🌙',
      title: darkMode ? 'Light Mode' : 'Dark Mode',
      subtitle: 'Toggle theme',
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
              <View style={styles.aiIcon}>
                <Text style={styles.aiIconText}>AI</Text>
              </View>
              <View>
                <Text style={[styles.headerTitle, darkMode && styles.headerTitleDark]}>
                  Kiongozi<Text style={styles.platformText}>Platform</Text>
                </Text>
                <Text style={[styles.headerSubtitle, darkMode && styles.headerSubtitleDark]}>
                  Civic Education AI
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
        <View style={[styles.userSection, darkMode && styles.userSectionDark]}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userEmail, darkMode && styles.userEmailDark]}>
              {user?.email || 'User'}
            </Text>
            <Text style={[styles.userStatus, darkMode && styles.userStatusDark]}>
              Active learner
            </Text>
          </View>
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
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, darkMode && styles.menuTitleDark]}>
                  {item.title}
                </Text>
                <Text style={[styles.menuSubtitle, darkMode && styles.menuSubtitleDark]}>
                  {item.subtitle}
                </Text>
              </View>
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
            onPress={onSignOut}
          >
            <Text style={styles.signOutButtonText}>🚪 Sign Out</Text>
          </TouchableOpacity>

          <Text style={[styles.footerText, darkMode && styles.footerTextDark]}>
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
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  userSectionDark: {
    backgroundColor: '#1f2937',
    borderBottomColor: '#374151',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  userEmailDark: {
    color: '#f9fafb',
  },
  userStatus: {
    fontSize: 14,
    color: '#6b7280',
  },
  userStatusDark: {
    color: '#9ca3af',
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItemDark: {
    backgroundColor: '#1f2937',
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  menuTitleDark: {
    color: '#f9fafb',
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  menuSubtitleDark: {
    color: '#9ca3af',
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
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerDark: {
    borderTopColor: '#374151',
  },
  signOutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  signOutButtonDark: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  signOutButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9ca3af',
  },
  footerTextDark: {
    color: '#6b7280',
  },
});