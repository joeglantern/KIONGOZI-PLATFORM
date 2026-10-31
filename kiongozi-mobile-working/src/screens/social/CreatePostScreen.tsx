import { EASE_OUT } from '../../theme/motion';
import { appAlert } from '../../utils/alert';
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, Keyboard, ScrollView, Image, ActivityIndicator, KeyboardAvoidingView, Platform, useWindowDimensions, LayoutChangeEvent,
  ImageSourcePropType,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence, FadeIn, FadeOut,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserAvatar } from '../../components/social/UserAvatar';
import { ComposerMedia, ComposerMediaItem, UploadStatus } from '../../components/social/ComposerMedia';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import { useSocialStore } from '../../stores/socialStore';
import apiClient from '../../utils/apiClient';
import { supabase } from '../../utils/supabaseClient';
import { useTheme } from '../../hooks/useTheme';
import { BottomSheet } from '../../components/social/BottomSheet';
import { ComposerPoll, ComposerPollValue, PollToolIcon, newPoll, pollChoices } from '../../components/social/ComposerPoll';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { prefs, pickerQuality } from '../../stores/prefsStore';

type Uploaded = { url: string; storage_path: string; media_type: string; width?: number; height?: number };

interface CreatePostScreenProps {
  onClose: () => void;
  parentPostId?: string;
}

type MediaItem = ComposerMediaItem;
type MentionUser = { id: string; username: string; full_name: string; avatar_url?: string };

const MAX_CHARS = 280;
const WARN_AT = 240;
const MAX_MEDIA = 4;
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const SIDE = 16;
const HEADER_H = 52;

const ICONS: Record<'gallery' | 'camera' | 'video' | 'everyone' | 'followers', ImageSourcePropType> = {
  gallery: require('../../../assets/composer/gallery.png'),
  camera: require('../../../assets/composer/camera.png'),
  video: require('../../../assets/composer/video.png'),
  everyone: require('../../../assets/composer/everyone.png'),
  followers: require('../../../assets/composer/followers.png'),
};

const HINTS = ["What's happening?", 'Share something…', "What's on your mind?", 'Got a thought? Drop it here…'];

