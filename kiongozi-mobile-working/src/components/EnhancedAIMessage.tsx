import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import TypewriterText from './TypewriterText';
import MarkdownRenderer from './MarkdownRenderer';
import CommandResponseCard from './CommandResponseCard';
import { processMessageContent } from '../utils/messageProcessor';
import { CommandResponse } from '../utils/commandProcessor';

interface Message {
  text: string;
  isUser: boolean;
  id: number;
  type?: 'chat' | 'research';
  reaction?: 'like' | 'dislike' | null;
  commandResponse?: CommandResponse;
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
    // Process the message content
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
    // Handle command responses first
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

    // Show typewriter effect for new messages
    if (showTypewriter && !isTypingComplete) {
      return (
        <TypewriterText
          text={message.text}
          speed={60} // Characters per second
          onComplete={handleTypewriterComplete}
          darkMode={darkMode}
          showCursor={true}
          startDelay={300}
          style={[styles.messageText, darkMode && styles.messageTextDark]}
        />
      );
    }

    // Show markdown rendered content for completed messages
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

    // Fallback to simple text
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
            <Ionicons
              name="document-text-outline"
              size={12}
              color={darkMode ? '#9ca3af' : '#6b7280'}
            />
            <Text style={[styles.statText, darkMode && styles.statTextDark]}>
              {processedMessage.wordCount} words
            </Text>
          </View>
        )}
        
        {processedMessage.hasCode && (
          <View style={styles.statItem}>
            <Ionicons
              name="code-slash-outline"
              size={12}
              color={darkMode ? '#9ca3af' : '#6b7280'}
            />
            <Text style={[styles.statText, darkMode && styles.statTextDark]}>
              {processedMessage.codeBlocks?.length || 0} code blocks
            </Text>
          </View>
        )}
        
        {processedMessage.hasLinks && (
          <View style={styles.statItem}>
            <Ionicons
              name="link-outline"
              size={12}
              color={darkMode ? '#9ca3af' : '#6b7280'}
            />
            <Text style={[styles.statText, darkMode && styles.statTextDark]}>
              Contains links
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Message Content - Full width, no bubble */}
      <View style={styles.contentContainer}>
        <View style={styles.messageArea}>
          {renderMessageContent()}
          {renderMessageStats()}
        </View>

        {/* Action Buttons - always visible */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, darkMode && styles.actionButtonDark]}
            onPress={handleCopy}
          >
            <Ionicons
              name="copy-outline"
              size={16}
              color={darkMode ? '#9ca3af' : '#6b7280'}
            />
          </TouchableOpacity>

          {isLastAiMessage && onRegenerate && (
            <TouchableOpacity
              style={[styles.actionButton, darkMode && styles.actionButtonDark]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onRegenerate();
              }}
            >
              <Ionicons
                name="refresh-outline"
                size={16}
                color={darkMode ? '#9ca3af' : '#6b7280'}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.actionButton,
              darkMode && styles.actionButtonDark,
              message.reaction === 'like' && styles.actionButtonActive
            ]}
            onPress={() => handleReaction('like')}
          >
            <Ionicons
              name={message.reaction === 'like' ? 'thumbs-up' : 'thumbs-up-outline'}
              size={16}
              color={message.reaction === 'like' ? '#22c55e' : (darkMode ? '#9ca3af' : '#6b7280')}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              darkMode && styles.actionButtonDark,
              message.reaction === 'dislike' && styles.actionButtonActive
            ]}
            onPress={() => handleReaction('dislike')}
          >
            <Ionicons
              name={message.reaction === 'dislike' ? 'thumbs-down' : 'thumbs-down-outline'}
              size={16}
              color={message.reaction === 'dislike' ? '#ef4444' : (darkMode ? '#9ca3af' : '#6b7280')}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  contentContainer: {
    flex: 1,
    minWidth: 0,
  },
  messageArea: {
    width: '100%',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 25, // Slightly increased for better readability
    color: '#1f2937',
  },
  messageTextDark: {
    color: '#f3f4f6',
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    gap: 16,
  },
  statsContainerDark: {
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  statTextDark: {
    color: '#9ca3af',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
    alignSelf: 'flex-start',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  actionButtonDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  actionButtonActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#3b82f6',
  },
});
