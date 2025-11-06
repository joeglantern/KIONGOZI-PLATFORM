import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export const AnimatedSplashScreen: React.FC = () => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    // Fade in + scale up (0 to 1.5s)
    opacity.value = withTiming(1, {
      duration: 1500,
      easing: Easing.out(Easing.cubic),
    });

    // Scale animation sequence
    scale.value = withSequence(
      // Scale from 0.8 to 1.0 (0 to 1.5s)
      withTiming(1.0, {
        duration: 1500,
        easing: Easing.out(Easing.cubic),
      }),
      // Hold at 1.0 (1.5s to 2.5s)
      withTiming(1.0, {
        duration: 1000,
      }),
      // Scale to 1.1 and fade out (2.5s to 3.0s)
      withTiming(1.1, {
        duration: 500,
        easing: Easing.in(Easing.cubic),
      })
    );

    // Start fade out at 2.5s
    const fadeOutTimer = setTimeout(() => {
      opacity.value = withTiming(0, {
        duration: 500,
        easing: Easing.in(Easing.cubic),
      });
    }, 2500);

    return () => clearTimeout(fadeOutTimer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, animatedStyle]}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: width * 0.4, // 40% of screen width
    height: width * 0.4 * 0.67, // Maintain aspect ratio (logo is ~861x580)
    maxWidth: 300,
    maxHeight: 200,
  },
});
