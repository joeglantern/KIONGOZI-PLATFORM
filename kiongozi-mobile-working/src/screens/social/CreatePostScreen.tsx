import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, Keyboard,
  ScrollView, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserAvatar } from '../../components/social/UserAvatar';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import { useSocialStore } from '../../stores/socialStore';
import apiClient from '../../utils/apiClient';
import { supabase } from '../../utils/supabaseClient';
import { useTheme } from '../../hooks/useTheme';
import { BottomSheet } from '../../components/social/BottomSheet';

interface CreatePostScreenProps {
  onClose: () => void;
  parentPostId?: string;
}

type MediaItem = { uri: string; type: 'image' | 'video'; width?: number; height?: number; thumbnailUri?: string };
type MentionUser = { id: string; username: string; full_name: string; avatar_url?: string };

const MAX_CHARS = 280;
const WARN_AT = 240;
const MAX_MEDIA = 4;
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const THUMB_H = 180;

export default function CreatePostScreen({ onClose, parentPostId }: CreatePostScreenProps) {
  const { user } = useAuthStore();
  const { currentUserProfile } = useProfileStore();
  const { prependPost } = useSocialStore();
  const T = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(T), [T]);
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'followers'>('public');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [discardSheet, setDiscardSheet] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // @mention autocomplete
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s = Keyboard.addListener(showEvt, () => setKeyboardOpen(true));
    const h = Keyboard.addListener(hideEvt, () => setKeyboardOpen(false));
    return () => {
      s.remove();
      h.remove();
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const canPost = content.trim().length > 0 && content.length <= MAX_CHARS && !posting;
  const displayName = currentUserProfile?.full_name || (user as any)?.full_name || 'You';
  const handle = currentUserProfile?.username || (user as any)?.username;

  const handleChangeText = (text: string) => {
    setContent(text);
    const match = text.match(/@(\w*)$/);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (match && match[1].length >= 1) {
      const query = match[1];
      searchTimer.current = setTimeout(async () => {
        try {
          const res = await apiClient.searchSocial(query);
          const users = (res.data as any)?.users as MentionUser[] | undefined;
          if (res.success && users) {
            setSuggestions(users.slice(0, 5));
          }
        } catch {}
      }, 300);
    } else {
      setSuggestions([]);
    }
  };

  const insertMention = (username: string) => {
    setContent(prev => prev.replace(/@\w*$/, `@${username} `));
    setSuggestions([]);
  };

  const addAssets = async (assets: ImagePicker.ImagePickerAsset[], type: 'image' | 'video') => {
    const oversized = assets.filter(a => a.fileSize && a.fileSize > MAX_BYTES);
    if (oversized.length > 0) {
      Alert.alert('File too large', `${oversized.length} file(s) exceed 8 MB and cannot be uploaded.`);
    }
    const validAssets = assets.filter(a => !a.fileSize || a.fileSize <= MAX_BYTES);
    if (validAssets.length === 0) return;

    const newMedia = await Promise.all(validAssets.map(async a => {
      let thumbnailUri: string | undefined;
      if (type === 'video') {
        try {
          const thumb = await VideoThumbnails.getThumbnailAsync(a.uri, { time: 0 });
          thumbnailUri = thumb.uri;
        } catch {}
      }
      return { uri: a.uri, type, width: a.width, height: a.height, thumbnailUri };
    }));
    setMedia(prev => [...prev, ...newMedia].slice(0, MAX_MEDIA));
  };

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
      selectionLimit: MAX_MEDIA,
    });

    if (!result.canceled) await addAssets(result.assets, type);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow camera access in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.9 });
    if (!result.canceled) await addAssets(result.assets, 'image');
  };

  const removeMedia = (index: number) => {
    setMedia(prev => prev.filter((_, i) => i !== index));
  };

  const uploadMedia = async (): Promise<{ uploaded: Array<{ url: string; storage_path: string; media_type: string }>; lastError?: string }> => {
    const uploaded: Array<{ url: string; storage_path: string; media_type: string; width?: number; height?: number }> = [];
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPosting(true);

    try {
      let uploadedMedia: any[] = [];
      if (media.length > 0) {
        const { uploaded, lastError } = await uploadMedia();
        // Block posting if any uploads failed
        if (uploaded.length < media.length) {
          Alert.alert('Upload failed', lastError || `${media.length - uploaded.length} file(s) could not be uploaded. Please try again.`);
          setPosting(false);
          return;
        }
        uploadedMedia = uploaded;
      }

      const res = await apiClient.createPost(content.trim(), uploadedMedia, parentPostId, visibility);
      if (res.success && res.data) {
        if (!parentPostId) {
          prependPost(res.data as any);
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

  const handleCancel = () => {
    if (content.trim().length > 0 || media.length > 0) {
      Keyboard.dismiss();
      setDiscardSheet(true);
    } else {
      onClose();
    }
  };

  const mediaFull = media.length >= MAX_MEDIA;
  const remaining = MAX_CHARS - content.length;
  const over = remaining < 0;
  const isPublic = visibility === 'public';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4, height: insets.top + 4 + 50 }]}>
        <Pressable
          onPress={handleCancel}
          hitSlop={8}
          style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <View style={styles.headerTitleWrap} pointerEvents="none">
          <Text style={styles.headerTitle}>{parentPostId ? 'Reply' : 'New post'}</Text>
        </View>
        <Pressable
          onPress={handlePost}
          disabled={!canPost}
          hitSlop={6}
          style={({ pressed }) => [styles.postBtn, !canPost && !posting && styles.disabled, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canPost }}
        >
          {posting ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.postText}>Post</Text>
          )}
        </Pressable>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
        <View style={styles.row}>
          {/* Avatar + thread connector */}
          <View style={styles.rail}>
            <UserAvatar avatarUrl={currentUserProfile?.avatar_url} size={40} />
            <View style={styles.connector} />
          </View>

          <View style={styles.main}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
              {handle ? <Text style={styles.handle} numberOfLines={1}>@{handle}</Text> : null}
            </View>

            <TextInput
              value={content}
              onChangeText={handleChangeText}
              placeholder={parentPostId ? 'Post your reply' : "What's happening?"}
              placeholderTextColor={T.placeholder}
              multiline
              maxLength={MAX_CHARS + 10}
              autoFocus
              style={styles.input}
              selectionColor={T.accent}
            />

            {suggestions.length > 0 && (
              <View style={styles.suggestions}>
                {suggestions.map(u => (
                  <Pressable
                    key={u.id}
                    onPress={() => insertMention(u.username)}
                    style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
                  >
                    <UserAvatar avatarUrl={u.avatar_url} size={28} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggestionName} numberOfLines={1}>{u.full_name}</Text>
                      <Text style={styles.suggestionHandle} numberOfLines={1}>@{u.username}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Media previews */}
            {media.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.mediaScroll}
                contentContainerStyle={styles.mediaRow}
                keyboardShouldPersistTaps="handled"
              >
                {media.map((m, i) => {
                  const ratio = (m.width && m.height) ? Math.min(Math.max(m.width / m.height, 0.6), 1.6) : 0.8;
                  const src = m.type === 'video' ? m.thumbnailUri : m.uri;
                  return (
                    <View key={`${m.uri}-${i}`} style={[styles.thumb, { width: THUMB_H * ratio }]}>
                      {src ? (
                        <Image source={{ uri: src }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                      ) : null}
                      {m.type === 'video' && (
                        <View style={styles.playBadge} pointerEvents="none">
                          <Ionicons name="play" size={16} color="#fff" />
                        </View>
                      )}
                      <Pressable
                        onPress={() => removeMedia(i)}
                        hitSlop={10}
                        style={({ pressed }) => [styles.removeBadge, pressed && styles.pressed]}
                        accessibilityLabel="Remove media"
                      >
                        <Ionicons name="close" size={16} color="#fff" />
                      </Pressable>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {uploading && (
              <View style={styles.uploadingRow}>
                <ActivityIndicator size="small" color={T.textMuted} />
                <Text style={styles.uploadingText}>Uploading media…</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Toolbar — sits above the keyboard */}
      <View style={[styles.toolbar, { paddingBottom: keyboardOpen ? 6 : Math.max(insets.bottom, 8) }]}>
        <ToolButton icon="image-outline" onPress={() => pickMedia('image')} disabled={mediaFull} color={T.textSub} label="Add photos" />
        <ToolButton icon="camera-outline" onPress={takePhoto} disabled={mediaFull} color={T.textSub} label="Take a photo" />
        <ToolButton icon="videocam-outline" onPress={() => pickMedia('video')} disabled={mediaFull} color={T.textSub} label="Add video" />

        <Pressable
          style={({ pressed }) => [styles.visPill, pressed && styles.pressed]}
          onPress={() => setVisibility(v => v === 'public' ? 'followers' : 'public')}
          accessibilityRole="button"
          accessibilityLabel={isPublic ? 'Visible to everyone. Tap to limit to followers' : 'Visible to followers. Tap to make public'}
        >
          <Ionicons name={isPublic ? 'globe-outline' : 'people-outline'} size={14} color={T.textSub} />
          <Text style={styles.visText} numberOfLines={1}>{isPublic ? 'Everyone can see' : 'Followers only'}</Text>
        </Pressable>

        <View style={styles.flex} />

        {content.length > 0 && (
          <View style={styles.counterWrap}>
            {content.length > WARN_AT && (
              <Text style={[styles.counterText, over && { color: T.error }]}>{remaining}</Text>
            )}
            <CharRing
              progress={Math.min(content.length / MAX_CHARS, 1)}
              color={over ? T.error : content.length > WARN_AT ? T.textSub : T.accent}
              track={T.border}
              bg={T.bg}
            />
          </View>
        )}
      </View>

      <BottomSheet
        visible={discardSheet}
        onClose={() => setDiscardSheet(false)}
        title="Discard draft?"
        subtitle="Your post will not be saved."
        actions={[
          { icon: 'trash-outline', label: 'Discard', onPress: onClose, destructive: true },
        ]}
      />
    </KeyboardAvoidingView>
  );
}

function ToolButton({ icon, onPress, disabled, color, label }: {
  icon: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean; color: string; label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Ionicons name={icon} size={22} color={color} />
    </Pressable>
  );
}

/** Progress ring built from two clipped half-discs (no SVG needed). */
function CharRing({ progress, color, track, bg, size = 22, stroke = 2.5 }: {
  progress: number; color: string; track: string; bg: string; size?: number; stroke?: number;
}) {
  const angle = progress * 360;
  const half = size / 2;
  const right = Math.min(angle, 180);
  const left = Math.max(angle - 180, 0);
  return (
    <View style={{ width: size, height: size, borderRadius: half, backgroundColor: track, overflow: 'hidden' }}>
      {/* Right half: reveals 12 → 6 o'clock */}
      <View style={{ position: 'absolute', left: half, top: 0, width: half, height: size, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: -half, top: 0, width: size, height: size, transform: [{ rotate: `${right}deg` }] }}>
          <View style={{ width: half, height: size, backgroundColor: color, borderTopLeftRadius: half, borderBottomLeftRadius: half }} />
        </View>
      </View>
      {/* Left half: reveals 6 → 12 o'clock */}
      <View style={{ position: 'absolute', left: 0, top: 0, width: half, height: size, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, transform: [{ rotate: `${left}deg` }] }}>
          <View style={{ marginLeft: half, width: half, height: size, backgroundColor: color, borderTopRightRadius: half, borderBottomRightRadius: half }} />
        </View>
      </View>
      <View
        style={{
          position: 'absolute', left: stroke, top: stroke,
          width: size - stroke * 2, height: size - stroke * 2,
          borderRadius: (size - stroke * 2) / 2, backgroundColor: bg,
        }}
      />
    </View>
  );
}

function makeStyles(T: ReturnType<typeof import('../../hooks/useTheme').useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    pressed: { opacity: 0.7 },
    disabled: { opacity: 0.4 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      backgroundColor: T.bg,
    },
    cancelBtn: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
    cancelText: { fontSize: 16, color: T.text },
    headerTitleWrap: {
      position: 'absolute', left: 0, right: 0, bottom: 0, height: 50,
      alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 17, color: T.text, fontFamily: 'SpaceGrotesk_600SemiBold' },
    postBtn: {
      height: 34,
      borderRadius: 17,
      paddingHorizontal: 16,
      minWidth: 64,
      backgroundColor: T.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    postText: { color: '#000', fontWeight: '700', fontSize: 15 },
    body: { flex: 1 },
    bodyContent: { paddingBottom: 24 },
    row: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 12 },
    rail: { width: 40, alignItems: 'center' },
    connector: { width: 2, flex: 1, minHeight: 24, borderRadius: 1, backgroundColor: T.border, marginTop: 8 },
    main: { flex: 1, minWidth: 0 },
    nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
    name: { fontSize: 15, fontWeight: '700', color: T.text, flexShrink: 1 },
    handle: { fontSize: 14, color: T.textMuted, flexShrink: 1 },
    input: {
      fontSize: 17,
      lineHeight: 24,
      color: T.text,
      minHeight: 72,
      textAlignVertical: 'top',
      paddingTop: 4,
      paddingBottom: 8,
      paddingHorizontal: 0,
    },
    suggestions: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: T.border,
      borderRadius: 14,
      backgroundColor: T.surface,
      overflow: 'hidden',
      marginBottom: 8,
    },
    suggestion: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 48,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    suggestionName: { fontSize: 14, fontWeight: '600', color: T.text },
    suggestionHandle: { fontSize: 13, color: T.textMuted },
    mediaScroll: { marginTop: 4, marginRight: -16 },
    mediaRow: { gap: 8, paddingRight: 16 },
    thumb: {
      height: THUMB_H,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: T.surface2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: T.border,
    },
    playBadge: {
      position: 'absolute',
      left: 10,
      bottom: 10,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingLeft: 2,
    },
    removeBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    uploadingText: { color: T.textMuted, fontSize: 13 },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingTop: 4,
      backgroundColor: T.bg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: T.borderLight,
    },
    visPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      height: 32,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: T.border,
      marginLeft: 4,
      flexShrink: 1,
    },
    visText: { fontSize: 13, color: T.textSub, fontWeight: '600' },
    flex: { flex: 1 },
    counterWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, minHeight: 44 },
    counterText: { fontSize: 13, color: T.textMuted, fontVariant: ['tabular-nums'] },
  });
}
