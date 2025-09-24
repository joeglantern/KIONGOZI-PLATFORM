import React from 'react';
import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

interface ModernSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  darkMode?: boolean;
  disabled?: boolean;
}

export default function ModernSwitch({
  value,
  onValueChange,
  darkMode = false,
  disabled = false
}: ModernSwitchProps) {
  const animatedValue = React.useRef(new Animated.Value(value ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: value ? 1 : 0,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  }, [value]);

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(!value);
  };

  const trackColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: darkMode
      ? ['rgba(75, 85, 99, 0.6)', '#3b82f6']
      : ['rgba(156, 163, 175, 0.4)', '#3b82f6']
  });

  const thumbTranslateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22]
  });

  const thumbScale = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.1, 1]
  });

  return (
    <TouchableOpacity
      style={[
        styles.container,
        disabled && styles.disabled
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.track,
          {
            backgroundColor: trackColor,
          }
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            darkMode && styles.thumbDark,
            {
              transform: [
                { translateX: thumbTranslateX },
                { scale: thumbScale }
              ]
            }
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  track: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    position: 'relative',
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
    position: 'absolute',
  },
  thumbDark: {
    backgroundColor: '#f9fafb',
  },
  disabled: {
    opacity: 0.5,
  },
});