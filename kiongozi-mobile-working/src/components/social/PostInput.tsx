import React, { useState, useRef } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import apiClient from '../../utils/apiClient';

interface PostInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  autoFocus?: boolean;
}

const MAX_CHARS = 280;

export function PostInput({ value, onChangeText, placeholder = "What's happening in Kenya?", autoFocus }: PostInputProps) {
  const [suggestions, setSuggestions] = useState<Array<{ id: string; username: string; full_name: string }>>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const remaining = MAX_CHARS - value.length;
  const isNearLimit = remaining <= 20;
  const isOverLimit = remaining < 0;

  const handleChange = (text: string) => {
    onChangeText(text);

    // Detect @mention typing
    const match = text.match(/@(\w*)$/);
    if (match) {
      const query = match[1];
      setMentionQuery(query);
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(async () => {
        if (query.length >= 1) {
          try {
            const res = await apiClient.searchSocial(query);
            if (res.success && res.data?.users) {
              setSuggestions(res.data.users.slice(0, 5));
            }
          } catch {}
        } else {
          setSuggestions([]);
        }
      }, 300);
    } else {
      setMentionQuery(null);
      setSuggestions([]);
    }
  };

  const insertMention = (username: string) => {
    const newText = value.replace(/@\w*$/, `@${username} `);
    onChangeText(newText);
    setSuggestions([]);
    setMentionQuery(null);
  };

  return (
    <View>
      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map(user => (
            <TouchableOpacity
              key={user.id}
              style={styles.suggestion}
              onPress={() => insertMention(user.username)}
            >
              <Text style={styles.suggestionName}>{user.full_name}</Text>
              <Text style={styles.suggestionUsername}>@{user.username}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TextInput
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor="#a0aec0"
        multiline
        maxLength={MAX_CHARS + 10}
        autoFocus={autoFocus}
        style={styles.input}
      />

      {isNearLimit && (
        <Text style={[styles.counter, isOverLimit && styles.overLimit]}>
          {remaining}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    fontSize: 18,
    color: '#1a202c',
    minHeight: 80,
    textAlignVertical: 'top',
    paddingVertical: 8,
  },
  counter: {
    textAlign: 'right',
    color: '#a0aec0',
    fontSize: 13,
    marginTop: 4,
  },
  overLimit: {
    color: '#e53e3e',
  },
  suggestions: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  suggestionName: {
    fontWeight: '600',
    color: '#1a202c',
    fontSize: 14,
  },
  suggestionUsername: {
    color: '#718096',
    fontSize: 13,
  }
});
