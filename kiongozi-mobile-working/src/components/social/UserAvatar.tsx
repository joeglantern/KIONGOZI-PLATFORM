import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UserAvatarProps {
  avatarUrl?: string;
  size?: number;
  isBot?: boolean;
  isVerified?: boolean;
  /** Show camera overlay and make tappable */
  editable?: boolean;
  /** Called when tapped in editable mode */
  onPress?: () => void;
  /** Show a loading spinner over the avatar */
  uploading?: boolean;
}

export function UserAvatar({
  avatarUrl,
  size = 40,
  isBot = false,
  isVerified = false,
  editable = false,
  onPress,
  uploading = false,
}: UserAvatarProps) {
  const radius = size / 2;
  const iconSize = Math.max(size * 0.48, 16);

  const inner = (
    <View style={{ width: size, height: size }}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size, borderRadius: radius, backgroundColor: '#e2e8f0' }}
        />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: radius }]}>
          <Ionicons name="person" size={iconSize} color="#718096" />
        </View>
      )}

      {/* Camera overlay when editable */}
      {editable && !uploading && (
        <View style={[styles.editOverlay, { borderRadius: radius }]}>
          <Ionicons name="camera" size={size * 0.28} color="#fff" />
        </View>
      )}

      {/* Upload spinner */}
      {uploading && (
        <View style={[styles.editOverlay, { borderRadius: radius }]}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      )}

      {/* Bot / verified badge */}
      {(isBot || isVerified) && !editable && (
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

  if (editable && onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {inner}
      </TouchableOpacity>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 10,
  },
});
