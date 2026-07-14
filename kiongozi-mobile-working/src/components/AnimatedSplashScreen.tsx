import React from 'react';
import { View, Image, StyleSheet, Dimensions, useColorScheme } from 'react-native';
import { useThemeStore } from '../stores/themeStore';

const { width } = Dimensions.get('window');

export const AnimatedSplashScreen: React.FC = () => {
  const isDark = useThemeStore(s => s.isDark);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
      <Image
        source={require('../../assets/kchat-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: width * 0.5,
    height: width * 0.5 * 0.67,
    maxWidth: 280,
    maxHeight: 190,
  },
});
