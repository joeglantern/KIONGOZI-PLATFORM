import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import * as Haptics from 'expo-haptics';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  type?: 'chat' | 'research';
  reaction?: 'like' | 'dislike' | null;
}

interface AIMessageProps {
  message: Message;
  darkMode: boolean;
  onCopy: (text: string) => void;
  onReact: (messageId: number, reaction: 'like' | 'dislike') => void;
}

export default function AIMessage({ message, darkMode, onCopy, onReact }: AIMessageProps) {
  // Skip welcome messages for cleaner display
  if (message.text.includes('Habari!') || message.text.includes('Welcome')) {
    return (
      <View style={[styles.welcomeContainer, darkMode && styles.welcomeContainerDark]}>
        <Text style={[styles.welcomeText, darkMode && styles.welcomeTextDark]}>
          {message.text}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.aiMessageContainer, darkMode && styles.aiMessageContainerDark]}>
      {/* AI Avatar */}
      <View style={styles.avatarContainer}>
        <View style={[styles.aiAvatar, darkMode && styles.aiAvatarDark]}>
          <Text style={styles.avatarText}>AI</Text>
        </View>
      </View>

      {/* Message Content */}
      <TouchableOpacity
        style={styles.messageContent}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onCopy(message.text);
        }}
        delayLongPress={500}
        activeOpacity={0.8}
      >
        {/* Rich Text Content */}
        <Markdown
          style={darkMode ? markdownDarkStyles : markdownLightStyles}
        >
          {message.text}
        </Markdown>

        {/* Reaction buttons */}
        <View style={styles.reactionContainer}>
          <TouchableOpacity
            style={[
              styles.reactionButton,
              message.reaction === 'like' && styles.reactionButtonActive,
              darkMode && styles.reactionButtonDark
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onReact(message.id, 'like');
            }}
          >
            <Text style={[
              styles.reactionButtonText,
              message.reaction === 'like' && styles.reactionButtonTextActive
            ]}>
              👍
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.reactionButton,
              message.reaction === 'dislike' && styles.reactionButtonActive,
              darkMode && styles.reactionButtonDark
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onReact(message.id, 'dislike');
            }}
          >
            <Text style={[
              styles.reactionButtonText,
              message.reaction === 'dislike' && styles.reactionButtonTextActive
            ]}>
              👎
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  aiMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 16,
    width: '100%',
  },
  aiMessageContainerDark: {
    // Container doesn't need background color changes
  },
  avatarContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiAvatarDark: {
    backgroundColor: '#60a5fa',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageContent: {
    flex: 1,
    paddingVertical: 4,
  },
  welcomeContainer: {
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    marginHorizontal: 16,
  },
  welcomeContainerDark: {
    backgroundColor: '#374151',
  },
  welcomeText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1f2937',
    textAlign: 'center',
  },
  welcomeTextDark: {
    color: '#f3f4f6',
  },
  reactionContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  reactionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 32,
    alignItems: 'center',
  },
  reactionButtonDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  reactionButtonActive: {
    backgroundColor: '#3b82f6',
  },
  reactionButtonText: {
    fontSize: 14,
  },
  reactionButtonTextActive: {
    transform: [{ scale: 1.2 }],
  },
});

// Light theme markdown styles
const markdownLightStyles = {
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1f2937',
    fontFamily: 'System',
  },
  heading1: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 20,
    marginBottom: 10,
  },
  heading2: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  heading3: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1f2937',
    marginBottom: 12,
  },
  strong: {
    fontWeight: 'bold',
    color: '#111827',
  },
  em: {
    fontStyle: 'italic',
  },
  list_item: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1f2937',
    marginBottom: 4,
  },
  bullet_list: {
    marginBottom: 12,
  },
  ordered_list: {
    marginBottom: 12,
  },
  code_inline: {
    backgroundColor: '#f3f4f6',
    color: '#dc2626',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  fence: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  code_block: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#374151',
  },
  blockquote: {
    backgroundColor: '#f9fafb',
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6b7280',
  },
};

// Dark theme markdown styles
const markdownDarkStyles = {
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: '#f3f4f6',
    fontFamily: 'System',
  },
  heading1: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f9fafb',
    marginTop: 20,
    marginBottom: 10,
  },
  heading2: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f9fafb',
    marginTop: 16,
    marginBottom: 8,
  },
  heading3: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f9fafb',
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#f3f4f6',
    marginBottom: 12,
  },
  strong: {
    fontWeight: 'bold',
    color: '#ffffff',
  },
  em: {
    fontStyle: 'italic',
  },
  list_item: {
    fontSize: 16,
    lineHeight: 24,
    color: '#f3f4f6',
    marginBottom: 4,
  },
  bullet_list: {
    marginBottom: 12,
  },
  ordered_list: {
    marginBottom: 12,
  },
  code_inline: {
    backgroundColor: '#374151',
    color: '#fca5a5',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  fence: {
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#60a5fa',
  },
  code_block: {
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#d1d5db',
  },
  blockquote: {
    backgroundColor: '#374151',
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#9ca3af',
  },
};