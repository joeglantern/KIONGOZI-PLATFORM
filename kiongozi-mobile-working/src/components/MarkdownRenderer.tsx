import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import Markdown from 'react-native-markdown-display';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

interface MarkdownRendererProps {
  content: string;
  darkMode?: boolean;
  style?: any;
  onLinkPress?: (url: string) => void;
  enableCopy?: boolean;
}

export default function MarkdownRenderer({
  content,
  darkMode = false,
  style,
  onLinkPress,
  enableCopy = true,
}: MarkdownRendererProps) {
  
  const handleLinkPress = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (onLinkPress) {
      onLinkPress(url);
    } else {
      Linking.openURL(url).catch(err => {
        console.warn('Failed to open URL:', err);
      });
    }
  };

  const markdownStyles = StyleSheet.create({
    body: {
      color: darkMode ? '#f3f4f6' : '#1f2937',
      fontSize: 16,
      lineHeight: 24,
      ...style,
    },
    heading1: {
      fontSize: 24,
      fontWeight: '700',
      color: darkMode ? '#f9fafb' : '#111827',
      marginTop: 24,
      marginBottom: 16,
      lineHeight: 32,
    },
    heading2: {
      fontSize: 20,
      fontWeight: '600',
      color: darkMode ? '#f9fafb' : '#111827',
      marginTop: 20,
      marginBottom: 12,
      lineHeight: 28,
    },
    heading3: {
      fontSize: 18,
      fontWeight: '600',
      color: darkMode ? '#f3f4f6' : '#1f2937',
      marginTop: 16,
      marginBottom: 8,
      lineHeight: 24,
    },
    heading4: {
      fontSize: 16,
      fontWeight: '600',
      color: darkMode ? '#f3f4f6' : '#1f2937',
      marginTop: 12,
      marginBottom: 6,
      lineHeight: 22,
    },
    paragraph: {
      fontSize: 16,
      lineHeight: 24,
      color: darkMode ? '#f3f4f6' : '#1f2937',
      marginBottom: 12,
    },
    strong: {
      fontWeight: '600',
      color: darkMode ? '#f9fafb' : '#111827',
    },
    em: {
      fontStyle: 'italic',
      color: darkMode ? '#e5e7eb' : '#374151',
    },
    link: {
      color: '#3b82f6',
      textDecorationLine: 'underline',
    },
    code_inline: {
      fontFamily: 'Courier',
      backgroundColor: darkMode ? '#374151' : '#f3f4f6',
      color: darkMode ? '#fbbf24' : '#dc2626',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      fontSize: 14,
    },
    code_block: {
      fontFamily: 'Courier',
      backgroundColor: darkMode ? '#1f2937' : '#f8fafc',
      color: darkMode ? '#e5e7eb' : '#374151',
      padding: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: darkMode ? '#374151' : '#e5e7eb',
      fontSize: 14,
      lineHeight: 20,
      marginVertical: 8,
    },
    fence: {
      fontFamily: 'Courier',
      backgroundColor: darkMode ? '#1f2937' : '#f8fafc',
      color: darkMode ? '#e5e7eb' : '#374151',
      padding: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: darkMode ? '#374151' : '#e5e7eb',
      fontSize: 14,
      lineHeight: 20,
      marginVertical: 8,
    },
    blockquote: {
      backgroundColor: darkMode ? '#1f2937' : '#f8fafc',
      borderLeftWidth: 4,
      borderLeftColor: '#3b82f6',
      paddingLeft: 16,
      paddingVertical: 12,
      marginVertical: 8,
      fontStyle: 'italic',
    },
    list_item: {
      fontSize: 16,
      lineHeight: 24,
      color: darkMode ? '#f3f4f6' : '#1f2937',
      marginBottom: 4,
    },
    bullet_list: {
      marginVertical: 8,
    },
    ordered_list: {
      marginVertical: 8,
    },
    table: {
      borderWidth: 1,
      borderColor: darkMode ? '#374151' : '#e5e7eb',
      borderRadius: 8,
      marginVertical: 8,
    },
    thead: {
      backgroundColor: darkMode ? '#374151' : '#f3f4f6',
    },
    th: {
      padding: 12,
      fontWeight: '600',
      color: darkMode ? '#f9fafb' : '#111827',
      borderBottomWidth: 1,
      borderBottomColor: darkMode ? '#4b5563' : '#d1d5db',
    },
    td: {
      padding: 12,
      color: darkMode ? '#f3f4f6' : '#1f2937',
      borderBottomWidth: 1,
      borderBottomColor: darkMode ? '#374151' : '#f3f4f6',
    },
    hr: {
      backgroundColor: darkMode ? '#374151' : '#e5e7eb',
      height: 1,
      marginVertical: 16,
    },
  });

  const customRules = {
    // Custom link renderer with haptic feedback
    link: (node: any, children: any, parent: any, styles: any) => (
      <TouchableOpacity
        key={node.key}
        onPress={() => handleLinkPress(node.attributes.href)}
        activeOpacity={0.7}
      >
        <Text style={markdownStyles.link}>{children}</Text>
      </TouchableOpacity>
    ),

    // Enhanced code block with copy functionality
    fence: (node: any, children: any, parent: any, styles: any) => {
      const language = node.attributes?.info || 'text';
      const codeContent = node.content;

      return (
        <View key={node.key} style={styles.codeBlockContainer}>
          {/* Code header */}
          <View style={[styles.codeHeader, darkMode && styles.codeHeaderDark]}>
            <Text style={[styles.codeLanguage, darkMode && styles.codeLanguageDark]}>
              {language.toUpperCase()}
            </Text>
            {enableCopy && (
              <TouchableOpacity
                style={styles.copyButton}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  // Copy functionality would be implemented here
                  console.log('Copy code:', codeContent);
                }}
              >
                <Ionicons
                  name="copy-outline"
                  size={16}
                  color={darkMode ? '#9ca3af' : '#6b7280'}
                />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Code content */}
          <View style={markdownStyles.fence}>
            <Text style={markdownStyles.fence}>{codeContent}</Text>
          </View>
        </View>
      );
    },

    // Enhanced blockquote
    blockquote: (node: any, children: any, parent: any, styles: any) => (
      <View key={node.key} style={markdownStyles.blockquote}>
        <View style={styles.quoteIcon}>
          <Ionicons
            name="quote"
            size={20}
            color="#3b82f6"
          />
        </View>
        <Text style={markdownStyles.blockquote}>{children}</Text>
      </View>
    ),
  };

  if (!content || content.trim() === '') {
    return (
      <Text style={[markdownStyles.body, styles.emptyText]}>
        No content to display
      </Text>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Markdown
        style={markdownStyles}
        rules={customRules}
        onLinkPress={handleLinkPress}
      >
        {content}
      </Markdown>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%', // Ensure full width utilization
  },
  emptyText: {
    fontStyle: 'italic',
    opacity: 0.6,
    textAlign: 'center',
    paddingVertical: 20,
  },
  codeBlockContainer: {
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  codeHeaderDark: {
    backgroundColor: '#374151',
    borderBottomColor: '#4b5563',
  },
  codeLanguage: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeLanguageDark: {
    color: '#9ca3af',
  },
  copyButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  quoteIcon: {
    position: 'absolute',
    top: 12,
    left: -8,
  },
});
