import React from 'react';
import { View } from 'react-native';

interface Props {
  size?: number;
}

const BLUE = '#1D9BF0';

/**
 * Blue zigzag seal with a white check: four rounded squares rotated in 22.5° steps make the
 * 8-point seal, and the check is an L (bottom + right borders) rotated 45° so it renders the same
 * on every platform and font.
 */
export function VerifiedBadge({ size = 15 }: Props) {
  const k = size / 16;
  const sq = size * 0.72;
  const stroke = Math.max(1.2, 1.7 * k);
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Verified"
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      {([0, 22.5, 45, 67.5] as const).map(deg => (
        <View
          key={deg}
          style={{
            position: 'absolute',
            width: sq,
            height: sq,
            borderRadius: sq * 0.18,
            backgroundColor: BLUE,
            transform: [{ rotate: `${deg}deg` }],
          }}
        />
      ))}
      <View
        style={{
          width: 3.8 * k,
          height: 7.2 * k,
          borderRightWidth: stroke,
          borderBottomWidth: stroke,
          borderColor: '#fff',
          borderBottomRightRadius: stroke / 2,
          transform: [{ translateY: -0.8 * k }, { rotate: '45deg' }],
        }}
      />
    </View>
  );
}
