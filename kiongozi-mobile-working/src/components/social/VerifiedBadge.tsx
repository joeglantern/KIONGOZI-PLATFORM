import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  size?: number;
}

const BLUE = '#1D9BF0';

export function VerifiedBadge({ size = 15 }: Props) {
  const sq = size * 0.72;
  const r = sq * 0.18;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* 4 rotated squares at 22.5° steps → 8-point zigzag seal */}
      {([0, 22.5, 45, 67.5] as const).map((deg) => (
        <View
          key={deg}
          style={{
            position: 'absolute',
            width: sq,
            height: sq,
            borderRadius: r,
            backgroundColor: BLUE,
            transform: [{ rotate: `${deg}deg` }],
          }}
        />
      ))}
      {/* Thin italic ✓ — positioned absolutely so it sits dead-center in the seal */}
      <Text
        style={{
          position: 'absolute',
          zIndex: 1,
          color: '#fff',
          fontSize: size * 0.52,
          fontWeight: '300',
          fontStyle: 'italic',
          width: size,
          textAlign: 'center',
          lineHeight: size,
          includeFontPadding: false,
        }}
      >
        ✓
      </Text>
    </View>
  );
}
