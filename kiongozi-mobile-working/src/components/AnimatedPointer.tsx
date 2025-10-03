import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AnimatedPointerProps {
  type: 'swipe-left' | 'swipe-right' | 'tap';
  x: number;
  y: number;
  darkMode?: boolean;
}

export default function AnimatedPointer({
  type,
  x,
  y,
  darkMode = false,
}: AnimatedPointerProps) {
  const moveAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (type === 'tap') {
      // Tap animation - bigger bounce and fade
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.spring(scaleAnim, {
              toValue: 1.3,
              tension: 80,
              friction: 6,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.7,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.spring(scaleAnim, {
              toValue: 1,
              tension: 80,
              friction: 6,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    } else {
      // Swipe animation - slide back and forth
      Animated.loop(
        Animated.sequence([
          Animated.timing(moveAnim, {
            toValue: type === 'swipe-left' ? -30 : 30,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(moveAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [type]);

  const getIcon = () => {
    switch (type) {
      case 'swipe-left':
        return 'arrow-back';
      case 'swipe-right':
        return 'arrow-forward';
      case 'tap':
        return 'hand-left-outline';
      default:
        return 'hand-left-outline';
    }
  };

  return (
    <Animated.View
      style={[
        styles.pointer,
        {
          left: x,
          top: y,
          transform: [
            { translateX: moveAnim },
            { scale: scaleAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.iconContainer, darkMode && styles.iconContainerDark]}>
        <Ionicons
          name={getIcon()}
          size={32}
          color={darkMode ? '#60a5fa' : '#3b82f6'}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pointer: {
    position: 'absolute',
    zIndex: 1000,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  iconContainerDark: {
    backgroundColor: 'rgba(31, 41, 55, 0.98)',
    shadowColor: '#60a5fa',
  },
});
