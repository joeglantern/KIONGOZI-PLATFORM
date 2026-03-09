import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UserAvatarProps {
  avatarUrl?: string;
  size?: number;
  isBot?: boolean;
  isVerified?: boolean;
}

export function UserAvatar({ avatarUrl, size = 40, isBot = false, isVerified = false }: UserAvatarProps) {
  return (
    <View style={{ width: size, height: size }}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
          <Ionicons name="person" size={size * 0.5} color="#718096" />
        </View>
      )}
      {(isBot || isVerified) && (
        <View style={[styles.badge, { bottom: -2, right: -2 }]}>
          <Ionicons
            name={isBot ? 'hardware-chip' : 'checkmark-circle'}
            size={size * 0.35}
            color={isBot ? '#805ad5' : '#3182ce'}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: '#e2e8f0',
  },
  placeholder: {
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 10,
  }
});
