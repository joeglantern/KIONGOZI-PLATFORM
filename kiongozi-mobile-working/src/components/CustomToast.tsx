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

  useEffect(() => {
    if (visible) {
      // Simple slide in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after 2 seconds
      const timer = setTimeout(() => {
        hideToast();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  const getConfig = () => {
    switch (type) {
      case 'success':
        return {
          bg: darkMode ? '#1f2937' : '#ffffff',
          text: darkMode ? '#f9fafb' : '#111827',
          icon: '✓',
          iconBg: '#10b981',
        };
      case 'error':
        return {
          bg: darkMode ? '#1f2937' : '#ffffff',
          text: darkMode ? '#f9fafb' : '#111827',
          icon: '✕',
          iconBg: '#ef4444',
        };
      case 'info':
      default:
        return {
          bg: darkMode ? '#1f2937' : '#ffffff',
          text: darkMode ? '#f9fafb' : '#111827',
          icon: 'ℹ',
          iconBg: '#3b82f6',
        };
    }
  };

  const config = getConfig();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={[
        styles.toast,
        { backgroundColor: config.bg },
        darkMode && styles.toastDark
      ]}>
        <View style={[styles.iconContainer, { backgroundColor: config.iconBg }]}>
          <Text style={styles.icon}>{config.icon}</Text>
        </View>

        <Text style={[styles.message, { color: config.text }]}>
          {message}
        </Text>
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
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  toastDark: {
    shadowOpacity: 0.3,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});
