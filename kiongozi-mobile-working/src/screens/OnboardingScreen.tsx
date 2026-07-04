import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ViewToken,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const NAVY = '#1a365d';
const GRAY = '#718096';
const LIGHT = '#e2e8f0';

const SLIDES = [
  {
    id: '1',
    title: 'Welcome to Kiongozi',
    subtitle: 'A space where young Kenyans connect, share, and shape conversations that matter.',
    lottie: require('../../assets/lottie/community.json'),
  },
  {
    id: '2',
    title: 'Built for Civic Life',
    subtitle: 'Track public spending, submit your views on policy, and run advocacy campaigns with tools built for real impact.',
    lottie: require('../../assets/lottie/tools.json'),
  },
  {
    id: '3',
    title: 'Your Civic Guide',
    subtitle: 'Get clear answers on the Constitution, governance, and public finance. One tap from anywhere in the app.',
    lottie: require('../../assets/lottie/chat.json'),
  },
];

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
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.animContainer}>
              <LottieView
                source={item.lottie}
                autoPlay
                loop
                style={styles.anim}
              />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
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
    backgroundColor: '#ffffff',
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
    paddingHorizontal: 32,
  },
  animContainer: {
    width: width * 0.72,
    height: height * 0.38,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  anim: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 27,
    fontWeight: '700',
    color: NAVY,
    textAlign: 'center',
    marginTop: 32,
    letterSpacing: -0.3,
    lineHeight: 35,
  },
  subtitle: {
    fontSize: 16,
    color: '#4a5568',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 26,
    fontWeight: '400',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 28,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: NAVY,
  },
  dotInactive: {
    width: 7,
    backgroundColor: LIGHT,
  },
  btn: {
    backgroundColor: NAVY,
    width: width - 48,
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