const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
const newId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export default function CreatePostScreen({ onClose, parentPostId }: CreatePostScreenProps) {
  const { user } = useAuthStore();
  const { currentUserProfile } = useProfileStore();
  const { prependPost } = useSocialStore();
  const T = useTheme();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(T), [T]);
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'followers'>('public');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [poll, setPoll] = useState<ComposerPollValue | null>(null);
  const [posting, setPosting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<Record<string, UploadStatus | undefined>>({});
  const [discardSheet, setDiscardSheet] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [hint] = useState(() => HINTS[Math.floor(Math.random() * HINTS.length)]);

  // ── Draft (X / Instagram): text saves itself as you type and comes back next time ──
  const DRAFT_KEY = `kchat.draft.post.${parentPostId || 'new'}`;
  const draftReady = useRef(false);
  const posted = useRef(false);
  const skipDraft = useRef(false);
  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY).then(v => {
      if (v) {
        try {
          const d = JSON.parse(v);
          if (typeof d?.content === 'string') setContent(c => c || d.content);
          if (d?.visibility === 'followers') setVisibility('followers');
        } catch {}
      }
    }).catch(() => {}).finally(() => { draftReady.current = true; });
  }, [DRAFT_KEY]);
  useEffect(() => {
    if (!draftReady.current || posted.current || skipDraft.current) return;
    const t = setTimeout(() => {
      if (posted.current || skipDraft.current) return;
      if (content.trim()) AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ content, visibility })).catch(() => {});
      else AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [content, visibility, DRAFT_KEY]);

  // ── Upload while you write (Instagram): photos start uploading the moment they're picked,
  // quietly, so pressing Post only sends the text. Skipped in low-data mode.
  const uploads = useRef<Record<string, Promise<Uploaded | null>>>({});
  const uploadedPaths = useRef<Record<string, string>>({});

  // @mention autocomplete
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const viewportH = useRef(0);
  const inputTop = useRef(0);
  const inputH = useRef(0);
  const caretAtEnd = useRef(true);

  // ── Keyboard ────────────────────────────────────────────────────────────────
  // iOS: KeyboardAvoidingView (padding) lifts the whole column; we only swap the
  // toolbar's safe-area padding. Android (edge-to-edge, inside a Modal): the window
  // is usually NOT resized, so we add a spacer equal to the keyboard overlap. The
  // overlap is computed against the root's measured height so that, if the window
  // DOES resize, the spacer collapses to 0 instead of double-counting.
  const [kbHeight, setKbHeight] = useState(0);
  const [rootH, setRootH] = useState(0);
  const fullH = useRef(0);
  const rootW = useRef(0);
  const androidPad = useSharedValue(0);

  const ensureCaretVisible = useCallback((contentH?: number) => {
    if (!caretAtEnd.current || viewportH.current <= 0) return;
    const bottom = inputTop.current + (contentH ?? inputH.current) + 16;
    if (bottom > scrollY.current + viewportH.current) {
      scrollRef.current?.scrollTo({ y: bottom - viewportH.current, animated: true });
    }
  }, []);

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const showEvt = ios ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = ios ? 'keyboardWillHide' : 'keyboardDidHide';
    const s = Keyboard.addListener(showEvt, e => {
      setKeyboardOpen(true);
      setKbHeight(e.endCoordinates?.height ?? 0);
      setTimeout(() => ensureCaretVisible(), ios ? 280 : 120);
    });
    const h = Keyboard.addListener(hideEvt, () => {
      setKeyboardOpen(false);
      setKbHeight(0);
    });
    // autoFocus is unreliable inside an Android Modal while it slides in.
    const focusTimer = setTimeout(() => inputRef.current?.focus(), Platform.OS === 'android' ? 350 : 0);
    return () => {
      s.remove();
      h.remove();
      clearTimeout(focusTimer);
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [ensureCaretVisible]);

  const onRootLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - rootW.current) > 1) {
      rootW.current = width;
      fullH.current = height;
    } else {
      fullH.current = Math.max(fullH.current, height);
    }
    setRootH(height);
  };

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const shrunk = Math.max(0, fullH.current - rootH);
    const target = keyboardOpen ? Math.max(0, kbHeight + insets.bottom - shrunk) : 0;
    androidPad.value = withTiming(target, { duration: keyboardOpen ? 220 : 180 });
  }, [keyboardOpen, kbHeight, rootH, insets.bottom, androidPad]);

  const androidSpacer = useAnimatedStyle(() => ({ height: androidPad.value }));

  // ── Derived ─────────────────────────────────────────────────────────────────
  const canPost = content.trim().length > 0 && content.length <= MAX_CHARS && !posting && (!poll || !!pollChoices(poll));
  const displayName = currentUserProfile?.full_name || (user as any)?.full_name || 'You';
  const handle = currentUserProfile?.username || (user as any)?.username;
  const contentW = Math.max(200, winW - SIDE * 2);
  // Toolbar at 320: pad 24 + tools 3x46-6 (132) + counter "-12"+ring (62) + chip 6+24+6+"Followers"~64+12 (+6 margin = 118)
  // = 336 > 320. Narrow screens use 40-wide tool buttons (-18) and drop the chip label while the
  // warning counter is visible: 24 + 114 + 62 + 42 = 242.
  // The poll button adds a fourth tool, so phones under 400 wide use the compact tools.
  const narrow = winW < (parentPostId ? 360 : 400);

  // Post button gives a small press when it becomes enabled.
  const postScale = useSharedValue(1);
  const prevCanPost = useRef(canPost);
  useEffect(() => {
    if (canPost && !prevCanPost.current) {
      postScale.value = withSequence(
        withTiming(0.9, { duration: 70 }),
        withTiming(1, { duration: 200, easing: EASE_OUT }),
      );
    }
    prevCanPost.current = canPost;
  }, [canPost, postScale]);
  const postAnim = useAnimatedStyle(() => ({ transform: [{ scale: postScale.value }] }));

  // ── Text / mentions ─────────────────────────────────────────────────────────
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
    Haptics.selectionAsync().catch(() => {});
  };

  // ── Media ───────────────────────────────────────────────────────────────────
  const addAssets = async (assets: ImagePicker.ImagePickerAsset[], type: 'image' | 'video') => {
    const oversized = assets.filter(a => a.fileSize && a.fileSize > MAX_BYTES);
    if (oversized.length > 0) {
      appAlert('File too large', `${oversized.length} file(s) exceed 8 MB and cannot be uploaded.`);
    }
    const validAssets = assets.filter(a => !a.fileSize || a.fileSize <= MAX_BYTES);
    if (validAssets.length === 0) return;

    const newMedia = await Promise.all(validAssets.map(async (a): Promise<MediaItem> => {
      let thumbnailUri: string | undefined;
      let previewRatio: number | undefined;
      if (type === 'video') {
        try {
          const thumb = await VideoThumbnails.getThumbnailAsync(a.uri, { time: 0 });
          thumbnailUri = thumb.uri;
          // Thumbnails are correctly oriented; picker dims can ignore rotation.
          if (thumb.width && thumb.height) previewRatio = thumb.width / thumb.height;
        } catch {}
      }
      return {
        id: newId(),
        uri: a.uri,
        type,
        width: a.width,
        height: a.height,
        thumbnailUri,
        previewRatio,
        durationMs: type === 'video' && a.duration ? a.duration : undefined,
      };
    }));
    const room = Math.max(0, MAX_MEDIA - media.length);
    setMedia(prev => [...prev, ...newMedia].slice(0, MAX_MEDIA));
    if (!prefs().lowData) newMedia.slice(0, room).forEach(m => { startUpload(m); });
    tap();
  };

  const pickMedia = async (type: 'image' | 'video') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      appAlert('Permission required', 'Please allow access to your photo library in Settings.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'image' ? 'images' : 'videos',
      quality: pickerQuality(), // Settings > Storage and data > Media upload quality
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, MAX_MEDIA - media.length),
    });

    if (!result.canceled) await addAssets(result.assets, type);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      appAlert('Permission required', 'Please allow camera access in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: pickerQuality() });
    if (!result.canceled) await addAssets(result.assets, 'image');
  };

  // Files uploaded for media the person removed (or a post they abandoned) are deleted,
  // so storage never fills with orphans.
  const dropUploaded = (ids: string[]) => {
    const paths = ids.map(id => uploadedPaths.current[id]).filter(Boolean);
    ids.forEach(id => { delete uploadedPaths.current[id]; delete uploads.current[id]; });
    if (paths.length) supabase.storage.from('social-media').remove(paths).catch(() => {});
  };
  useEffect(() => () => { if (!posted.current) dropUploaded(Object.keys(uploadedPaths.current)); }, []);

  const removeMedia = (id: string) => {
    tap();
    setMedia(prev => prev.filter(m => m.id !== id));
    setUploadStatus(prev => ({ ...prev, [id]: undefined }));
    const p = uploads.current[id];
    delete uploads.current[id];
    if (uploadedPaths.current[id]) dropUploaded([id]);
    else p?.then(() => dropUploaded([id]));
  };

  const uploadOne = async (m: MediaItem): Promise<Uploaded> => {
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

        uploadedPaths.current[m.id] = storagePath;
        return { url: urlData.publicUrl, storage_path: storagePath, media_type: m.type, width: m.width, height: m.height };
  };

  const startUpload = (m: MediaItem) => {
    const existing: Promise<Uploaded | null> | undefined = uploads.current[m.id];
    if (existing) return existing;
    setUploadStatus(prev => ({ ...prev, [m.id]: 'uploading' }));
    const p = uploadOne(m)
      .then(u => { setUploadStatus(prev => ({ ...prev, [m.id]: 'done' })); return u; })
      .catch((e: any) => {
        console.error('Upload error:', e);
        delete uploads.current[m.id];
        setUploadStatus(prev => ({ ...prev, [m.id]: 'error' }));
        return null;
      });
    uploads.current[m.id] = p;
    return p;
  };

  const uploadMedia = async (): Promise<{ uploaded: Uploaded[]; lastError?: string }> => {
    // Reuse uploads already running/finished; start (or retry once) anything that isn't
    const results = await Promise.all(media.map(async m => (await startUpload(m)) || (await startUpload(m))));
    const uploaded = results.filter(Boolean) as Uploaded[];
    return { uploaded, lastError: uploaded.length < media.length ? 'Some files could not be uploaded.' : undefined };
  };

  const handlePost = async () => {
    if (!canPost) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setPosting(true);

    try {
      let uploadedMedia: any[] = [];
      if (media.length > 0) {
        const { uploaded, lastError } = await uploadMedia();
        // Block posting if any uploads failed
        if (uploaded.length < media.length) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
          appAlert('Upload failed', lastError || `${media.length - uploaded.length} file(s) could not be uploaded. Please try again.`);
          setPosting(false);
          return;
        }
        uploadedMedia = uploaded;
      }

      const choices = pollChoices(poll);
      const res = poll && choices
        ? await apiClient.createPollPost(content.trim(), choices, poll.hours, visibility)
        : await apiClient.createPost(content.trim(), uploadedMedia, parentPostId, visibility);
      if (res.success && res.data) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        posted.current = true;
        AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
        if (!parentPostId) {
          prependPost(res.data as any);
        }
        onClose();
      } else {
        setUploadStatus({});
        appAlert('Error', res.error || 'Failed to post. Try again.');
      }
    } catch (e) {
      setUploadStatus({});
      appAlert('Error', 'Something went wrong. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleCancel = () => {
    if (content.trim().length > 0 || media.length > 0 || poll) {
      Keyboard.dismiss();
      setDiscardSheet(true);
    } else {
      onClose();
    }
  };

  const toggleVisibility = () => {
    Haptics.selectionAsync().catch(() => {});
    setVisibility(v => (v === 'public' ? 'followers' : 'public'));
  };

  const mediaFull = media.length >= MAX_MEDIA;
  const toolsDisabled = mediaFull || posting || !!poll;
  const remaining = MAX_CHARS - content.length;
  const over = remaining < 0;
  const isPublic = visibility === 'public';
  const isIOS = Platform.OS === 'ios';

  return (
    <View style={styles.container} onLayout={onRootLayout}>
      <KeyboardAvoidingView style={styles.flex} behavior={isIOS ? 'padding' : undefined} enabled={isIOS}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top, height: insets.top + HEADER_H }]}>
          <Pressable
            onPress={handleCancel}
            hitSlop={8}
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.cancelText} numberOfLines={1} maxFontSizeMultiplier={1.3}>Cancel</Text>
          </Pressable>
          <View style={styles.headerTitleWrap} pointerEvents="none">
            <Text style={styles.headerTitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>{parentPostId ? 'Reply' : 'New post'}</Text>
          </View>
          <Animated.View style={[postAnim, { opacity: canPost || posting ? 1 : 0.35 }]}>
            <Pressable
              onPress={handlePost}
              disabled={!canPost}
              hitSlop={8}
              style={({ pressed }) => [styles.postBtn, pressed && { transform: [{ scale: 0.94 }] }]}
              accessibilityRole="button"
              accessibilityLabel={parentPostId ? 'Post reply' : 'Post'}
              accessibilityState={{ disabled: !canPost, busy: posting }}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0)']}
                style={styles.postGloss}
                pointerEvents="none"
              />
              {posting ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.postText} numberOfLines={1} maxFontSizeMultiplier={1.3}>Post</Text>
              )}
            </Pressable>
          </Animated.View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          onLayout={e => { viewportH.current = e.nativeEvent.layout.height; }}
          onScroll={e => { scrollY.current = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={32}
        >
          <View style={styles.identity}>
            <UserAvatar avatarUrl={currentUserProfile?.avatar_url} size={40} />
            <View style={styles.identityText}>
              <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
              {handle ? <Text style={styles.handle} numberOfLines={1}>@{handle}</Text> : null}
            </View>
          </View>

          <View
            onLayout={e => {
              inputTop.current = e.nativeEvent.layout.y;
              inputH.current = e.nativeEvent.layout.height;
            }}
          >
            <TextInput
              ref={inputRef}
              value={content}
              onChangeText={handleChangeText}
              onSelectionChange={e => {
                caretAtEnd.current = e.nativeEvent.selection.end >= content.length - 1;
              }}
              onContentSizeChange={e => ensureCaretVisible(e.nativeEvent.contentSize.height)}
              placeholder={parentPostId ? 'Post your reply' : poll ? 'Ask a question' : hint}
              placeholderTextColor={T.placeholder}
              multiline
              scrollEnabled={false}
              maxLength={MAX_CHARS + 10}
              autoFocus={isIOS}
              style={styles.input}
              selectionColor={T.accent}
              cursorColor={T.accent}
            />
          </View>

          {suggestions.length > 0 && (
            <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={styles.suggestions}>
              {suggestions.map(u => (
                <Pressable
                  key={u.id}
                  onPress={() => insertMention(u.username)}
                  style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: T.surface2 }]}
                >
                  <UserAvatar avatarUrl={u.avatar_url} size={30} />
                  <View style={styles.flex}>
                    <Text style={styles.suggestionName} numberOfLines={1}>{u.full_name}</Text>
                    <Text style={styles.suggestionHandle} numberOfLines={1}>@{u.username}</Text>
                  </View>
                </Pressable>
              ))}
            </Animated.View>
          )}

          {poll && (
            <ComposerPoll value={poll} onChange={setPoll} onRemove={() => setPoll(null)} disabled={posting} />
          )}

          <ComposerMedia
            items={media}
            width={contentW}
            onRemove={removeMedia}
            status={posting ? uploadStatus : {}}
            locked={posting}
          />

          {posting && media.length > 0 && (
            <Animated.View entering={FadeIn.duration(160)} style={styles.uploadingRow}>
              <ActivityIndicator size="small" color={T.textMuted} />
              <Text style={styles.uploadingText}>
                Uploading {Object.values(uploadStatus).filter(s => s === 'done').length}/{media.length}…
              </Text>
            </Animated.View>
          )}
        </ScrollView>

        {/* Toolbar — always directly above the keyboard */}
        <View style={[styles.toolbar, { paddingBottom: keyboardOpen ? 8 : Math.max(insets.bottom, 8) }]}>
          <View style={styles.tools}>
            <ToolButton icon={ICONS.gallery} label="Add photos" disabled={toolsDisabled} onPress={() => pickMedia('image')} compact={narrow} />
            <ToolButton icon={ICONS.camera} label="Take a photo" disabled={toolsDisabled} onPress={takePhoto} compact={narrow} />
            <ToolButton icon={ICONS.video} label="Add video" disabled={toolsDisabled} onPress={() => pickMedia('video')} compact={narrow} />
            {!parentPostId && (
              <ToolButton
                icon={<PollToolIcon color={T.accent} />}
                label="Add a poll"
                disabled={posting || !!poll || media.length > 0}
                onPress={() => { setPoll(newPoll()); }}
                compact={narrow}
              />
            )}
          </View>

          <View style={styles.flex} />

          {content.length > 0 && (
            <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={styles.counterWrap}>
              {content.length > WARN_AT && (
                <Text style={[styles.counterText, over && { color: T.error }]} maxFontSizeMultiplier={1.2}>{remaining}</Text>
              )}
              <CharRing
                progress={Math.min(content.length / MAX_CHARS, 1)}
                color={over ? T.error : content.length > WARN_AT ? '#F5A623' : T.accent}
                track={T.border}
                bg={T.bg}
              />
            </Animated.View>
          )}

          <VisibilityChip
            isPublic={isPublic}
            onPress={toggleVisibility}
            disabled={posting}
            styles={styles}
            iconOnly={narrow && content.length > WARN_AT}
          />
        </View>

        {/* Android: lifts the column above the keyboard when the window isn't resized */}
        {!isIOS && <Animated.View style={androidSpacer} />}
      </KeyboardAvoidingView>

      <BottomSheet
        visible={discardSheet}
        onClose={() => setDiscardSheet(false)}
        title="Keep this draft?"
        subtitle={poll ? 'Your text will be here next time. The poll is not kept.' : media.length ? 'Your text will be here next time. Photos and videos are not kept.' : 'It will be here next time you write a post.'}
        actions={[
          { icon: 'bookmark-outline', label: 'Save draft', onPress: () => { setDiscardSheet(false); onClose(); } },
          { icon: 'trash-outline', label: 'Discard', onPress: () => { skipDraft.current = true; AsyncStorage.removeItem(DRAFT_KEY).catch(() => {}); setDiscardSheet(false); onClose(); }, destructive: true },
        ]}
      />
    </View>
  );
}

