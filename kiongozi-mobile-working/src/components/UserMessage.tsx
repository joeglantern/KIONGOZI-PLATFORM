import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  type?: 'chat' | 'research';
  reaction?: 'like' | 'dislike' | null;
}

interface UserMessageProps {
  message: Message;
  darkMode: boolean;
  onCopy: (text: string) => void;
}

export default function UserMessage({ message, darkMode, onCopy }: UserMessageProps) {
  return (
    <View style={styles.userMessageWrapper}>
      <TouchableOpacity
        style={[
          styles.userMessageContainer,
          darkMode && styles.userMessageContainerDark
        ]}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onCopy(message.text);
        }}
        delayLongPress={500}
        activeOpacity={0.8}
      >
        <Text style={[styles.userMessageText, darkMode && styles.userMessageTextDark]}>
          {message.text}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  userMessageWrapper: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    maxWidth: '85%',
    marginHorizontal: 16,
  },
  userMessageContainer: {
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userMessageContainerDark: {
    backgroundColor: '#1d4ed8',
  },
  userMessageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#ffffff',
  },
  userMessageTextDark: {
    color: '#f9fafb',
  },
});