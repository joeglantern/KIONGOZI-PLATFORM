import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  size?: number;
}

/**
 * Accent-green disc with a black check (design: 16×16 circle, check stroke 1.8).
 * The check is an L (bottom + right borders) rotated 45°, nudged so its corner lands where the
 * design path's corner sits (7, 10.5 in a 16 box).
 */
export function VerifiedBadge({ size = 15 }: Props) {
  const T = useTheme();
  const k = size / 16;
  const stroke = Math.max(1.2, 1.8 * k);
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Verified"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' }}
    >
      <View
        style={{
          width: 4.2 * k,
          height: 8 * k,
          borderRightWidth: stroke,
          borderBottomWidth: stroke,
          borderColor: '#000',
          borderBottomRightRadius: stroke / 2,
          transform: [{ translateX: 0.1 * k }, { translateY: -0.9 * k }, { rotate: '45deg' }],
        }}
      />
    </View>
  );
}