function usePressSpring() {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => { scale.value = withTiming(0.94, { duration: 90, easing: EASE_OUT }); };
  const onPressOut = () => { scale.value = withTiming(1, { duration: 180, easing: EASE_OUT }); };
  return { style, onPressIn, onPressOut };
}

function ToolButton({ icon, onPress, disabled, label, compact }: {
  icon: ImageSourcePropType | React.ReactElement; onPress: () => void; disabled?: boolean; label: string; compact?: boolean;
}) {
  const spring = usePressSpring();
  return (
    <Pressable
      onPress={() => { tap(); onPress(); }}
      onPressIn={spring.onPressIn}
      onPressOut={spring.onPressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[toolStyles.btn, compact && toolStyles.btnCompact]}
      hitSlop={compact ? { top: 4, bottom: 4 } : undefined}
    >
      <Animated.View style={[spring.style, disabled && { opacity: 0.35 }]}>
        {React.isValidElement(icon) ? icon : <Image source={icon as ImageSourcePropType} style={toolStyles.icon} resizeMode="contain" />}
      </Animated.View>
    </Pressable>
  );
}

function VisibilityChip({ isPublic, onPress, disabled, styles, iconOnly }: {
  isPublic: boolean; onPress: () => void; disabled?: boolean; styles: ReturnType<typeof makeStyles>; iconOnly?: boolean;
}) {
  const spring = usePressSpring();
  return (
    <Pressable
      onPress={onPress}
      onPressIn={spring.onPressIn}
      onPressOut={spring.onPressOut}
      disabled={disabled}
      hitSlop={6}
      style={{ flexShrink: 1 }}
      accessibilityRole="button"
      accessibilityLabel={isPublic ? 'Visible to everyone. Tap to limit to followers' : 'Visible to followers. Tap to make public'}
    >
      <Animated.View style={[styles.visChip, iconOnly && { paddingRight: 6 }, spring.style, disabled && { opacity: 0.5 }]}>
        <Animated.Image
          key={isPublic ? 'everyone' : 'followers'}
          entering={FadeIn.duration(180)}
          source={isPublic ? ICONS.everyone : ICONS.followers}
          style={styles.visIcon}
          resizeMode="contain"
        />
        {!iconOnly && (
          <Text style={styles.visText} numberOfLines={1} maxFontSizeMultiplier={1.2}>{isPublic ? 'Everyone' : 'Followers'}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

/** Progress ring built from two clipped half-discs (no SVG needed). */
function CharRing({ progress, color, track, bg, size = 24, stroke = 2.5 }: {
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

const toolStyles = StyleSheet.create({
  btn: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  btnCompact: { width: 40 },
  icon: { width: 32, height: 32 },
});

function makeStyles(T: ReturnType<typeof import('../../hooks/useTheme').useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    flex: { flex: 1 },
    pressed: { opacity: 0.6 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SIDE,
      backgroundColor: T.bg,
    },
    cancelBtn: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
    cancelText: { fontSize: 16, color: T.text },
    headerTitleWrap: {
      position: 'absolute', left: 96, right: 96, bottom: 0, height: HEADER_H,
      alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 17, color: T.text, fontFamily: 'SpaceGrotesk_600SemiBold' },
    postBtn: {
      height: 36,
      borderRadius: 18,
      paddingHorizontal: 18,
      minWidth: 68,
      backgroundColor: T.accent,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    postGloss: { position: 'absolute', left: 0, right: 0, top: 0, height: 18 },
    postText: { color: '#000', fontWeight: '700', fontSize: 15 },
    bodyContent: { paddingHorizontal: SIDE, paddingTop: 8, paddingBottom: 24 },
    identity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    identityText: { flex: 1, minWidth: 0 },
    name: { fontSize: 15, fontWeight: '700', color: T.text },
    handle: { fontSize: 13, color: T.textMuted, marginTop: 1 },
    input: {
      fontSize: 18,
      lineHeight: 25,
      color: T.text,
      minHeight: 110,
      textAlignVertical: 'top',
      paddingTop: 12,
      paddingBottom: 8,
      paddingHorizontal: 0,
    },
    suggestions: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: T.border,
      borderRadius: 16,
      backgroundColor: T.surface,
      overflow: 'hidden',
      marginBottom: 8,
    },
    suggestion: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 50,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    suggestionName: { fontSize: 14, fontWeight: '600', color: T.text },
    suggestionHandle: { fontSize: 13, color: T.textMuted },
    uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
    uploadingText: { color: T.textMuted, fontSize: 13 },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingTop: 8,
      backgroundColor: T.bg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: T.border,
    },
    tools: { flexDirection: 'row', alignItems: 'center', marginLeft: -6, flexShrink: 0 },
    visChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 36,
      paddingLeft: 6,
      paddingRight: 12,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: T.border,
      backgroundColor: T.surface,
      marginLeft: 6,
    },
    visIcon: { width: 24, height: 24 },
    visText: { fontSize: 13, color: T.text, fontWeight: '600', flexShrink: 1 },
    counterWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, minHeight: 44, flexShrink: 0 },
    counterText: { fontSize: 13, color: T.textMuted, fontVariant: ['tabular-nums'] },
  });
}
