import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useProfileStore } from '../../stores/profileStore';
import { UserAvatar } from '../../components/social/UserAvatar';
import apiClient from '../../utils/apiClient';

const COVER_HEIGHT = 140;
const AVATAR_SIZE = 80;

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const { currentUserProfile, updateCurrentUserProfile } = useProfileStore();

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header bar ───────────────────────────────────────────────── */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color="#1a202c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.headerBtn}>
          {saving ? (
            <ActivityIndicator size="small" color="#1a365d" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* ── Cover + Avatar section ────────────────────────────────── */}
        <View style={styles.photoSection}>
          {/* Cover */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => pickImage('banner')}
            style={styles.cover}
          >
            {bannerSource ? (
              <Image source={bannerSource} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            ) : null}
            <View style={styles.coverTint} />
            <View style={styles.coverCameraHint}>
              <Ionicons name="camera-outline" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.coverCameraText}>Change cover</Text>
            </View>
          </TouchableOpacity>

          {/* Avatar overlapping cover */}
          <View style={styles.avatarArea}>
            <View style={styles.avatarBorder}>
              <UserAvatar
                avatarUrl={avatarUrl}
                size={AVATAR_SIZE}
                editable
                onPress={() => pickImage('avatar')}
              />
            </View>
          </View>
        </View>

        {/* ── Form fields ──────────────────────────────────────────── */}
        <View style={styles.form}>
          <Field label="Display Name">
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your display name"
              placeholderTextColor="#a0aec0"
            />
          </Field>

          <Field label="Username">
            <View style={styles.usernameRow}>
              <TextInput
                style={[
                  styles.input,
                  { flex: 1 },
                  (usernameStatus === 'taken' || usernameStatus === 'reserved') && styles.inputError,
                  usernameStatus === 'available' && styles.inputSuccess,
                ]}
                value={username}
                onChangeText={text =>
                  setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                }
                placeholder="username"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#a0aec0"
              />
              <View style={styles.usernameIcon}>
                {usernameStatus === 'checking' && (
                  <ActivityIndicator size="small" color="#a0aec0" />
                )}
                {usernameStatus === 'available' && (
                  <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                )}
                {(usernameStatus === 'taken' || usernameStatus === 'reserved') && (
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                )}
              </View>
            </View>
            {(usernameStatus === 'taken' || usernameStatus === 'reserved') && (
              <Text style={styles.fieldError}>
                {usernameStatus === 'reserved' ? 'That username is reserved' : 'Username already taken'}
              </Text>
            )}
          </Field>

          <Field label="Bio">
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people about yourself…"
              multiline
              maxLength={160}
              placeholderTextColor="#a0aec0"
            />
            <Text style={styles.charCount}>{bio.length}/160</Text>
          </Field>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  // Header bar
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  headerBtn: { padding: 8, minWidth: 48, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a202c' },
  saveText: { fontSize: 16, fontWeight: '700', color: '#1a365d' },

  // Photo section
  photoSection: { marginBottom: AVATAR_SIZE / 2 + 8 },
  cover: {
    height: COVER_HEIGHT,
    backgroundColor: '#1a365d',
    overflow: 'hidden',
  },
  coverTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  coverCameraHint: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.38)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  coverCameraText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '500',
  },
  avatarArea: {
    position: 'absolute',
    bottom: -(AVATAR_SIZE / 2),
    left: 20,
  },
  avatarBorder: {
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: (AVATAR_SIZE + 6) / 2,
  },

  // Form
  form: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  fieldWrap: { marginBottom: 20 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#718096',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1a202c',
    backgroundColor: '#f7fafc',
  },
  inputError: { borderColor: '#ef4444' },
  inputSuccess: { borderColor: '#22c55e' },
  bioInput: { minHeight: 90, textAlignVertical: 'top' },
  charCount: { textAlign: 'right', color: '#a0aec0', fontSize: 12, marginTop: 4 },
  usernameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  usernameIcon: { width: 24, alignItems: 'center' },
  fieldError: { fontSize: 12, color: '#ef4444', marginTop: 4 },
});
