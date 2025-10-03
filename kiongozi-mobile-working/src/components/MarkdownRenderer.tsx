import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
    return (
      <Text style={[styles.emptyText, { color: darkMode ? '#9ca3af' : '#6b7280' }]}>
        No content to display
      </Text>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={[
        styles.text,
        { color: darkMode ? '#f3f4f6' : '#1f2937' }
      ]}>
        {content}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
  },
  emptyText: {
    fontStyle: 'italic',
    opacity: 0.6,
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 16,
  },
});
