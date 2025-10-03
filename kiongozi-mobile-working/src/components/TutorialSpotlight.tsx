import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TutorialSpotlightProps {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
  darkMode?: boolean;
}

export default function TutorialSpotlight({
  x,
  y,
  width,
  height,
  borderRadius = 12,
  darkMode = false,
}: TutorialSpotlightProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulsing animation for the spotlight ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Dark overlay */}
      <View style={styles.overlay} pointerEvents="none">
        {/* Top section */}
        <View style={[styles.overlaySection, { height: y }]} />

        {/* Middle section with spotlight */}
        <View style={{ flexDirection: 'row', height }}>
          {/* Left */}
          <View style={[styles.overlaySection, { width: x }]} />

          {/* Spotlight cutout (transparent) */}
          <View style={{ width, height }} />

          {/* Right */}
          <View style={[styles.overlaySection, { flex: 1 }]} />
        </View>

        {/* Bottom section */}
        <View style={[styles.overlaySection, { flex: 1 }]} />
      </View>

      {/* Animated spotlight ring */}
      <Animated.View
        style={[
          styles.spotlightRing,
          {
            left: x - 4,
            top: y - 4,
            width: width + 8,
            height: height + 8,
            borderRadius: borderRadius + 4,
            transform: [{ scale: pulseAnim }],
            borderColor: darkMode ? '#60a5fa' : '#3b82f6',
          },
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlaySection: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  spotlightRing: {
    position: 'absolute',
    borderWidth: 2,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
});
