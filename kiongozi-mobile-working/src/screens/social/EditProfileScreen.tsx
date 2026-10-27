import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useProfileStore } from '../../stores/profileStore';
import { UserAvatar } from '../../components/social/UserAvatar';
import apiClient from '../../utils/apiClient';
import { useTheme } from '../../hooks/useTheme';

const COVER_HEIGHT = 150;
const AVATAR_SIZE = 84;
const AVATAR_RING = 4;
const BIO_MAX = 160;

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const { currentUserProfile, updateCurrentUserProfile } = useProfileStore();
  const T = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(T), [T]);

  const [bio, setBio] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [bannerUri, setBannerUri] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'reserved'
  >('idle');
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originalUsername = useRef('');

  useEffect(() => {
    if (currentUserProfile) {
      setFullName(currentUserProfile.full_name || '');
      setUsername(currentUserProfile.username || '');
      originalUsername.current = currentUserProfile.username || '';
      setBio(currentUserProfile.bio || '');
    }
  }, [currentUserProfile]);

  // Debounced username check
  useEffect(() => {
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    const cleaned = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleaned || cleaned === originalUsername.current || cleaned.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    usernameTimer.current = setTimeout(async () => {
      try {
        const res = await apiClient.checkUsername(cleaned);
        setUsernameStatus(
          res.reason === 'Reserved' ? 'reserved' : res.available ? 'available' : 'taken'
        );
      } catch {
        setUsernameStatus('idle');
      }
    }, 500);
    return () => { if (usernameTimer.current) clearTimeout(usernameTimer.current); };
  }, [username]);

  const pickImage = async (field: 'avatar' | 'banner') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: field === 'avatar' ? [1, 1] : [16, 9],
      quality: 0.85,
    });
    if (!result.canceled) {
      if (field === 'avatar') setAvatarUri(result.assets[0].uri);
      else setBannerUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (usernameStatus === 'taken' || usernameStatus === 'reserved') {
      Alert.alert(
        'Username unavailable',
        usernameStatus === 'reserved' ? 'That username is reserved.' : 'That username is already taken.'
      );
      return;
    }
    if (usernameStatus === 'checking') {
      Alert.alert('Please wait', 'Still checking username availability.');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      if (bio !== undefined) formData.append('bio', bio);
      if (username) formData.append('username', username);
      if (fullName) formData.append('full_name', fullName);
      if (avatarUri) {
        formData.append('avatar', { uri: avatarUri, type: 'image/jpeg', name: 'avatar.jpg' } as any);
      }
      if (bannerUri) {
        formData.append('banner', { uri: bannerUri, type: 'image/jpeg', name: 'banner.jpg' } as any);
      }

      const res = await apiClient.updateProfile(formData);
      if (res.success) {
        updateCurrentUserProfile({
          full_name: fullName,
          username,
          bio,
          ...(res.data?.avatar_url ? { avatar_url: res.data.avatar_url } : {}),
          ...(res.data?.banner_url ? { banner_url: res.data.banner_url } : {}),
        });
        navigation.goBack();
      } else {
        Alert.alert('Error', res.error || 'Failed to update profile.');
      }
    } catch {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const bannerSource = bannerUri
    ? { uri: bannerUri }
    : currentUserProfile?.banner_url
    ? { uri: currentUserProfile.banner_url }
    : null;

  const avatarUrl = avatarUri ?? currentUserProfile?.avatar_url;
  const usernameBad = usernameStatus === 'taken' || usernameStatus === 'reserved';

  return (
    <View style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 4, height: insets.top + 4 + 50 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={4}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={26} color={T.text} />
        </Pressable>
        <View style={styles.headerTitleWrap} pointerEvents="none">
          <Text style={styles.headerTitle}>Edit profile</Text>
        </View>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          hitSlop={6}
          style={({ pressed }) => [styles.savePill, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityState={{ disabled: saving, busy: saving }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        >
          {/* ── Banner + avatar ──────────────────────────────────── */}
          <View style={styles.photoSection}>
            <Pressable
              onPress={() => pickImage('banner')}
              style={({ pressed }) => [styles.cover, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Change cover photo"
            >
              {bannerSource ? (
                <Image source={bannerSource} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              ) : null}
              <View style={styles.coverBadge}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            </Pressable>

            <Pressable
              onPress={() => pickImage('avatar')}
              style={({ pressed }) => [styles.avatarArea, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
            >
              <View style={styles.avatarRing}>
                <UserAvatar avatarUrl={avatarUrl ?? undefined} size={AVATAR_SIZE} />
              </View>
              <View style={styles.avatarBadge}>
                <Ionicons name="camera" size={14} color="#000" />
              </View>
            </Pressable>
          </View>

          {/* ── Fields ───────────────────────────────────────────── */}
          <View style={styles.form}>
            <Field label="Name">
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your name"
                placeholderTextColor={T.placeholder}
                selectionColor={T.accent}
                returnKeyType="next"
              />
            </Field>

            <Field
              label="Username"
              error={usernameBad ? (usernameStatus === 'reserved' ? 'That username is reserved' : 'Username already taken') : undefined}
              hint={usernameStatus === 'available' ? 'Username available' : undefined}
            >
              <View style={styles.usernameRow}>
                <Text style={styles.at}>@</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={username}
                  onChangeText={text =>
                    setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                  }
                  placeholder="username"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor={T.placeholder}
                  selectionColor={T.accent}
                />
                <View style={styles.usernameIcon}>
                  {usernameStatus === 'checking' && (
                    <ActivityIndicator size="small" color={T.textMuted} />
                  )}
                  {usernameStatus === 'available' && (
                    <Ionicons name="checkmark-circle" size={18} color={T.accent} />
                  )}
                  {usernameBad && (
                    <Ionicons name="alert-circle" size={18} color={T.error} />
                  )}
                </View>
              </View>
            </Field>

            <Field label="Bio" counter={`${bio.length}/${BIO_MAX}`}>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell people about yourself"
                multiline
                maxLength={BIO_MAX}
                placeholderTextColor={T.placeholder}
                selectionColor={T.accent}
              />
            </Field>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, children, error, hint, counter }: {
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
  counter?: string;
}) {
  const T = useTheme();
  return (
    <View style={{ marginBottom: 22 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 13, color: T.textMuted }}>{label}</Text>
        {counter ? <Text style={{ fontSize: 12, color: T.textMuted, fontVariant: ['tabular-nums'] }}>{counter}</Text> : null}
      </View>
      <View
        style={{
          borderBottomWidth: error ? 1 : StyleSheet.hairlineWidth,
          borderBottomColor: error ? T.error : T.border,
        }}
      >
        {children}
      </View>
      {error ? (
        <Text style={{ fontSize: 13, color: T.error, marginTop: 6 }}>{error}</Text>
      ) : hint ? (
        <Text style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>{hint}</Text>
      ) : null}
    </View>
  );
}

function makeStyles(T: ReturnType<typeof import('../../hooks/useTheme').useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    pressed: { opacity: 0.7 },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingRight: 16,
      backgroundColor: T.bg,
    },
    iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerTitleWrap: {
      position: 'absolute', left: 0, right: 0, bottom: 0, height: 50,
      alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 17, color: T.text, fontFamily: 'SpaceGrotesk_600SemiBold' },
    savePill: {
      height: 34,
      borderRadius: 17,
      paddingHorizontal: 16,
      minWidth: 64,
      backgroundColor: T.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveText: { fontSize: 15, fontWeight: '700', color: '#000' },

    photoSection: { height: COVER_HEIGHT + AVATAR_SIZE / 2 + AVATAR_RING, marginBottom: 20 },
    cover: {
      height: COVER_HEIGHT,
      backgroundColor: T.surface2,
      overflow: 'hidden',
    },
    coverBadge: {
      position: 'absolute',
      right: 12,
      bottom: 12,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarArea: {
      position: 'absolute',
      top: COVER_HEIGHT - AVATAR_SIZE / 2 - AVATAR_RING,
      left: 16 - AVATAR_RING,
    },
    avatarRing: {
      padding: AVATAR_RING,
      borderRadius: (AVATAR_SIZE + AVATAR_RING * 2) / 2,
      backgroundColor: T.bg,
    },
    avatarBadge: {
      position: 'absolute',
      right: 2,
      bottom: 2,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: T.accent,
      borderWidth: 2,
      borderColor: T.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },

    form: { paddingHorizontal: 16 },
    input: {
      fontSize: 16,
      color: T.text,
      paddingHorizontal: 0,
      paddingTop: 6,
      paddingBottom: 10,
      minHeight: 40,
    },
    bioInput: { minHeight: 72, textAlignVertical: 'top' },
    usernameRow: { flexDirection: 'row', alignItems: 'center' },
    at: { fontSize: 16, color: T.textMuted, marginRight: 1, paddingTop: 6, paddingBottom: 10 },
    usernameIcon: { width: 24, alignItems: 'flex-end' },
  });
}
