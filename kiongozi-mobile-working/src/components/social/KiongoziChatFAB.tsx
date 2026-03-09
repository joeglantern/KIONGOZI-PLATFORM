import React from 'react';
import { TouchableOpacity, StyleSheet, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface KiongoziChatFABProps {
  onPress: () => void;
}

export function KiongoziChatFAB({ onPress }: KiongoziChatFABProps) {
  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.inner}>
        <Ionicons name="hardware-chip" size={22} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1a365d',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
