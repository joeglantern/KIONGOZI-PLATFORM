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
import { usePrefs } from '../../stores/prefsStore';
import { RecapSheet } from '../../components/social/RecapSheet';
import { UserAvatar } from '../../components/social/UserAvatar';
import { useSocialStore } from '../../stores/socialStore';
import { Section, Card, Row, Toggle, useKitColors, rise } from '../../components/settings/SettingsKit';
import Animated from 'react-native-reanimated';

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

  const lowData = usePrefs(s => s.lowData);
  const setLowData = usePrefs(s => s.setLowData);
  const showActivity = usePrefs(s => s.showActivity);
  const setShowActivity = usePrefs(s => s.setShowActivity);
  const features = usePrefs(s => s.features);
  const blockedCount = useSocialStore(s => s.blockedUserIds.length);
  const mutedCount = useSocialStore(s => s.mutedUserIds.length);
  const [recapOpen, setRecapOpen] = useState(false);
  const K = useKitColors();
  const me = currentUserProfile;

  const pickTheme = (dark: boolean) => {
    if (dark === isDark) return;
    Haptics.selectionAsync().catch(() => {});
    toggleTheme();
  };

  const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  return (
    <View style={[styles.container, { backgroundColor: K.page }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 12) + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={({ pressed }) => [styles.backBtn, { backgroundColor: K.tile }, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={20} color={T.text} />
        </Pressable>
        <Text style={styles.bigTitle} maxFontSizeMultiplier={1.2} accessibilityRole="header">Settings</Text>

        {/* You */}
        <Section order={0}>
          <Card>
            <Pressable
              onPress={() => navigation.navigate('EditProfile')}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              style={({ pressed }) => [styles.meRow, pressed && { backgroundColor: K.pressed }]}
            >
              <View style={[styles.meRing, { borderColor: T.accent }]}>
                <UserAvatar avatarUrl={me?.avatar_url} size={52} name={me?.full_name || me?.username} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.meName} numberOfLines={1} maxFontSizeMultiplier={1.2}>{me?.full_name || 'Your profile'}</Text>
                <Text style={styles.meSub} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                  {me?.username ? `@${me.username} · ` : ''}Edit profile, photo and bio
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
            </Pressable>
          </Card>
        </Section>

        {/* Appearance: pick by looking, not by reading */}
        <Section title="Appearance" order={1}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[true, false].map(dark => {
              const on = dark === isDark;
              return (
                <Pressable
                  key={String(dark)}
                  onPress={() => pickTheme(dark)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={dark ? 'Dark theme' : 'Light theme'}
                  style={({ pressed }) => [
                    styles.themeCard,
                    { backgroundColor: K.card, borderColor: on ? T.accent : K.cardBorder, borderWidth: on ? 2 : 1 },
                    pressed && { transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <View style={[styles.phone, { backgroundColor: dark ? '#000' : '#FFF', borderColor: dark ? '#2C2C2E' : '#DEDEE3' }]}>
                    <View style={[styles.phoneBlock, { backgroundColor: dark ? '#1C1C1E' : '#F2F2F7' }]} />
                    <View style={[styles.phoneLine, { width: '72%', backgroundColor: dark ? '#3A3A3C' : '#D1D1D6' }]} />
                    <View style={[styles.phoneLine, { width: '50%', backgroundColor: dark ? '#3A3A3C' : '#D1D1D6' }]} />
                    <View style={[styles.phoneBtn, { backgroundColor: dark ? '#5CB85C' : '#3E9A3E' }]} />
                  </View>
                  <Text style={[styles.themeLabel, { color: on ? T.text : T.textMuted }]}>{dark ? 'Dark' : 'Light'}</Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title="Privacy" order={2}>
          <Card>
            <Row
              icon="lock-closed-outline"
              title="Private account"
              sub={privateAccount ? 'On · you approve new followers' : 'Off · anyone can follow you'}
              right={privacyLoading ? <ActivityIndicator size="small" color={T.textMuted} /> : <Toggle value={privateAccount} onChange={handlePrivateToggle} label="Private account" />}
            />
            {features.presence && (
              <Row
                icon="radio-button-on-outline"
                title="Activity status"
                sub={showActivity ? 'On · friends see when you’re active' : 'Off · you won’t see theirs either'}
                right={<Toggle value={showActivity} onChange={setShowActivity} label="Show activity status" />}
              />
            )}
            <Row
              icon="ban-outline"
              title="Blocked accounts"
              sub={blockedCount ? count(blockedCount, 'account', 'accounts') : 'No one'}
              chevron
              onPress={() => navigation.navigate('BlockedUsers')}
            />
            <Row
              icon="volume-mute-outline"
              title="Muted accounts"
              sub={mutedCount ? count(mutedCount, 'account', 'accounts') : 'No one'}
              chevron
              onPress={() => navigation.navigate('MutedUsers')}
            />
          </Card>
        </Section>

        <Section title="Notifications and data" order={3}>
          <Card>
            <Row
              icon="notifications-outline"
              title="Push notifications"
              sub={pushEnabled ? 'On · silent from 11pm to 7am' : 'Off'}
              right={pushLoading ? <ActivityIndicator size="small" color={T.textMuted} /> : <Toggle value={pushEnabled} onChange={handlePushToggle} label="Push notifications" />}
            />
            <Row
              icon="cellular-outline"
              title="Low-data mode"
              sub={lowData ? 'On · tap to play videos, nothing loads ahead' : 'Off · videos play as you scroll'}
              right={<Toggle value={lowData} onChange={setLowData} label="Low-data mode" />}
            />
          </Card>
        </Section>

        {(features.invites || features.recap) && (
          <Section title="Grow" order={4}>
            <Card>
              {features.invites && (
                <Row icon="person-add-outline" title="Invite friends" sub="Share your link, see who joined" chevron onPress={() => navigation.navigate('Invite')} />
              )}
              {features.recap && (
                <Row icon="sparkles-outline" title="Your week" sub="A recap card to share" chevron onPress={() => setRecapOpen(true)} />
              )}
            </Card>
          </Section>
        )}

        <Section title="Account" order={5}>
          <Card>
            <Row icon="key-outline" title="Change password" chevron onPress={() => setPasswordModalVisible(true)} />
            <Row
              icon="download-outline"
              title="Download your data"
              sub="Posts, follows and bookmarks, by email"
              onPress={handleExportData}
              chevron={!exportLoading}
              right={exportLoading ? <ActivityIndicator size="small" color={T.textMuted} /> : undefined}
            />
            <Row icon="trash-outline" title="Delete account" sub="Permanent. Your posts and messages go too." danger onPress={handleDeleteAccount} />
          </Card>
        </Section>

        <Section title="The fine print" order={6}>
          <Card>
            <Row icon="document-text-outline" title="Privacy policy" external onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} />
            <Row icon="reader-outline" title="Terms of service" external onPress={() => Linking.openURL(TERMS_URL)} />
          </Card>
        </Section>

        <Animated.View entering={rise(7)}>
          <Pressable
            onPress={handleSignOut}
            accessibilityRole="button"
            style={({ pressed }) => [styles.signOut, pressed && { backgroundColor: K.pressed }]}
          >
            <Ionicons name="log-out-outline" size={20} color={T.error} />
            <Text style={[styles.signOutText, { color: T.error }]}>Log out</Text>
          </Pressable>
          <Text style={styles.footer} maxFontSizeMultiplier={1.3}>KChat {appVersion} · Made in Nairobi</Text>
        </Animated.View>
      </ScrollView>

      <RecapSheet visible={recapOpen} onClose={() => setRecapOpen(false)} />

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

function makeStyles(T: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 4, backgroundColor: T.bg,
    },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    bigTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 34, letterSpacing: -0.8, color: T.text, marginTop: 14, marginLeft: 4 },
    meRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 10, borderRadius: 15 },
    meRing: { borderWidth: 2, borderRadius: 30, padding: 2 },
    meName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 19, color: T.text },
    meSub: { fontSize: 13, color: T.textMuted, marginTop: 2 },
    themeCard: { flex: 1, borderRadius: 18, paddingVertical: 12, alignItems: 'center', gap: 8 },
    phone: { width: 54, height: 80, borderRadius: 12, borderWidth: 1, padding: 6, gap: 4 },
    phoneBlock: { height: 22, borderRadius: 5 },
    phoneLine: { height: 4, borderRadius: 2 },
    phoneBtn: { marginTop: 'auto', height: 8, borderRadius: 4 },
    themeLabel: { fontSize: 14, fontWeight: '600' },
    signOut: { marginTop: 26, minHeight: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    signOutText: { fontSize: 16, fontWeight: '700' },
    footer: { textAlign: 'center', fontSize: 12.5, color: T.textMuted, marginTop: 6 },
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
