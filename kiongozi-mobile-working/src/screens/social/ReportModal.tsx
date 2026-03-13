import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, TextInput,
  StyleSheet, Alert, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../utils/apiClient';

const REASONS: { value: string; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate_speech', label: 'Hate speech' },
  { value: 'misinformation', label: 'Misinformation' },
  { value: 'explicit_content', label: 'Explicit or adult content' },
  { value: 'other', label: 'Something else' },
];

interface ReportTarget {
  type: 'post' | 'user';
  id: string;
  displayName: string;
}

interface ReportModalProps {
  target: ReportTarget | null;
  onClose: () => void;
}

export default function ReportModal({ target, onClose }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Select a reason', 'Please choose a reason for your report.');
      return;
    }
    if (!target) return;

    setLoading(true);
    try {
      const res = await apiClient.reportContent(
        target.type,
        target.id,
        selectedReason,
        description.trim() || undefined
      );
      if (res.success) {
        Alert.alert(
          'Report submitted',
          'Thank you for keeping the community safe. We will review your report.',
          [{ text: 'OK', onPress: onClose }]
        );
      } else if (res.error?.includes('already reported')) {
        Alert.alert('Already reported', 'You already reported this recently.', [
          { text: 'OK', onPress: onClose },
        ]);
      } else {
        Alert.alert('Error', res.error || 'Failed to submit report. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setDescription('');
    onClose();
  };

  return (
    <Modal
      visible={!!target}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              Report {target?.type === 'user' ? 'User' : 'Post'}
            </Text>
            <TouchableOpacity onPress={handleSubmit} disabled={loading || !selectedReason}>
              {loading ? (
                <ActivityIndicator size="small" color="#1a365d" />
              ) : (
                <Text style={[styles.submitBtn, !selectedReason && styles.submitDisabled]}>
                  Submit
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.subtitle}>
              Reporting {target?.displayName}
            </Text>
            <Text style={styles.sectionLabel}>REASON</Text>

            {REASONS.map(r => (
              <TouchableOpacity
                key={r.value}
                style={styles.reasonRow}
                onPress={() => setSelectedReason(r.value)}
                activeOpacity={0.7}
              >
                <View style={[styles.radio, selectedReason === r.value && styles.radioSelected]}>
                  {selectedReason === r.value && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.reasonLabel}>{r.label}</Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>ADDITIONAL DETAILS (OPTIONAL)</Text>
            <TextInput
              style={styles.textarea}
              value={description}
              onChangeText={t => setDescription(t.slice(0, 500))}
              placeholder="Provide any additional context..."
              placeholderTextColor="#a0aec0"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
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
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  cancel: { fontSize: 16, color: '#718096' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a202c' },
  submitBtn: { fontSize: 16, fontWeight: '700', color: '#1a365d' },
  submitDisabled: { color: '#a0aec0' },
  body: { flex: 1, padding: 20 },
  subtitle: { fontSize: 14, color: '#718096', marginBottom: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#718096',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#cbd5e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: '#1a365d' },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1a365d',
  },
  reasonLabel: { fontSize: 16, color: '#2d3748' },
  textarea: {
    backgroundColor: '#f7fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1a202c',
    minHeight: 100,
  },
  charCount: { fontSize: 12, color: '#a0aec0', textAlign: 'right', marginTop: 4 },
});
