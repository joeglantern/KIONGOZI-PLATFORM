import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Image, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { PostInput } from '../../components/social/PostInput';
import { UserAvatar } from '../../components/social/UserAvatar';
import { useAuthStore } from '../../stores/authStore';
import { useSocialStore } from '../../stores/socialStore';
import apiClient from '../../utils/apiClient';
import { supabase } from '../../utils/supabaseClient';

interface CreatePostScreenProps {
  onClose: () => void;
  parentPostId?: string;
}

export default function CreatePostScreen({ onClose, parentPostId }: CreatePostScreenProps) {
  const { user } = useAuthStore();
  const { prependPost } = useSocialStore();
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'followers'>('public');
  const [media, setMedia] = useState<Array<{ uri: string; type: 'image' | 'video'; width?: number; height?: number; thumbnailUri?: string }>>([]);
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const canPost = content.trim().length > 0 && content.length <= 280 && !posting;

  const pickMedia = async (type: 'image' | 'video') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library in Settings.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'image' ? 'images' : 'videos',
      quality: 0.9,
      allowsMultipleSelection: true,
      selectionLimit: 4,
    });

    if (!result.canceled) {
      const newMedia = await Promise.all(result.assets.map(async a => {
        let thumbnailUri: string | undefined;
        if (type === 'video') {
          try {
            const thumb = await VideoThumbnails.getThumbnailAsync(a.uri, { time: 0 });
            thumbnailUri = thumb.uri;
          } catch {}
        }
        return { uri: a.uri, type: type as 'image' | 'video', width: a.width, height: a.height, thumbnailUri };
      }));
      setMedia(prev => [...prev, ...newMedia].slice(0, 4));
    }
  };

  const removeMedia = (index: number) => {
    setMedia(prev => prev.filter((_, i) => i !== index));
  };

  const uploadMedia = async (): Promise<{ uploaded: Array<{ url: string; storage_path: string; media_type: string }>; lastError?: string }> => {
    const uploaded: Array<{ url: string; storage_path: string; media_type: string }> = [];
    let lastError: string | undefined;
    setUploading(true);

    for (const m of media) {
      try {
        const uriParts = m.uri.split('.');
        const ext = uriParts[uriParts.length - 1]?.toLowerCase() || (m.type === 'image' ? 'jpg' : 'mp4');
        const mimeType = m.type === 'image'
          ? (ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg')
          : (ext === 'mov' ? 'video/quicktime' : 'video/mp4');

        const storagePath = `posts/${user!.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        // Read file as ArrayBuffer using XHR (works with file:// URIs in React Native)
        const fileBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', m.uri);
          xhr.responseType = 'arraybuffer';
          xhr.onload = () => resolve(xhr.response);
          xhr.onerror = () => reject(new Error('Failed to read file from device'));
          xhr.send();
        });

        const { error } = await supabase.storage
          .from('social-media')
          .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: false });

        if (error) throw new Error(error.message);

        const { data: urlData } = supabase.storage
          .from('social-media')
          .getPublicUrl(storagePath);

        uploaded.push({ url: urlData.publicUrl, storage_path: storagePath, media_type: m.type, width: m.width, height: m.height });
      } catch (e: any) {
        lastError = e?.message || 'Upload error';
        console.error('Upload error:', e);
      }
    }

    setUploading(false);
    return { uploaded, lastError };
  };

  const handlePost = async () => {
    if (!canPost) return;
    setPosting(true);

    try {
      let uploadedMedia: any[] = [];
      if (media.length > 0) {
        const { uploaded, lastError } = await uploadMedia();
        // If ALL uploads failed, block posting and show the actual error
        if (uploaded.length === 0) {
          Alert.alert('Upload failed', lastError || 'Could not upload media. Please try again.');
          setPosting(false);
          return;
        }
        // If some (not all) failed, warn but continue with what succeeded
        if (uploaded.length < media.length) {
          Alert.alert('Upload warning', `${media.length - uploaded.length} file(s) failed to upload and will be skipped.`);
        }
        uploadedMedia = uploaded;
      }

      const res = await apiClient.createPost(content.trim(), uploadedMedia, parentPostId, visibility);
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
                    {m.type === 'video' ? (
                      <View style={[styles.mediaThumb, styles.videoThumb]}>
                        <Ionicons name="play-circle" size={36} color="#fff" />
                        <Text style={styles.videoLabel}>Video</Text>
                      </View>
                    ) : (
                      <Image source={{ uri: m.uri }} style={styles.mediaThumb} resizeMode="cover" />
                    )}
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

        {/* Visibility toggle */}
        <TouchableOpacity
          style={styles.visPill}
          onPress={() => setVisibility(v => v === 'public' ? 'followers' : 'public')}
        >
          <Ionicons
            name={visibility === 'public' ? 'globe-outline' : 'people-outline'}
            size={14}
            color="#1a365d"
          />
          <Text style={styles.visText}>{visibility === 'public' ? 'Everyone' : 'Followers'}</Text>
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
  videoThumb: { backgroundColor: '#1a202c', alignItems: 'center', justifyContent: 'center', gap: 4 },
  videoLabel: { color: '#fff', fontSize: 11, fontWeight: '600' },
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
  visPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
    borderWidth: 1, borderColor: '#1a365d', marginLeft: 4,
  },
  visText: { fontSize: 12, color: '#1a365d', fontWeight: '600' },
  flex: { flex: 1 },
  charCount: { fontSize: 14, color: '#a0aec0', marginRight: 4 },
  charCountWarn: { color: '#e53e3e' },
});
