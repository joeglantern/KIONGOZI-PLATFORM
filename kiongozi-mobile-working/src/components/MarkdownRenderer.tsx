import React from 'react';
import { View, StyleSheet } from 'react-native';
import Markdown from 'react-native-marked';

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

  return (
    <View style={[styles.container, style]}>
      <Markdown
        value={content}
        theme={{
          colors: {
            text: darkMode ? '#f3f4f6' : '#1f2937',
            border: darkMode ? '#374151' : '#e5e7eb',
            link: '#3b82f6',
            code: darkMode ? '#fbbf24' : '#dc2626',
            codeBackground: darkMode ? '#374151' : '#f3f4f6',
          },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
