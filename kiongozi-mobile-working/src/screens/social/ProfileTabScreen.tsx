import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatar } from '../../components/social/UserAvatar';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';

export default function ProfileTabScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuthStore();
  const { currentUserProfile, fetchCurrentUserProfile } = useProfileStore();

  useEffect(() => {
    fetchCurrentUserProfile();
  }, []);

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
          <UserAvatar
            avatarUrl={currentUserProfile?.avatar_url}
            size={72}
          />
          <Text style={styles.displayName}>
            {currentUserProfile?.full_name || user?.user_metadata?.full_name || 'Your Profile'}
          </Text>
          {currentUserProfile?.username && (
            <Text style={styles.handle}>@{currentUserProfile.username}</Text>
          )}
          <Text style={styles.email}>{user?.email}</Text>

          {/* Stats row */}
          {currentUserProfile && (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{currentUserProfile.post_count ?? 0}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{currentUserProfile.follower_count ?? 0}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{currentUserProfile.following_count ?? 0}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            </View>
          )}
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
            onPress={() => navigation.navigate('Bookmarks')}
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
  handle: { fontSize: 14, color: '#718096', marginTop: 2 },
  email: { fontSize: 14, color: '#718096', marginTop: 4 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
    width: '100%',
    justifyContent: 'center',
  },
  statItem: { alignItems: 'center', paddingHorizontal: 20 },
  statNum: { fontSize: 18, fontWeight: '800', color: '#1a202c' },
  statLabel: { fontSize: 12, color: '#718096', marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: '#e2e8f0' },
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
