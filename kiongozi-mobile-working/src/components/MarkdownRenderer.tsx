import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';

interface MarkdownRendererProps {
  content: string;
  darkMode?: boolean;
  style?: any;
  enableCopy?: boolean;
}

export default function MarkdownRenderer({ content, darkMode = false, style }: MarkdownRendererProps) {
  if (!content || content.trim() === '') return null;

  const handleLinkPress = async (url: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    } catch {}
  };

  // Tokenizer-based inline formatter — no regex split, no duplicate segments
  const renderInline = (text: string, keyPrefix: string): (string | React.ReactElement)[] => {
    const parts: (string | React.ReactElement)[] = [];
    let i = 0;
    let idx = 0;
    let buf = '';

    const flush = () => {
      if (buf) { parts.push(buf); buf = ''; }
    };

    while (i < text.length) {
      const ch = text[i];

      // **bold**
      if (ch === '*' && text[i + 1] === '*') {
        const end = text.indexOf('**', i + 2);
        if (end !== -1) {
          flush();
          parts.push(
            <Text key={`${keyPrefix}-b${idx++}`} style={s.bold}>
              {text.slice(i + 2, end)}
            </Text>
          );
          i = end + 2;
          continue;
        }
      }

      // *italic* (single star, not double)
      if (ch === '*' && text[i + 1] !== '*' && text[i + 1] !== ' ') {
        const end = text.indexOf('*', i + 1);
        if (end !== -1 && text[end + 1] !== '*') {
          flush();
          parts.push(
            <Text key={`${keyPrefix}-em${idx++}`} style={s.italic}>
              {text.slice(i + 1, end)}
            </Text>
          );
          i = end + 1;
          continue;
        }
      }

      // _italic_
      if (ch === '_' && text[i + 1] !== ' ') {
        const end = text.indexOf('_', i + 1);
        if (end !== -1) {
          flush();
          parts.push(
            <Text key={`${keyPrefix}-em2${idx++}`} style={s.italic}>
              {text.slice(i + 1, end)}
            </Text>
          );
          i = end + 1;
          continue;
        }
      }

      // `code`
      if (ch === '`') {
        const end = text.indexOf('`', i + 1);
        if (end !== -1) {
          flush();
          parts.push(
            <Text
              key={`${keyPrefix}-c${idx++}`}
              style={[s.inlineCode, { backgroundColor: darkMode ? '#374151' : '#f3f4f6', color: darkMode ? '#fbbf24' : '#dc2626' }]}
            >
              {text.slice(i + 1, end)}
            </Text>
          );
          i = end + 1;
          continue;
        }
      }

      // [text](url)
      if (ch === '[') {
        const closeBracket = text.indexOf(']', i + 1);
        if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
          const closeParen = text.indexOf(')', closeBracket + 2);
          if (closeParen !== -1) {
            const linkText = text.slice(i + 1, closeBracket);
            const url = text.slice(closeBracket + 2, closeParen);
            flush();
            parts.push(
              <TouchableOpacity key={`${keyPrefix}-l${idx++}`} onPress={() => handleLinkPress(url)} activeOpacity={0.7}>
                <Text style={[s.link, { color: darkMode ? '#60a5fa' : '#3b82f6' }]}>{linkText}</Text>
              </TouchableOpacity>
            );
            i = closeParen + 1;
            continue;
          }
        }
      }

      // https:// bare URL
      if (text.startsWith('https://', i) || text.startsWith('http://', i)) {
        const spaceIdx = text.indexOf(' ', i);
        const end = spaceIdx === -1 ? text.length : spaceIdx;
        const url = text.slice(i, end);
        flush();
        parts.push(
          <TouchableOpacity key={`${keyPrefix}-u${idx++}`} onPress={() => handleLinkPress(url)} activeOpacity={0.7}>
            <Text style={[s.link, { color: darkMode ? '#60a5fa' : '#3b82f6' }]}>{url}</Text>
          </TouchableOpacity>
        );
        i = end;
        continue;
      }

      buf += ch;
      i++;
    }

    flush();
    return parts;
  };

  const parseMarkdown = (text: string): React.ReactElement[] => {
    const lines = text.split('\n');
    const elements: React.ReactElement[] = [];
    let inCodeBlock = false;
    let codeLines: string[] = [];
    let codeBlockIdx = 0;

    const flushCodeBlock = () => {
      if (codeLines.length > 0) {
        elements.push(
          <ScrollView
            key={`cb-${codeBlockIdx++}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[s.codeBlock, { backgroundColor: darkMode ? '#1f2937' : '#f8f8f8' }]}
          >
            <Text style={[s.codeText, { color: darkMode ? '#fbbf24' : '#1a1a1a' }]}>
              {codeLines.join('\n')}
            </Text>
          </ScrollView>
        );
      }
      codeLines = [];
    };

    lines.forEach((line, index) => {
      if (line.startsWith('```')) {
        if (inCodeBlock) { flushCodeBlock(); inCodeBlock = false; }
        else { inCodeBlock = true; }
        return;
      }

      if (inCodeBlock) { codeLines.push(line); return; }

      const color = darkMode ? '#f3f4f6' : '#1f2937';
      const headingColor = darkMode ? '#f9fafb' : '#111827';

      if (line.startsWith('### ')) {
        elements.push(<Text key={index} style={[s.h3, { color: headingColor }]}>{line.slice(4)}</Text>);
      } else if (line.startsWith('## ')) {
        elements.push(<Text key={index} style={[s.h2, { color: headingColor }]}>{line.slice(3)}</Text>);
      } else if (line.startsWith('# ')) {
        elements.push(<Text key={index} style={[s.h1, { color: headingColor }]}>{line.slice(2)}</Text>);
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <Text key={index} style={[s.listItem, { color }]}>
            {'• '}
            {renderInline(line.slice(2), `li-${index}`)}
          </Text>
        );
      } else if (/^\d+\.\s/.test(line)) {
        const match = line.match(/^(\d+)\.\s(.*)$/);
        if (match) {
          elements.push(
            <Text key={index} style={[s.listItem, { color }]}>
              {match[1]}{'. '}
              {renderInline(match[2], `ol-${index}`)}
            </Text>
          );
        }
      } else if (line.trim() === '') {
        elements.push(<View key={index} style={{ height: 6 }} />);
      } else {
        elements.push(
          <Text key={index} style={[s.paragraph, { color }, style]}>
            {renderInline(line, `p-${index}`)}
          </Text>
        );
      }
    });

    // Flush any unclosed code block
    if (inCodeBlock) flushCodeBlock();

    return elements;
  };

  return <View style={s.container}>{parseMarkdown(content)}</View>;
}

const s = StyleSheet.create({
  container: { width: '100%' },
  h1: { fontSize: 22, fontWeight: '700', marginTop: 12, marginBottom: 6, lineHeight: 30 },
  h2: { fontSize: 18, fontWeight: '700', marginTop: 10, marginBottom: 4, lineHeight: 26 },
  h3: { fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 4, lineHeight: 22 },
  paragraph: { fontSize: 15.5, lineHeight: 24, marginBottom: 6 },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  listItem: { fontSize: 15.5, lineHeight: 24, marginBottom: 4, paddingLeft: 4 },
  link: { fontSize: 15.5, textDecorationLine: 'underline', fontWeight: '500' },
  inlineCode: {
    fontFamily: 'Courier',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    fontSize: 13.5,
  },
  codeBlock: {
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
  },
  codeText: {
    fontFamily: 'Courier',
    fontSize: 13,
    lineHeight: 20,
  },
});
