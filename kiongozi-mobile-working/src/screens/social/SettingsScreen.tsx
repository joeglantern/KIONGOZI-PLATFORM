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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../utils/supabaseClient';
import { registerForPushNotifications, unregisterPushNotifications } from '../../utils/pushNotifications';
import apiClient from '../../utils/apiClient';

const PUSH_ENABLED_KEY = 'push_notifications_enabled';
const PUSH_TOKEN_KEY = 'push_token';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { signOut } = useAuthStore();

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

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

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch {
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await apiClient.deleteAccount();
              if (result.success) {
                await signOut();
              } else {
                Alert.alert('Error', result.error || 'Failed to delete account.');
              }
            } catch {
              Alert.alert('Error', 'Failed to delete account.');
            }
          },
        },
      ]
    );
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
    Constants.expoConfig?.version ?? Constants.manifest?.version ?? '1.0.0';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#1a202c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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
            isLast
          />
        </View>

        {/* NOTIFICATIONS */}
        <SectionHeader label="Notifications" />
        <View style={styles.section}>
          <View style={[styles.row, styles.rowLast]}>
            <View style={styles.rowLeft}>
              <Ionicons name="notifications-outline" size={22} color="#4a5568" />
              <Text style={styles.rowLabel}>Push Notifications</Text>
            </View>
            {pushLoading ? (
              <ActivityIndicator size="small" color="#1a365d" />
            ) : (
              <Switch
                value={pushEnabled}
                onValueChange={handlePushToggle}
                trackColor={{ false: '#cbd5e0', true: '#1a365d' }}
                thumbColor="#fff"
              />
            )}
          </View>
        </View>

        {/* ABOUT */}
        <SectionHeader label="About" />
        <View style={styles.section}>
          <View style={[styles.row, styles.rowLast]}>
            <View style={styles.rowLeft}>
              <Ionicons name="information-circle-outline" size={22} color="#4a5568" />
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
                  <ActivityIndicator size="small" color="#1a365d" />
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
  return (
    <Text style={styles.sectionHeader}>{label.toUpperCase()}</Text>
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
  return (
    <TouchableOpacity
      style={[styles.row, isLast && styles.rowLast]}
      onPress={onPress}
    >
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={22} color={danger ? '#e53e3e' : '#4a5568'} />
        <Text style={[styles.rowLabel, danger && styles.dangerLabel]}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#cbd5e0" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a202c' },
  content: { paddingBottom: 48 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#718096',
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 4,
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  rowLast: { borderBottomWidth: 0 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLabel: { fontSize: 16, color: '#2d3748' },
  rowValue: { fontSize: 15, color: '#a0aec0' },
  dangerLabel: { color: '#e53e3e' },
  // Modal
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  modalCancel: { fontSize: 16, color: '#718096' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1a202c' },
  modalSave: { fontSize: 16, fontWeight: '700', color: '#1a365d' },
  modalBody: { padding: 20, gap: 4 },
  inputLabel: { fontSize: 13, color: '#718096', marginBottom: 4, marginTop: 12 },
  input: {
    backgroundColor: '#f7fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a202c',
  },
});
