import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface TutorialTooltipProps {
  text: string;
  x: number;
  y: number;
  darkMode?: boolean;
}

export default function TutorialTooltip({
  text,
  x,
  y,
  darkMode = false,
}: TutorialTooltipProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.tooltip,
        darkMode && styles.tooltipDark,
        {
          left: x,
          top: y,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="none"
    >
      <Text style={[styles.tooltipText, darkMode && styles.tooltipTextDark]}>
        {text}
      </Text>
      {/* Arrow pointing up */}
      <View style={[styles.arrow, darkMode && styles.arrowDark]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    maxWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 1001,
  },
  tooltipDark: {
    backgroundColor: '#1f2937',
    shadowColor: '#000',
    shadowOpacity: 0.2,
  },
  tooltipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 22,
  },
  tooltipTextDark: {
    color: '#f9fafb',
  },
  arrow: {
    position: 'absolute',
    top: -6,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#ffffff',
  },
  arrowDark: {
    borderBottomColor: '#1f2937',
  },
});
