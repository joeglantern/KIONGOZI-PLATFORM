import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Image, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { PostInput } from '../../components/social/PostInput';
import { UserAvatar } from '../../components/social/UserAvatar';
import { useAuthStore } from '../../stores/authStore';
import { useSocialStore } from '../../stores/socialStore';
import apiClient from '../../utils/apiClient';

interface CreatePostScreenProps {
  onClose: () => void;
  parentPostId?: string;
}

export default function CreatePostScreen({ onClose, parentPostId }: CreatePostScreenProps) {
  const { user } = useAuthStore();
  const { prependPost } = useSocialStore();
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<Array<{ uri: string; type: 'image' | 'video'; url?: string; storage_path?: string }>>([]);
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const canPost = content.trim().length > 0 && content.length <= 280 && !posting;

  const pickMedia = async (type: 'image' | 'video') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'image' ? ImagePicker.MediaType.image : ImagePicker.MediaType.video,
      quality: 0.9,
      allowsMultipleSelection: true,
      selectionLimit: 4,
    });

    if (!result.canceled) {
      const newMedia = result.assets.map(a => ({
        uri: a.uri,
        type: type as 'image' | 'video'
      }));
      setMedia(prev => [...prev, ...newMedia].slice(0, 4));
    }
  };

  const removeMedia = (index: number) => {
    setMedia(prev => prev.filter((_, i) => i !== index));
  };

  const uploadMedia = async (): Promise<Array<{ url: string; storage_path: string; media_type: string }>> => {
    const uploaded = [];
    for (const m of media) {
      try {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', {
          uri: m.uri,
          type: m.type === 'image' ? 'image/jpeg' : 'video/mp4',
          name: `upload.${m.type === 'image' ? 'jpg' : 'mp4'}`
        } as any);

        const endpoint = m.type === 'image' ? '/api/v1/upload/image' : '/api/v1/upload/video';
        const res = await apiClient.uploadFile(endpoint, formData);
        if (res.success && res.data) {
          uploaded.push({ ...res.data, media_type: m.type });
        }
      } catch (e) {
        console.error('Upload failed:', e);
      }
    }
    setUploading(false);
    return uploaded;
  };

  const handlePost = async () => {
    if (!canPost) return;
    setPosting(true);

    try {
      let uploadedMedia: any[] = [];
      if (media.length > 0) {
        uploadedMedia = await uploadMedia();
      }

      const res = await apiClient.createPost(content.trim(), uploadedMedia, parentPostId);
      if (res.success && res.data) {
        if (!parentPostId) {
          prependPost(res.data);
        }
        onClose();
      } else {
        Alert.alert('Error', res.error || 'Failed to post. Try again.');
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handlePost}
          disabled={!canPost}
          style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
        >
          {posting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.postText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.row}>
          <UserAvatar avatarUrl={undefined} size={44} />
          <View style={styles.inputContainer}>
            <PostInput
              value={content}
              onChangeText={setContent}
              autoFocus
            />

            {/* Media previews */}
            {media.length > 0 && (
              <View style={styles.mediaGrid}>
                {media.map((m, i) => (
                  <View key={i} style={styles.mediaItem}>
                    <Image source={{ uri: m.uri }} style={styles.mediaThumb} resizeMode="cover" />
                    <TouchableOpacity style={styles.removeMedia} onPress={() => removeMedia(i)}>
                      <Ionicons name="close-circle" size={22} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {uploading && (
              <View style={styles.uploadingRow}>
                <ActivityIndicator size="small" color="#1a365d" />
                <Text style={styles.uploadingText}>Uploading media...</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => pickMedia('image')} style={styles.toolbarBtn}>
          <Ionicons name="image-outline" size={24} color="#1a365d" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => pickMedia('video')} style={styles.toolbarBtn}>
          <Ionicons name="videocam-outline" size={24} color="#1a365d" />
        </TouchableOpacity>
        <View style={styles.flex} />
        <Text style={[styles.charCount, content.length > 260 && styles.charCountWarn]}>
          {280 - content.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  cancelBtn: { padding: 4 },
  cancelText: { fontSize: 16, color: '#4a5568' },
  postBtn: {
    backgroundColor: '#1a365d',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  postBtnDisabled: { backgroundColor: '#a0aec0' },
  postText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  body: { flex: 1 },
  row: { flexDirection: 'row', padding: 16, gap: 12 },
  inputContainer: { flex: 1 },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  mediaItem: { position: 'relative' },
  mediaThumb: { width: 100, height: 100, borderRadius: 8 },
  removeMedia: { position: 'absolute', top: -6, right: -6 },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  uploadingText: { color: '#718096', fontSize: 13 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
    padding: 12,
    paddingBottom: 28,
  },
  toolbarBtn: { padding: 8 },
  flex: { flex: 1 },
  charCount: { fontSize: 14, color: '#a0aec0', marginRight: 4 },
  charCountWarn: { color: '#e53e3e' },
});
