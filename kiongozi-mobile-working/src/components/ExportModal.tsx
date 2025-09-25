import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import exportUtils, { ExportFormat, ExportScope, Conversation } from '../utils/exportUtils';
import ModernSwitch from './ModernSwitch';

interface ExportModalProps {
  visible: boolean;
  darkMode: boolean;
  onClose: () => void;
  conversations: Conversation[];
  currentConversation?: Conversation;
}

const formatOptions: { key: ExportFormat; label: string; description: string; icon: string }[] = [
  {
    key: 'text',
    label: 'Plain Text',
    description: 'Simple text format, easy to read and share',
    icon: '📄'
  }
];

const scopeOptions: { key: ExportScope; label: string; description: string; icon: string }[] = [
  {
    key: 'current',
    label: 'Current Conversation',
    description: 'Export only the active conversation',
    icon: '💬'
  },
  {
    key: 'all',
    label: 'All Conversations',
    description: 'Export all your conversations',
    icon: '📚'
  }
];

export default function ExportModal({
  visible,
  darkMode,
  onClose,
  conversations,
  currentConversation
}: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('text');
  const [selectedScope, setSelectedScope] = useState<ExportScope>('current');
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      let conversationsToExport: Conversation[] = [];

      switch (selectedScope) {
        case 'current':
          if (currentConversation) {
            conversationsToExport = [currentConversation];
          } else {
            Alert.alert('No Current Conversation', 'Please start a conversation first.');
            return;
          }
          break;
        case 'all':
          conversationsToExport = conversations;
          break;
      }

      if (conversationsToExport.length === 0) {
        Alert.alert('No Conversations', 'No conversations available to export.');
        return;
      }

      const success = await exportUtils.exportConversations({
        format: selectedFormat,
        scope: selectedScope,
        conversations: conversationsToExport,
        includeTimestamps,
        includeMetadata
      });

      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error('Export error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Export Failed', 'Could not export conversations. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const getConversationsToExport = (): Conversation[] => {
    switch (selectedScope) {
      case 'current':
        return currentConversation ? [currentConversation] : [];
      case 'all':
        return conversations;
      default:
        return [];
    }
  };

  const exportSummary = exportUtils.getExportSummary(getConversationsToExport());

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, darkMode && styles.containerDark]}>
        {/* Header */}
        <View style={[styles.header, darkMode && styles.headerDark]}>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, darkMode && styles.headerTitleDark]}>
              Export Conversations
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, darkMode && styles.closeButtonTextDark]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Export Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark]}>
              Export Format: Plain Text
            </Text>
            <View style={[styles.infoCard, darkMode && styles.infoCardDark]}>
              <Text style={styles.optionIcon}>📄</Text>
              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, darkMode && styles.optionTitleDark]}>
                  Plain Text
                </Text>
                <Text style={[styles.optionDescription, darkMode && styles.optionDescriptionDark]}>
                  Simple text format, easy to read and share
                </Text>
              </View>
            </View>
          </View>

          {/* Scope Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark]}>
              Export Scope
            </Text>
            {scopeOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.optionCard,
                  darkMode && styles.optionCardDark,
                  selectedScope === option.key && styles.optionCardSelected,
                  selectedScope === option.key && darkMode && styles.optionCardSelectedDark,
                  option.key === 'current' && !currentConversation && styles.optionCardDisabled,
                ]}
                onPress={() => {
                  if (option.key === 'current' && !currentConversation) {
                    Alert.alert('No Current Conversation', 'Please start a conversation first.');
                    return;
                  }
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedScope(option.key);
                }}
                disabled={option.key === 'current' && !currentConversation}
              >
                <Text style={styles.optionIcon}>{option.icon}</Text>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionTitle, darkMode && styles.optionTitleDark]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.optionDescription, darkMode && styles.optionDescriptionDark]}>
                    {option.description}
                  </Text>
                </View>
                {selectedScope === option.key && (
                  <View style={styles.selectedIndicator}>
                    <Text style={styles.selectedIndicatorText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Options */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark]}>
              Include Options
            </Text>

            <View style={[styles.switchRow, darkMode && styles.switchRowDark]}>
              <View style={styles.switchContent}>
                <Text style={[styles.switchTitle, darkMode && styles.switchTitleDark]}>
                  Include Timestamps
                </Text>
                <Text style={[styles.switchDescription, darkMode && styles.switchDescriptionDark]}>
                  Add date and time information to messages
                </Text>
              </View>
              <ModernSwitch
                value={includeTimestamps}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIncludeTimestamps(value);
                }}
                darkMode={darkMode}
              />
            </View>

            <View style={[styles.switchRow, darkMode && styles.switchRowDark]}>
              <View style={styles.switchContent}>
                <Text style={[styles.switchTitle, darkMode && styles.switchTitleDark]}>
                  Include Metadata
                </Text>
                <Text style={[styles.switchDescription, darkMode && styles.switchDescriptionDark]}>
                  Add export information and platform details
                </Text>
              </View>
              <ModernSwitch
                value={includeMetadata}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIncludeMetadata(value);
                }}
                darkMode={darkMode}
              />
            </View>
          </View>

          {/* Export Summary */}
          <View style={[styles.summarySection, darkMode && styles.summarySectionDark]}>
            <Text style={[styles.summaryTitle, darkMode && styles.summaryTitleDark]}>
              Export Summary
            </Text>
            <Text style={[styles.summaryText, darkMode && styles.summaryTextDark]}>
              {exportSummary}
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, darkMode && styles.footerDark]}>
          <TouchableOpacity
            style={[styles.cancelButton, darkMode && styles.cancelButtonDark]}
            onPress={onClose}
            disabled={exporting}
          >
            <Text style={[styles.cancelButtonText, darkMode && styles.cancelButtonTextDark]}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exportButton, darkMode && styles.exportButtonDark]}
            onPress={handleExport}
            disabled={exporting || getConversationsToExport().length === 0}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.exportButtonText}>
                Export Conversation
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerDark: {
    backgroundColor: '#1f2937',
    borderBottomColor: '#374151',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerTitleDark: {
    color: '#f9fafb',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6b7280',
  },
  closeButtonTextDark: {
    color: '#9ca3af',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  sectionTitleDark: {
    color: '#f9fafb',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoCardDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  optionCardDark: {
    backgroundColor: '#1f2937',
  },
  optionCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#dbeafe',
  },
  optionCardSelectedDark: {
    borderColor: '#60a5fa',
    backgroundColor: '#1e3a8a',
  },
  optionCardDisabled: {
    opacity: 0.5,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  optionTitleDark: {
    color: '#f9fafb',
  },
  optionDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  optionDescriptionDark: {
    color: '#9ca3af',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicatorText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
  },
  switchRowDark: {
    backgroundColor: '#1f2937',
  },
  switchContent: {
    flex: 1,
    marginRight: 16,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  switchTitleDark: {
    color: '#f9fafb',
  },
  switchDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  switchDescriptionDark: {
    color: '#9ca3af',
  },
  summarySection: {
    marginTop: 24,
    marginBottom: 32,
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  summarySectionDark: {
    backgroundColor: '#374151',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  summaryTitleDark: {
    color: '#f9fafb',
  },
  summaryText: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryTextDark: {
    color: '#9ca3af',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  footerDark: {
    backgroundColor: '#1f2937',
    borderTopColor: '#374151',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonDark: {
    backgroundColor: '#374151',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  cancelButtonTextDark: {
    color: '#9ca3af',
  },
  exportButton: {
    flex: 2,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  exportButtonDark: {
    backgroundColor: '#1d4ed8',
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});