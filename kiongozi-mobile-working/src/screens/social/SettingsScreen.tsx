import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import { useSocialStore } from '../../stores/socialStore';
import { useThemeStore } from '../../stores/themeStore';
import { useTheme } from '../../hooks/useTheme';
import { BottomSheet } from '../../components/social/BottomSheet';
import { supabase } from '../../utils/supabaseClient';
import { registerForPushNotifications, unregisterPushNotifications } from '../../utils/pushNotifications';
import apiClient from '../../utils/apiClient';

const PUSH_ENABLED_KEY = 'push_notifications_enabled';
const PUSH_TOKEN_KEY = 'push_token';

const PRIVACY_POLICY_URL = 'https://chat.kiongozi.org/privacy-policy';
const TERMS_URL = 'https://chat.kiongozi.org/terms';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { signOut } = useAuthStore();
  const { currentUserProfile, fetchCurrentUserProfile } = useProfileStore();
  const { loadBlockedAndMuted } = useSocialStore();
  const { isDark, toggleTheme } = useThemeStore();
  const T = useTheme();
  const styles = React.useMemo(() => makeStyles(T), [T]);

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [privateAccount, setPrivateAccount] = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [signOutSheet, setSignOutSheet] = useState(false);
  const [deleteAccountSheet, setDeleteAccountSheet] = useState(false);
  const [exportSheet, setExportSheet] = useState(false);

  // Change password modal
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PUSH_ENABLED_KEY).then(val => {
      setPushEnabled(val === 'true');
    });
  }, []);

  // Sync is_private from profile
  useEffect(() => {
    if (currentUserProfile?.is_private !== undefined) {
      setPrivateAccount(!!currentUserProfile.is_private);
    }
  }, [currentUserProfile?.is_private]);

  const handlePushToggle = async (value: boolean) => {
    setPushLoading(true);
    try {
      if (value) {
        const token = await registerForPushNotifications();
        if (token) {
          await AsyncStorage.setItem(PUSH_ENABLED_KEY, 'true');
          await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
          setPushEnabled(true);
        } else {
          Alert.alert(
            'Permission Denied',
            'Please allow notifications in your device settings to enable push notifications.'
          );
        }
      } else {
        const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
        if (token) {
          await unregisterPushNotifications(token);
          await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
        }
        await AsyncStorage.setItem(PUSH_ENABLED_KEY, 'false');
        setPushEnabled(false);
      }
    } finally {
      setPushLoading(false);
    }
  };

  const handlePrivateToggle = async (value: boolean) => {
    setPrivacyLoading(true);
    const prev = privateAccount;
    setPrivateAccount(value);
    try {
      const res = await apiClient.updatePrivacySettings({ is_private: value });
      if (!res.success) {
        setPrivateAccount(prev);
        Alert.alert('Error', 'Failed to update privacy setting.');
      } else if (currentUserProfile?.username) {
        fetchCurrentUserProfile(currentUserProfile.username);
      }
    } catch {
      setPrivateAccount(prev);
    } finally {
      setPrivacyLoading(false);
    }
  };

  const handleExportData = () => setExportSheet(true);

  const doExportData = async () => {
    setExportLoading(true);
    try {
      const res = await apiClient.exportUserData();
      if (res.success || res.data) {
        Alert.alert('Data Export', 'Your data export is ready. In a production build this would download a JSON file.');
      } else {
        Alert.alert('Error', res.error || 'Failed to export data.');
      }
    } catch {
      Alert.alert('Error', 'Failed to export data. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleSignOut = () => setSignOutSheet(true);

  const doSignOut = async () => {
    try { await signOut(); } catch { /* ignore */ }
  };

  const handleDeleteAccount = () => setDeleteAccountSheet(true);

  const doDeleteAccount = async () => {
    try {
      const result = await apiClient.deleteAccount();
      if (result.success) await signOut();
    } catch { /* ignore */ }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Password updated successfully.');
        setPasswordModalVisible(false);
        setNewPassword('');
        setConfirmPassword('');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const appVersion =
    Constants.expoConfig?.version ?? (Constants as any).manifest?.version ?? '1.0.0';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* APPEARANCE */}
        <SectionHeader label="Appearance" />
        <View style={styles.section}>
          <View style={[styles.row, styles.rowLast]}>
            <View style={styles.rowLeft}>
              <Ionicons name="moon-outline" size={22} color="#8E8E93" />
              <View>
                <Text style={styles.rowLabel}>Dark Mode</Text>
                <Text style={styles.rowSub}>Switch between dark and light theme</Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#2A2A2A', true: '#5CB85C' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* ACCOUNT */}
        <SectionHeader label="Account" />
        <View style={styles.section}>
          <SettingsRow
            icon="person-outline"
            label="Edit Profile"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <SettingsRow
            icon="lock-closed-outline"
            label="Change Password"
            onPress={() => setPasswordModalVisible(true)}
          />
          <SettingsRow
            icon="download-outline"
            label={exportLoading ? 'Exporting...' : 'Export My Data'}
            onPress={handleExportData}
            isLast
          />
        </View>

        {/* PRIVACY */}
        <SectionHeader label="Privacy" />
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="lock-closed-outline" size={22} color="#8E8E93" />
              <View>
                <Text style={styles.rowLabel}>Private Account</Text>
                <Text style={styles.rowSub}>New followers must be approved</Text>
              </View>
            </View>
            {privacyLoading ? (
              <ActivityIndicator size="small" color="#5CB85C" />
            ) : (
              <Switch
                value={privateAccount}
                onValueChange={handlePrivateToggle}
                trackColor={{ false: '#2A2A2A', true: '#5CB85C' }}
                thumbColor="#fff"
              />
            )}
          </View>
          <SettingsRow
            icon="ban-outline"
            label="Blocked Users"
            onPress={() => navigation.navigate('BlockedUsers')}
          />
          <SettingsRow
            icon="volume-mute-outline"
            label="Muted Users"
            onPress={() => navigation.navigate('MutedUsers')}
            isLast
          />
        </View>

        {/* NOTIFICATIONS */}
        <SectionHeader label="Notifications" />
        <View style={styles.section}>
          <View style={[styles.row, styles.rowLast]}>
            <View style={styles.rowLeft}>
              <Ionicons name="notifications-outline" size={22} color="#8E8E93" />
              <Text style={styles.rowLabel}>Push Notifications</Text>
            </View>
            {pushLoading ? (
              <ActivityIndicator size="small" color="#5CB85C" />
            ) : (
              <Switch
                value={pushEnabled}
                onValueChange={handlePushToggle}
                trackColor={{ false: '#2A2A2A', true: '#5CB85C' }}
                thumbColor="#fff"
              />
            )}
          </View>
        </View>

        {/* ABOUT */}
        <SectionHeader label="About" />
        <View style={styles.section}>
          <SettingsRow
            icon="document-text-outline"
            label="Privacy Policy"
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          />
          <SettingsRow
            icon="reader-outline"
            label="Terms of Service"
            onPress={() => Linking.openURL(TERMS_URL)}
          />
          <View style={[styles.row, styles.rowLast]}>
            <View style={styles.rowLeft}>
              <Ionicons name="information-circle-outline" size={22} color="#8E8E93" />
              <Text style={styles.rowLabel}>Version</Text>
            </View>
            <Text style={styles.rowValue}>{appVersion}</Text>
          </View>
        </View>

        {/* DANGER ZONE */}
        <SectionHeader label="Danger Zone" />
        <View style={styles.section}>
          <SettingsRow
            icon="log-out-outline"
            label="Sign Out"
            onPress={handleSignOut}
            danger
          />
          <SettingsRow
            icon="trash-outline"
            label="Delete Account"
            onPress={handleDeleteAccount}
            danger
            isLast
          />
        </View>
      </ScrollView>

      <BottomSheet
        visible={exportSheet}
        onClose={() => setExportSheet(false)}
        title="Export My Data"
        subtitle="This will package all your Kiongozi data (posts, follows, bookmarks) into a JSON file."
        actions={[
          { icon: 'download-outline', label: 'Export', onPress: doExportData },
        ]}
      />

      <BottomSheet
        visible={signOutSheet}
        onClose={() => setSignOutSheet(false)}
        title="Sign Out"
        subtitle="Are you sure you want to sign out?"
        actions={[
          { icon: 'log-out-outline', label: 'Sign Out', onPress: doSignOut, destructive: true },
        ]}
      />

      <BottomSheet
        visible={deleteAccountSheet}
        onClose={() => setDeleteAccountSheet(false)}
        title="Delete Account"
        subtitle="This is permanent and cannot be undone. All your data will be deleted."
        actions={[
          { icon: 'trash-outline', label: 'Delete Account', onPress: doDeleteAccount, destructive: true },
        ]}
      />

      {/* Change Password Modal */}
      <Modal
        visible={passwordModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContainer}
        >
          <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={handleChangePassword} disabled={passwordLoading}>
                {passwordLoading ? (
                  <ActivityIndicator size="small" color="#5CB85C" />
                ) : (
                  <Text style={styles.modalSave}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="At least 6 characters"
                placeholderTextColor="#a0aec0"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Repeat new password"
                placeholderTextColor="#a0aec0"
                autoCapitalize="none"
              />
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function SectionHeader({ label }: { label: string }) {
  const T = useTheme();
  return (
    <Text style={{ fontSize: 11, fontWeight: '700', color: T.textMuted, letterSpacing: 0.8, marginTop: 24, marginBottom: 4, paddingHorizontal: 20 }}>
      {label.toUpperCase()}
    </Text>
  );
}

function SettingsRow({
  icon,
  label,
  onPress,
  danger = false,
  isLast = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  isLast?: boolean;
}) {
  const T = useTheme();
  const s = React.useMemo(() => makeStyles(T), [T]);
  return (
    <TouchableOpacity style={[s.row, isLast && s.rowLast]} onPress={onPress}>
      <View style={s.rowLeft}>
        <Ionicons name={icon} size={22} color={danger ? '#FF3B30' : T.textSub} />
        <Text style={[s.rowLabel, danger && s.dangerLabel]}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
    </TouchableOpacity>
  );
}

function makeStyles(T: ReturnType<typeof import('../../hooks/useTheme').useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 8, paddingVertical: 12,
      backgroundColor: T.bg,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderLight,
    },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: 17, fontWeight: '700', color: T.text },
    content: { paddingBottom: 48 },
    sectionHeader: { fontSize: 11, fontWeight: '700', color: T.textMuted, letterSpacing: 0.8, marginTop: 24, marginBottom: 4, paddingHorizontal: 20 },
    section: { backgroundColor: T.surface, borderRadius: 12, marginHorizontal: 16, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border },
    rowLast: { borderBottomWidth: 0 },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    rowLabel: { fontSize: 16, color: T.text },
    rowSub: { fontSize: 12, color: T.textMuted, marginTop: 1 },
    rowValue: { fontSize: 15, color: T.textMuted },
    dangerLabel: { color: '#FF3B30' },
    modalContainer: { flex: 1, backgroundColor: T.bg },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderLight },
    modalCancel: { fontSize: 16, color: T.textSub },
    modalTitle: { fontSize: 17, fontWeight: '700', color: T.text },
    modalSave: { fontSize: 16, fontWeight: '700', color: T.accent },
    modalBody: { padding: 20, gap: 4 },
    inputLabel: { fontSize: 13, color: T.textSub, marginBottom: 4, marginTop: 12 },
    input: { backgroundColor: T.inputBg, borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: T.text },
  });
}
