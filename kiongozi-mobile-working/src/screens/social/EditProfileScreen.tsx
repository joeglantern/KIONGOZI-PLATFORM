import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Image, Alert, ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import apiClient from '../../utils/apiClient';

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { currentUserProfile, updateCurrentUserProfile } = useProfileStore();

  const [bio, setBio] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Pre-populate from currentUserProfile when available
  useEffect(() => {
    if (currentUserProfile) {
      setFullName(currentUserProfile.full_name || '');
      setUsername(currentUserProfile.username || '');
      setBio(currentUserProfile.bio || '');
    }
  }, [currentUserProfile]);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.image,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      if (bio) formData.append('bio', bio);
      if (username) formData.append('username', username);
      if (fullName) formData.append('full_name', fullName);
      if (avatarUri) {
        formData.append('avatar', {
          uri: avatarUri,
          type: 'image/jpeg',
          name: 'avatar.jpg'
        } as any);
      }

      const res = await apiClient.updateProfile(formData);
      if (res.success) {
        // Keep profile store in sync
        updateCurrentUserProfile({
          full_name: fullName,
          username,
          bio,
          ...(res.data?.avatar_url ? { avatar_url: res.data.avatar_url } : {}),
        });
        Alert.alert('Success', 'Profile updated!');
        navigation.goBack();
      } else {
        Alert.alert('Error', res.error || 'Failed to update profile');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#1a202c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#1a365d" /> : <Text style={styles.saveText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body}>
        {/* Avatar picker */}
        <TouchableOpacity style={styles.avatarPicker} onPress={pickAvatar}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : currentUserProfile?.avatar_url ? (
            <Image source={{ uri: currentUserProfile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="camera" size={28} color="#718096" />
              <Text style={styles.avatarHint}>Tap to change</Text>
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Fields */}
        <View style={styles.field}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your display name"
            placeholderTextColor="#a0aec0"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="@username"
            autoCapitalize="none"
            placeholderTextColor="#a0aec0"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell people about yourself..."
            multiline
            maxLength={160}
            placeholderTextColor="#a0aec0"
          />
          <Text style={styles.charCount}>{bio.length}/160</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  saveText: { color: '#1a365d', fontWeight: '700', fontSize: 16 },
  body: { flex: 1, padding: 16 },
  avatarPicker: { alignSelf: 'center', marginVertical: 16, position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center'
  },
  avatarHint: { fontSize: 11, color: '#718096', marginTop: 2 },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1a365d',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#4a5568', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8,
    padding: 12, fontSize: 15, color: '#1a202c',
  },
  bioInput: { height: 80, textAlignVertical: 'top' },
  charCount: { textAlign: 'right', color: '#a0aec0', fontSize: 12, marginTop: 4 },
});
