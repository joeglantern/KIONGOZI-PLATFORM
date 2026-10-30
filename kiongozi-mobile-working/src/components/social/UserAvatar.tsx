import React from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useThemeStore } from '../../stores/themeStore';

// Muted discs for people without a photo; the colour is picked from the name so it never changes.
const AVATAR_PALETTE = ['#0F5132', '#8A3B12', '#1D3A6E', '#5B2A6E', '#2F5D3A', '#6E4A1D', '#3A3A6E'];

function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function initialsOf(name: string) {
  const words = name.replace(/^@/, '').trim().split(/[\s._-]+/).filter(Boolean);
  return words.slice(0, 2).map(w => Array.from(w)[0] ?? '').join('').toUpperCase();
}

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
  /** Full name or username — used for the initials fallback when there is no photo */
  name?: string;
  /** Grey disc with grey initials instead of the name-coloured one (e.g. your own "add story" tile) */
  neutral?: boolean;
}

export function UserAvatar({
  avatarUrl,
  size = 40,
  isBot = false,
  isVerified = false,
  editable = false,
  onPress,
  uploading = false,
  name,
  neutral = false,
}: UserAvatarProps) {
  const radius = size / 2;
  const T = useTheme();
  const isDark = useThemeStore(s => s.isDark);
  const iconSize = Math.max(size * 0.48, 16);
  const initials = name?.trim() ? initialsOf(name) : '';

  const inner = (
    <View style={{ width: size, height: size }}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl, cache: 'force-cache' }}
          style={{ width: size, height: size, borderRadius: radius, backgroundColor: T.surface2 }}
        />
      ) : initials ? (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: radius, backgroundColor: neutral ? (isDark ? '#2A2A2E' : '#E5E5EA') : colorFor(name!.trim().toLowerCase()) }]}>
          <Text
            style={{ color: neutral ? (isDark ? '#D1D1D6' : '#6C6C70') : '#FFFFFF', fontFamily: 'SpaceGrotesk_700Bold', fontSize: size * 0.30, includeFontPadding: false }}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {initials}
          </Text>
        </View>
      ) : (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: radius, backgroundColor: T.surface2 }]}>
          <Ionicons name="person" size={iconSize} color={T.textMuted} />
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

      {/* Bot badge only — verified badge renders next to the name, not on the avatar */}
      {isBot && !editable && (
        <View style={[styles.badge, { bottom: -2, right: -2 }]}>
          <Ionicons name="sparkles" size={size * 0.32} color="#3FA845" />
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
  },
});
