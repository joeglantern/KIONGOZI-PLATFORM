import { toast } from '../../utils/alert';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal, View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../../utils/apiClient';
import { useSocialStore } from '../../stores/socialStore';
import { markEdited, EDIT_WINDOW_MS } from './EditedLabel';
import { haptic } from '../../utils/haptics';

type Visibility = 'public' | 'followers';

interface Props {
  visible: boolean;
  postId: string;
  initialContent: string;
  initialVisibility: Visibility;
  onClose: () => void;
  /** Called at once with the new text (and again with the old one if the server refuses the edit) */
  onSaved?: (content: string, visibility: Visibility) => void;
}

export function EditPostModal({ visible, postId, initialContent, initialVisibility, onClose, onSaved }: Props) {
  const { updatePost } = useSocialStore();
  const [content, setContent] = useState(initialContent);
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);

  // Reset when opened
  useEffect(() => {
    if (visible) {
      setContent(initialContent);
      setVisibility(initialVisibility);
    }
  }, [visible]);

  // Text can change for 1 hour after posting (like X); who can see it can change any time
  const createdAt = useMemo(() => {
    const st = useSocialStore.getState();
    const all = [...st.feedPosts, ...st.forYouPosts, ...st.explorePosts, ...st.bookmarkPosts];
    return all.find(p => p.id === postId)?.created_at ?? null;
  }, [postId, visible]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!visible) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, [visible]);
  const leftMs = createdAt ? new Date(createdAt).getTime() + EDIT_WINDOW_MS - now : null;
  const textLocked = leftMs !== null && leftMs <= 0;
  const windowNote = leftMs === null
    ? 'You can edit for 1 hour after posting.'
    : textLocked
      ? 'The hour to edit this post has passed. You can still change who sees it.'
      : `You can edit for 1 hour after posting. ${Math.max(1, Math.ceil(leftMs / 60000))} min left.`;

  const canSave = content.trim().length > 0 && content.length <= 280;

  // The edit shows everywhere and the sheet closes at once; the old text comes back with a toast if the server says no
  const handleSave = () => {
    if (!canSave) return;
    const text = textLocked ? initialContent : content.trim();
    const textChanged = text !== initialContent.trim();
    updatePost(postId, { content: text, visibility });
    onSaved?.(text, visibility);
    if (textChanged) markEdited(postId, new Date().toISOString());
    haptic.success();
    onClose();
    apiClient.editPost(postId, text, visibility).catch(() => null).then((res: any) => {
      if (res?.success) {
        if (textChanged && res.data?.edited_at) markEdited(postId, res.data.edited_at);
        return;
      }
      if (textChanged) markEdited(postId, null);
      updatePost(postId, { content: initialContent, visibility: initialVisibility });
      onSaved?.(initialContent, initialVisibility);
      toast("Couldn't save changes", { kind: 'error', message: res?.error || undefined });
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#4a5568" />
            </TouchableOpacity>
            <Text style={styles.title}>Edit post</Text>
            <TouchableOpacity onPress={handleSave} disabled={!canSave} style={styles.saveBtn}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.windowNote}>{windowNote}</Text>
          <TextInput
            style={[styles.input, textLocked && styles.inputLocked]}
            value={content}
            onChangeText={setContent}
            editable={!textLocked}
            multiline
            maxLength={280}
            autoFocus={!textLocked}
            placeholder="What's on your mind?"
            placeholderTextColor="#555555"
          />

          {/* Visibility toggle */}
          <View style={styles.footer}>
            <Text style={styles.visLabel}>Visible to:</Text>
            <TouchableOpacity
              style={[styles.visPill, visibility === 'public' && styles.visPillActive]}
              onPress={() => setVisibility('public')}
            >
              <Ionicons name="globe-outline" size={14} color={visibility === 'public' ? '#fff' : '#8E8E93'} />
              <Text style={[styles.visText, visibility === 'public' && styles.visTextActive]}>Everyone</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.visPill, visibility === 'followers' && styles.visPillActive]}
              onPress={() => setVisibility('followers')}
            >
              <Ionicons name="people-outline" size={14} color={visibility === 'followers' ? '#fff' : '#8E8E93'} />
              <Text style={[styles.visText, visibility === 'followers' && styles.visTextActive]}>Followers</Text>
            </TouchableOpacity>
            <Text style={[styles.charCount, content.length > 260 && styles.charWarn]}>
              {280 - content.length}
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1A1A1A',
  },
  closeBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  saveBtn: {
    backgroundColor: '#5CB85C',
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
    minWidth: 64,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    padding: 16,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1A1A1A',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  visLabel: { fontSize: 13, color: '#8E8E93', marginRight: 4 },
  visPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#1A1A1A',
  },
  visPillActive: { backgroundColor: '#5CB85C', borderColor: '#5CB85C' },
  visText: { fontSize: 13, color: '#8E8E93' },
  visTextActive: { color: '#fff', fontWeight: '600' },
  windowNote: { fontSize: 13, color: '#8E8E93', paddingHorizontal: 16, paddingTop: 10 },
  inputLocked: { color: '#8E8E93' },
  charCount: { flex: 1, textAlign: 'right', fontSize: 13, color: '#636366' },
  charWarn: { color: '#e53e3e' },
});
