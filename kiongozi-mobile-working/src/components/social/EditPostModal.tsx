import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../../utils/apiClient';
import { useSocialStore } from '../../stores/socialStore';

interface Props {
  visible: boolean;
  postId: string;
  initialContent: string;
  initialVisibility: 'public' | 'followers';
  onClose: () => void;
}

export function EditPostModal({ visible, postId, initialContent, initialVisibility, onClose }: Props) {
  const { updatePost } = useSocialStore();
  const [content, setContent] = useState(initialContent);
  const [visibility, setVisibility] = useState<'public' | 'followers'>(initialVisibility);
  const [saving, setSaving] = useState(false);

  // Reset when opened
  useEffect(() => {
    if (visible) {
      setContent(initialContent);
      setVisibility(initialVisibility);
    }
  }, [visible]);

  const canSave = content.trim().length > 0 && content.length <= 280 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await apiClient.editPost(postId, content.trim(), visibility);
      if (res.success) {
        updatePost(postId, { content: content.trim(), visibility });
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#4a5568" />
            </TouchableOpacity>
            <Text style={styles.title}>Edit Post</Text>
            <TouchableOpacity onPress={handleSave} disabled={!canSave} style={styles.saveBtn}>
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={280}
            autoFocus
            placeholder="What's on your mind?"
            placeholderTextColor="#a0aec0"
          />

          {/* Visibility toggle */}
          <View style={styles.footer}>
            <Text style={styles.visLabel}>Visible to:</Text>
            <TouchableOpacity
              style={[styles.visPill, visibility === 'public' && styles.visPillActive]}
              onPress={() => setVisibility('public')}
            >
              <Ionicons name="globe-outline" size={14} color={visibility === 'public' ? '#fff' : '#718096'} />
              <Text style={[styles.visText, visibility === 'public' && styles.visTextActive]}>Everyone</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.visPill, visibility === 'followers' && styles.visPillActive]}
              onPress={() => setVisibility('followers')}
            >
              <Ionicons name="people-outline" size={14} color={visibility === 'followers' ? '#fff' : '#718096'} />
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
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  closeBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: '700', color: '#1a202c' },
  saveBtn: {
    backgroundColor: '#1a365d',
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
    color: '#1a202c',
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
    borderTopColor: '#e2e8f0',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  visLabel: { fontSize: 13, color: '#718096', marginRight: 4 },
  visPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f7fafc',
  },
  visPillActive: { backgroundColor: '#1a365d', borderColor: '#1a365d' },
  visText: { fontSize: 13, color: '#718096' },
  visTextActive: { color: '#fff', fontWeight: '600' },
  charCount: { flex: 1, textAlign: 'right', fontSize: 13, color: '#a0aec0' },
  charWarn: { color: '#e53e3e' },
});
