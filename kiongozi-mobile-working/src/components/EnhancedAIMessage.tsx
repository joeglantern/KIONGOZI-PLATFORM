import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import MarkdownRenderer from './MarkdownRenderer';
import CommandResponseCard from './CommandResponseCard';
import LoadingDots from './LoadingDots';
import { processMessageContent } from '../utils/messageProcessor';
import { CommandResponse } from '../utils/commandProcessor';

interface Message {
  text: string;
  isUser: boolean;
  id: number;
  type?: 'chat' | 'research';
  reaction?: 'like' | 'dislike' | null;
  commandResponse?: CommandResponse;
  isLoading?: boolean;
}

interface EnhancedAIMessageProps {
  message: Message;
  darkMode?: boolean;
  onCopy?: (text: string) => void;
  onReact?: (messageId: number, reaction: 'like' | 'dislike') => void;
  showTypewriter?: boolean;
  onTypewriterComplete?: () => void;
  onModulePress?: (module: any) => void;
  onCoursePress?: (course: any) => void;
  onCategoryPress?: (category: any) => void;
  isLastAiMessage?: boolean;
  onRegenerate?: () => void;
}

export default function EnhancedAIMessage({
  message,
  darkMode = false,
  onCopy,
  onReact,
  showTypewriter = false,
  onTypewriterComplete,
  onModulePress,
  onCoursePress,
  onCategoryPress,
  isLastAiMessage = false,
  onRegenerate,
}: EnhancedAIMessageProps) {
  const [isTypingComplete, setIsTypingComplete] = useState(!showTypewriter);
  const [processedMessage, setProcessedMessage] = useState<any>(null);

  useEffect(() => {
    const processed = processMessageContent(message.text);
    setProcessedMessage(processed);
  }, [message.text]);

  const handleTypewriterComplete = () => {
    setIsTypingComplete(true);
    onTypewriterComplete?.();
  };

  const handleCopy = async () => {
    if (onCopy) {
      onCopy(message.text);
    } else {
      try {
        await Clipboard.setStringAsync(message.text);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error('Failed to copy message:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const handleReaction = (reaction: 'like' | 'dislike') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReact?.(message.id, reaction);
  };

  const renderMessageContent = () => {
    if (message.isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <LoadingDots />
        </View>
      );
    }

    if (message.commandResponse) {
      return (
        <CommandResponseCard
          response={message.commandResponse}
          darkMode={darkMode}
          onModulePress={onModulePress}
          onCoursePress={onCoursePress}
          onCategoryPress={onCategoryPress}
        />
      );
    }

    if (!processedMessage) {
      return (
        <Text style={[styles.messageText, darkMode && styles.messageTextDark]}>
          {message.text}
        </Text>
      );
    }

    if (processedMessage.hasCode || processedMessage.hasLinks || message.text.includes('#') || message.text.includes('**')) {
      return (
        <MarkdownRenderer
          content={message.text}
          darkMode={darkMode}
          style={[styles.messageText, darkMode && styles.messageTextDark]}
          enableCopy={true}
        />
      );
    }

    return (
      <Text style={[styles.messageText, darkMode && styles.messageTextDark]}>
        {message.text}
      </Text>
    );
  };

  const renderMessageStats = () => {
    if (!processedMessage || !isTypingComplete) return null;

    const hasStats = processedMessage.wordCount > 50 || processedMessage.hasCode || processedMessage.hasLinks;
    if (!hasStats) return null;

    return (
      <View style={[styles.statsContainer, darkMode && styles.statsContainerDark]}>
        {processedMessage.wordCount > 50 && (
          <View style={styles.statItem}>
            <Ionicons name="document-text-outline" size={12} color={darkMode ? '#9ca3af' : '#6b7280'} />
            <Text style={[styles.statText, darkMode && styles.statTextDark]}>
              {processedMessage.wordCount} words
            </Text>
          </View>
        )}
        {processedMessage.hasCode && (
          <View style={styles.statItem}>
            <Ionicons name="code-slash-outline" size={12} color={darkMode ? '#9ca3af' : '#6b7280'} />
            <Text style={[styles.statText, darkMode && styles.statTextDark]}>
              {processedMessage.codeBlocks?.length || 0} code blocks
            </Text>
          </View>
        )}
        {processedMessage.hasLinks && (
          <View style={styles.statItem}>
            <Ionicons name="link-outline" size={12} color={darkMode ? '#9ca3af' : '#6b7280'} />
            <Text style={[styles.statText, darkMode && styles.statTextDark]}>Contains links</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <Image
            source={require('../../assets/kchat-logo.png')}
            style={styles.avatar}
            resizeMode="contain"
          />
        </View>

        {/* Bubble + actions */}
        <View style={styles.bubbleCol}>
          <View style={[styles.bubble, darkMode && styles.bubbleDark]}>
            {renderMessageContent()}
            {renderMessageStats()}
          </View>

          {message.text && isTypingComplete && !message.isLoading && (
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, darkMode && styles.actionButtonDark]}
                onPress={handleCopy}
              >
                <Ionicons name="copy-outline" size={15} color={darkMode ? '#9ca3af' : '#6b7280'} />
              </TouchableOpacity>

              {isLastAiMessage && onRegenerate && (
                <TouchableOpacity
                  style={[styles.actionButton, darkMode && styles.actionButtonDark]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onRegenerate();
                  }}
                >
                  <Ionicons name="refresh-outline" size={15} color={darkMode ? '#9ca3af' : '#6b7280'} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  darkMode && styles.actionButtonDark,
                  message.reaction === 'like' && styles.actionButtonLike,
                ]}
                onPress={() => handleReaction('like')}
              >
                <Ionicons
                  name={message.reaction === 'like' ? 'thumbs-up' : 'thumbs-up-outline'}
                  size={15}
                  color={message.reaction === 'like' ? '#5CB85C' : (darkMode ? '#9ca3af' : '#6b7280')}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  darkMode && styles.actionButtonDark,
                  message.reaction === 'dislike' && styles.actionButtonDislike,
                ]}
                onPress={() => handleReaction('dislike')}
              >
                <Ionicons
                  name={message.reaction === 'dislike' ? 'thumbs-down' : 'thumbs-down-outline'}
                  size={15}
                  color={message.reaction === 'dislike' ? '#ef4444' : (darkMode ? '#9ca3af' : '#6b7280')}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  avatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a365d',
    overflow: 'hidden',
    marginTop: 2,
    flexShrink: 0,
    borderWidth: 1.5,
    borderColor: '#5CB85C',
  },
  avatar: {
    width: 32,
    height: 32,
  },
  bubbleCol: {
    flex: 1,
    minWidth: 0,
  },
  bubble: {
    backgroundColor: '#f0faf4',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(92, 184, 92, 0.15)',
  },
  bubbleDark: {
    backgroundColor: '#1a2e1a',
    borderColor: 'rgba(92, 184, 92, 0.2)',
  },
  loadingContainer: {
    paddingVertical: 4,
  },
  messageText: {
    fontSize: 15.5,
    lineHeight: 24,
    color: '#1a202c',
  },
  messageTextDark: {
    color: '#e2e8f0',
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    gap: 14,
  },
  statsContainerDark: {
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11.5,
    color: '#6b7280',
    fontWeight: '500',
  },
  statTextDark: {
    color: '#9ca3af',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 6,
    alignSelf: 'flex-start',
    paddingLeft: 4,
  },
  actionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  actionButtonDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonLike: {
    backgroundColor: '#f0faf4',
    borderColor: '#5CB85C',
  },
  actionButtonDislike: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
});
