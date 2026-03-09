import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatar } from '../../components/social/UserAvatar';
import { useAuthStore } from '../../stores/authStore';

/**
 * Profile tab screen for the bottom navigator.
 * The original ProfileScreen requires modal-style props (visible, onClose, etc.)
 * that don't fit the navigation model. This is a clean tab-compatible replacement.
 */
export default function ProfileTabScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuthStore();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (e) {
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
          <Ionicons name="settings-outline" size={24} color="#1a202c" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body}>
        {/* Avatar + name */}
        <View style={styles.profileSection}>
          <UserAvatar avatarUrl={undefined} size={72} />
          <Text style={styles.displayName}>{user?.user_metadata?.full_name || 'Your Profile'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Menu items */}
        <View style={styles.menu}>
          <MenuItem
            icon="mail-outline"
            label="Messages"
            onPress={() => navigation.navigate('DMList')}
          />
          <MenuItem
            icon="person-outline"
            label="Edit Profile"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <MenuItem
            icon="bookmark-outline"
            label="Bookmarks"
            onPress={() => Alert.alert('Coming Soon', 'Bookmarks are coming in the next update.')}
          />
          <MenuItem
            icon="log-out-outline"
            label="Sign Out"
            onPress={handleSignOut}
            danger
          />
        </View>
      </ScrollView>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon} size={22} color={danger ? '#e53e3e' : '#4a5568'} />
      <Text style={[styles.menuLabel, danger && styles.dangerLabel]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#cbd5e0" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1a202c' },
  body: { flex: 1 },
  profileSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  displayName: { fontSize: 20, fontWeight: '700', color: '#1a202c', marginTop: 12 },
  email: { fontSize: 14, color: '#718096', marginTop: 4 },
  menu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  menuLabel: { flex: 1, fontSize: 16, color: '#2d3748' },
  dangerLabel: { color: '#e53e3e' },
});
