import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import MarkdownRenderer from './MarkdownRenderer';

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
        <MarkdownRenderer content={message.text} darkMode={darkMode} />

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
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
});
