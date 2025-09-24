import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

interface CustomToastProps {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
  darkMode?: boolean;
  onHide: () => void;
}

const { width } = Dimensions.get('window');

export default function CustomToast({
  visible,
  message,
  type,
  darkMode = false,
  onHide,
}: CustomToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Modern bounce-in animation
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 120,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Icon animation with delay
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(iconScale, {
            toValue: 1,
            tension: 150,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.timing(iconRotate, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      }, 200);

      // Auto hide after 2.5 seconds
      const timer = setTimeout(() => {
        hideToast();
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Reset animations for next use
      iconScale.setValue(0);
      iconRotate.setValue(0);
      onHide();
    });
  };

  if (!visible) return null;

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: darkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
          border: '#10b981',
          icon: '#10b981',
          gradient: darkMode ? ['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.05)'] : ['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.02)']
        };
      case 'error':
        return {
          bg: darkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
          border: '#ef4444',
          icon: '#ef4444',
          gradient: darkMode ? ['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.05)'] : ['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.02)']
        };
      case 'info':
      default:
        return {
          bg: darkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
          border: '#3b82f6',
          icon: '#3b82f6',
          gradient: darkMode ? ['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0.05)'] : ['rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0.02)']
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'info':
      default:
        return 'i';
    }
  };

  const colors = getColors();
  const iconRotateInterpolated = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <View style={[
        styles.toast,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
        darkMode ? styles.toastDark : styles.toastLight
      ]}>
        {/* Modern icon with circle background */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              backgroundColor: colors.icon,
              transform: [
                { scale: iconScale },
                { rotate: iconRotateInterpolated }
              ],
            },
          ]}
        >
          <Text style={[styles.icon, { color: '#ffffff' }]}>
            {getIcon()}
          </Text>
        </Animated.View>

        {/* Message with modern typography */}
        <View style={styles.messageContainer}>
          <Text style={[
            styles.message,
            darkMode ? styles.messageDark : styles.messageLight
          ]}>
            {message}
          </Text>
        </View>

        {/* Modern accent line */}
        <View style={[styles.accentLine, { backgroundColor: colors.border }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    maxWidth: width - 40,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  toastLight: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  toastDark: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  icon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageContainer: {
    flex: 1,
  },
  message: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  messageLight: {
    color: '#1f2937',
  },
  messageDark: {
    color: '#f9fafb',
  },
  accentLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
});