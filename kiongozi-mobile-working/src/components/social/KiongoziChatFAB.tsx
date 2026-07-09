import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Animated, Image } from 'react-native';

interface KiongoziChatFABProps {
  onPress: () => void;
}

export function KiongoziChatFAB({ onPress }: KiongoziChatFABProps) {
  const scale = useRef(new Animated.Value(0.82)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      tension: 55,
      friction: 6,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.fab, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={styles.inner}
        onPress={onPress}
        activeOpacity={0.82}
      >
        <Image
          source={require('../../../assets/kchat-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1a365d',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 26,
  },
  logo: {
    width: 38,
    height: 38,
  },
});
