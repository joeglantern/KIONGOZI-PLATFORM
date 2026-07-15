import React from 'react';
import { StyleSheet, View } from 'react-native';

interface NoiseOverlayProps {
  opacity?: number;
}

// Subtle repeating diagonal stripe pattern approximating a noise texture.
// At design opacity (0.045) it's nearly invisible; safe to use on both platforms.
export function NoiseOverlay({ opacity = 0.045 }: NoiseOverlayProps) {
  return (
    <View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      {ROWS.map((_, row) => (
        <View key={row} style={styles.row}>
          {COLS.map((_, col) => (
            <View
              key={col}
              style={[
                styles.dot,
                { opacity: ((row + col) % 3 === 0) ? 1 : (((row + col) % 3 === 1) ? 0.5 : 0.15) },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const DOT = 2;
const GAP = 4;
const ROWS = Array(60).fill(0);
const COLS = Array(100).fill(0);

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  dot: { width: DOT, height: DOT, borderRadius: 1, backgroundColor: '#808080', margin: GAP / 2 },
});
