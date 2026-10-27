import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import { useThemeStore } from '../../stores/themeStore';
import { useTheme, AppTheme } from '../../hooks/useTheme';
import { BottomSheet } from '../../components/social/BottomSheet';
import { supabase } from '../../utils/supabaseClient';
import { registerForPushNotifications, unregisterPushNotifications } from '../../utils/pushNotifications';
import apiClient from '../../utils/apiClient';

const PUSH_ENABLED_KEY = 'push_notifications_enabled';
const PUSH_TOKEN_KEY = 'push_token';

const PRIVACY_POLICY_URL = 'https://chat.kiongozi.org/privacy-policy';
const TERMS_URL = 'https://chat.kiongozi.org/terms';

type IconName = keyof typeof Ionicons.glyphMap;

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuthStore();
  const { currentUserProfile, fetchCurrentUserProfile } = useProfileStore();
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

  const handleThemeToggle = () => {
    Haptics.selectionAsync().catch(() => {});
    toggleTheme();
  };

  const handlePushToggle = async (value: boolean) => {
    Haptics.selectionAsync().catch(() => {});
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
    Haptics.selectionAsync().catch(() => {});
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
        Alert.alert('Data Export', 'Your data is being prepared. You will receive an email with a download link within 24 hours.');
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

  const switchProps = {
    trackColor: { false: T.surface2, true: T.accent },
    thumbColor: '#FFFFFF',
    ios_backgroundColor: T.surface2,
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={26} color={T.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Group label="Appearance">
          <Row
            icon={isDark ? 'moon-outline' : 'sunny-outline'}
            label="Dark mode"
            onPress={handleThemeToggle}
            isLast
            right={<Switch value={isDark} onValueChange={handleThemeToggle} {...switchProps} />}
          />
        </Group>

        <Group label="Account">
          <Row icon="person-outline" label="Edit profile" chevron onPress={() => navigation.navigate('EditProfile')} />
          <Row icon="key-outline" label="Change password" chevron onPress={() => setPasswordModalVisible(true)} />
          <Row
            icon="download-outline"
            label="Export my data"
            onPress={handleExportData}
            isLast
            chevron={!exportLoading}
            right={exportLoading ? <ActivityIndicator size="small" color={T.textMuted} /> : undefined}
          />
        </Group>

        <Group label="Privacy">
          <Row
            icon="lock-closed-outline"
            label="Private account"
            sub="New followers must be approved"
            right={
              privacyLoading ? (
                <ActivityIndicator size="small" color={T.textMuted} />
              ) : (
                <Switch value={privateAccount} onValueChange={handlePrivateToggle} {...switchProps} />
              )
            }
          />
          <Row icon="ban-outline" label="Blocked accounts" chevron onPress={() => navigation.navigate('BlockedUsers')} />
          <Row icon="volume-mute-outline" label="Muted accounts" chevron onPress={() => navigation.navigate('MutedUsers')} isLast />
        </Group>

        <Group label="Notifications">
          <Row
            icon="notifications-outline"
            label="Push notifications"
            isLast
            right={
              pushLoading ? (
                <ActivityIndicator size="small" color={T.textMuted} />
              ) : (
                <Switch value={pushEnabled} onValueChange={handlePushToggle} {...switchProps} />
              )
            }
          />
        </Group>

        <Group label="About">
          <Row icon="document-text-outline" label="Privacy policy" external onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} />
          <Row icon="reader-outline" label="Terms of service" external onPress={() => Linking.openURL(TERMS_URL)} />
          <Row icon="information-circle-outline" label="Version" value={appVersion} isLast />
        </Group>

        <Group>
          <Row icon="log-out-outline" label="Log out" destructive onPress={handleSignOut} />
          <Row icon="trash-outline" label="Delete account" destructive onPress={handleDeleteAccount} isLast />
        </Group>
      </ScrollView>

      <BottomSheet
        visible={exportSheet}
        onClose={() => setExportSheet(false)}
        title="Export my data"
        subtitle="This will package all your Kiongozi data (posts, follows, bookmarks) into a JSON file."
        actions={[
          { icon: 'download-outline', label: 'Export', onPress: doExportData },
        ]}
      />

      <BottomSheet
        visible={signOutSheet}
        onClose={() => setSignOutSheet(false)}
        title="Log out"
        subtitle="Are you sure you want to log out?"
        actions={[
          { icon: 'log-out-outline', label: 'Log out', onPress: doSignOut, destructive: true },
        ]}
      />

      <BottomSheet
        visible={deleteAccountSheet}
        onClose={() => setDeleteAccountSheet(false)}
        title="Delete account"
        subtitle="This is permanent and cannot be undone. All your data will be deleted."
        actions={[
          { icon: 'trash-outline', label: 'Delete account', onPress: doDeleteAccount, destructive: true },
        ]}
      />

      {/* Change password modal */}
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
              <Pressable
                onPress={() => setPasswordModalVisible(false)}
                style={({ pressed }) => [styles.modalHeaderBtn, pressed && { opacity: 0.5 }]}
              >
                <Text style={styles.modalCancel} numberOfLines={1} maxFontSizeMultiplier={1.2}>Cancel</Text>
              </Pressable>
              <Text style={styles.modalTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>Change password</Text>
              <Pressable
                onPress={handleChangePassword}
                disabled={passwordLoading}
                style={({ pressed }) => [styles.modalHeaderBtn, { alignItems: 'flex-end' }, pressed && { opacity: 0.5 }]}
              >
                {passwordLoading ? (
                  <ActivityIndicator size="small" color={T.accent} />
                ) : (
                  <Text style={styles.modalSave} numberOfLines={1} maxFontSizeMultiplier={1.2}>Save</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>New password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="At least 6 characters"
                placeholderTextColor={T.placeholder}
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Confirm password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Repeat new password"
                placeholderTextColor={T.placeholder}
                autoCapitalize="none"
              />
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Group({ label, children }: { label?: string; children: React.ReactNode }) {
  const T = useTheme();
  return (
    <View style={{ marginTop: label ? 24 : 32 }}>
      {label ? (
        <Text style={{ fontSize: 13, color: T.textMuted, paddingHorizontal: 32, marginBottom: 8 }} maxFontSizeMultiplier={1.3}>
          {label}
        </Text>
      ) : null}
      <View style={{ backgroundColor: T.surface, borderRadius: 16, marginHorizontal: 16, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

function Row({
  icon,
  label,
  sub,
  value,
  right,
  onPress,
  chevron = false,
  external = false,
  destructive = false,
  isLast = false,
}: {
  icon: IconName;
  label: string;
  sub?: string;
  value?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  external?: boolean;
  destructive?: boolean;
  isLast?: boolean;
}) {
  const T = useTheme();
  const s = React.useMemo(() => makeStyles(T), [T]);
  const tint = destructive ? T.error : T.text;

  const content = (
    <>
      <Ionicons name={icon} size={20} color={tint} style={s.rowIcon} />
      <View style={{ flex: 1 }}>
        <Text style={[s.rowLabel, { color: tint }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>{label}</Text>
        {sub ? <Text style={s.rowSub} numberOfLines={2} maxFontSizeMultiplier={1.3}>{sub}</Text> : null}
      </View>
      {value ? <Text style={s.rowValue} numberOfLines={1} maxFontSizeMultiplier={1.3}>{value}</Text> : null}
      {right}
      {chevron ? <Ionicons name="chevron-forward" size={18} color={T.textMuted} /> : null}
      {external ? <Ionicons name="open-outline" size={17} color={T.textMuted} /> : null}
      {!isLast ? <View style={s.separator} /> : null}
    </>
  );

  if (!onPress) return <View style={s.row}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [s.row, pressed && { backgroundColor: T.surface2 }]}
    >
      {content}
    </Pressable>
  );
}

function makeStyles(T: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 4, backgroundColor: T.bg,
    },
    backBtn: { width: 44, height: 50, alignItems: 'center', justifyContent: 'center' },
    headerTitle: {
      flex: 1, textAlign: 'center', fontSize: 17,
      fontFamily: 'SpaceGrotesk_600SemiBold', color: T.text,
    },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      minHeight: 52, paddingHorizontal: 16, paddingVertical: 10,
    },
    rowIcon: { width: 24 },
    separator: {
      position: 'absolute', left: 52, right: 0, bottom: 0,
      height: StyleSheet.hairlineWidth, backgroundColor: T.border,
    },
    rowLabel: { fontSize: 16, color: T.text },
    rowSub: { fontSize: 13, color: T.textMuted, marginTop: 2 },
    rowValue: { fontSize: 15, color: T.textMuted, flexShrink: 1, maxWidth: '40%' },
    modalContainer: { flex: 1, backgroundColor: T.bg },
    modalHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 12, height: 56,
    },
    modalHeaderBtn: { minWidth: 64, height: 44, justifyContent: 'center', paddingHorizontal: 4 },
    modalCancel: { fontSize: 16, color: T.textSub },
    // 320pt: 320 − 24 padding − 2×64 buttons = 168pt for the title ("Change password" ≈ 135pt @17pt).
    modalTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: 'SpaceGrotesk_600SemiBold', color: T.text },
    modalSave: { fontSize: 16, fontWeight: '700', color: T.accent },
    modalBody: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
    inputLabel: { fontSize: 13, color: T.textMuted, marginBottom: 8, marginTop: 16 },
    input: {
      height: 48, borderRadius: 14, borderWidth: 1, borderColor: T.border,
      backgroundColor: T.bg, paddingHorizontal: 14, fontSize: 16, color: T.text,
    },
  });
}
