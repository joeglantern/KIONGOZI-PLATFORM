import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ViewToken,
  Image,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const NAVY = '#5CB85C';
const GRAY = '#8E8E93';
const LIGHT = '#2A2A2A';

const SLIDES = [
  {
    id: '1',
    title: 'Welcome to Kiongozi',
    subtitle: 'A space where young Kenyans connect, share, and shape conversations that matter.',
    image: require('../../assets/onboarding/slide1.png'),
  },
  {
    id: '2',
    title: 'Built for Civic Life',
    subtitle: 'Connect with other young Kenyans, share posts, and join conversations on topics that matter to your community.',
    image: require('../../assets/onboarding/slide2.png'),
  },
  {
    id: '3',
    title: 'Your Civic Guide',
    subtitle: 'Get clear answers on the Constitution, governance, and public finance. One tap from anywhere in the app.',
    image: require('../../assets/onboarding/slide3.png'),
  },
];

interface SlideItemProps {
  item: typeof SLIDES[0];
  isActive: boolean;
}

function SlideItem({ item, isActive }: SlideItemProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (isActive) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.92);
    }
  }, [isActive]);

  return (
    <View style={styles.slide}>
      <Animated.View
        style={[
          styles.imageWrapper,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Image
          source={item.image}
          style={styles.image}
          resizeMode="contain"
        />
      </Animated.View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </View>
  );
}

interface Props {
  onDone: () => void;
}

export default function OnboardingScreen({ onDone }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const finish = useCallback(async () => {
    await AsyncStorage.setItem('onboarding_done', 'true');
    onDone();
  }, [onDone]);

  const handleNext = useCallback(() => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      finish();
    }
  }, [activeIndex, finish]);

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {!isLast ? (
        <TouchableOpacity
          style={styles.skip}
          onPress={finish}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.skipPlaceholder} />
      )}

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index }) => (
          <SlideItem item={item} isActive={index === activeIndex} />
        )}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 28 }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleNext} activeOpacity={0.82}>
          <Text style={styles.btnText}>{isLast ? 'Get Started' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  skip: {
    alignSelf: 'flex-end',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  skipPlaceholder: {
    height: 44,
  },
  skipText: {
    fontSize: 15,
    color: GRAY,
    fontWeight: '500',
  },
  slide: {
    width,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  imageWrapper: {
    width: width - 32,
    height: height * 0.42,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: NAVY,
    textAlign: 'center',
    marginTop: 28,
    letterSpacing: -0.6,
    lineHeight: 36,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  subtitle: {
    fontSize: 15.5,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 25,
    fontWeight: '400',
    paddingHorizontal: 8,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 28,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 22,
    backgroundColor: NAVY,
  },
  dotInactive: {
    width: 6,
    backgroundColor: LIGHT,
  },
  btn: {
    backgroundColor: NAVY,
    width: width - 48,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.2,
  },
});
