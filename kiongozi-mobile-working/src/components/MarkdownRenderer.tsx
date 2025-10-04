import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';

interface MarkdownRendererProps {
  content: string;
  darkMode?: boolean;
  style?: any;
}

export default function MarkdownRenderer({
  content,
  darkMode = false,
  style,
}: MarkdownRendererProps) {

  if (!content || content.trim() === '') {
    return null;
  }

  // Simple markdown parsing for basic formatting
  const parseMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];

    lines.forEach((line, index) => {
      // Code blocks
      if (line.startsWith('```')) {
        return; // Skip code fence markers
      }

      // Headers
      if (line.startsWith('### ')) {
        elements.push(
          <Text key={index} style={[styles.h3, { color: darkMode ? '#f9fafb' : '#111827' }]}>
            {line.replace('### ', '')}
          </Text>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <Text key={index} style={[styles.h2, { color: darkMode ? '#f9fafb' : '#111827' }]}>
            {line.replace('## ', '')}
          </Text>
        );
      } else if (line.startsWith('# ')) {
        elements.push(
          <Text key={index} style={[styles.h1, { color: darkMode ? '#f9fafb' : '#111827' }]}>
            {line.replace('# ', '')}
          </Text>
        );
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <Text key={index} style={[styles.listItem, { color: darkMode ? '#f3f4f6' : '#1f2937' }]}>
            • {line.substring(2)}
          </Text>
        );
      } else if (line.trim()) {
        // Regular text with inline formatting
        elements.push(
          <Text key={index} style={[styles.paragraph, { color: darkMode ? '#f3f4f6' : '#1f2937' }]}>
            {renderInlineFormatting(line, darkMode)}
          </Text>
        );
      }
    });

    return elements;
  };

  // Handle links
  const handleLinkPress = async (url: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening link:', error);
    }
  };

  // Handle inline bold, code, and links
  const renderInlineFormatting = (text: string, darkMode: boolean) => {
    const parts: (string | JSX.Element)[] = [];
    let partIndex = 0;

    // Regex for **bold**, `code`, [text](url), and plain URLs
    const combinedRegex = /(\*\*.*?\*\*|`.*?`|\[([^\]]+)\]\(([^)]+)\)|https?:\/\/[^\s]+)/g;
    const matches = text.match(combinedRegex);

    if (!matches) {
      return text;
    }

    text.split(combinedRegex).forEach((segment, i) => {
      if (!segment) return;

      // Bold text
      if (segment.startsWith('**') && segment.endsWith('**')) {
        parts.push(
          <Text key={`bold-${partIndex++}`} style={styles.bold}>
            {segment.slice(2, -2)}
          </Text>
        );
      }
      // Inline code
      else if (segment.startsWith('`') && segment.endsWith('`')) {
        parts.push(
          <Text
            key={`code-${partIndex++}`}
            style={[
              styles.inlineCode,
              {
                backgroundColor: darkMode ? '#374151' : '#f3f4f6',
                color: darkMode ? '#fbbf24' : '#dc2626'
              }
            ]}
          >
            {segment.slice(1, -1)}
          </Text>
        );
      }
      // Markdown links [text](url)
      else if (segment.startsWith('[')) {
        const linkMatch = segment.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          const linkText = linkMatch[1];
          const url = linkMatch[2];
          parts.push(
            <TouchableOpacity
              key={`link-${partIndex++}`}
              onPress={() => handleLinkPress(url)}
              activeOpacity={0.7}
            >
              <Text style={[styles.link, { color: darkMode ? '#60a5fa' : '#3b82f6' }]}>
                {linkText}
              </Text>
            </TouchableOpacity>
          );
        }
      }
      // Plain URLs
      else if (segment.startsWith('http://') || segment.startsWith('https://')) {
        parts.push(
          <TouchableOpacity
            key={`url-${partIndex++}`}
            onPress={() => handleLinkPress(segment)}
            activeOpacity={0.7}
          >
            <Text style={[styles.link, { color: darkMode ? '#60a5fa' : '#3b82f6' }]}>
              {segment}
            </Text>
          </TouchableOpacity>
        );
      }
      // Regular text
      else {
        parts.push(segment);
      }
    });

    return parts.length > 0 ? parts : text;
  };

  return (
    <View style={[styles.container, style]}>
      {parseMarkdown(content)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  h1: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    lineHeight: 32,
  },
  h2: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 6,
    lineHeight: 28,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
    lineHeight: 24,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  bold: {
    fontWeight: '600',
  },
  inlineCode: {
    fontFamily: 'Courier',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 14,
  },
  listItem: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 4,
    paddingLeft: 8,
  },
  link: {
    fontSize: 16,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
});
