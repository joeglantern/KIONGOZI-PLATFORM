import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_W } = Dimensions.get('window');

interface Slide {
  emoji: string;
  title: string;
  subtitle: string;
  bg: string;
}

const SLIDES: Slide[] = [
  {
    emoji: '🇰🇪',
    title: 'Welcome to Kiongozi',
    subtitle: 'Your civic education companion. Learn, engage, and stay informed.',
    bg: '#1a365d',
  },
  {
    emoji: '📚',
    title: 'Stay Informed',
    subtitle:
      'Access civic education modules, understand your rights, and follow government matters.',
    bg: '#2b6cb0',
  },
  {
    emoji: '🤝',
    title: 'Connect & Engage',
    subtitle:
      'Follow others, post your thoughts, and chat with the @kiongozi AI assistant.',
    bg: '#276749',
  },
];

interface Props {
  onDone: () => void;
}

export default function OnboardingScreen({ onDone }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const goToSlide = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_W, animated: true });
    setActiveIndex(index);
  };

  const handleScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setActiveIndex(index);
  };

  const handleDone = async () => {
    await AsyncStorage.setItem('onboarding_done', 'true');
    onDone();
  };

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { backgroundColor: slide.bg }]}>
            <SafeAreaView style={styles.safeSlide}>
              {/* Skip button on slides 0 and 1 */}
              {!isLast && activeIndex === i && (
                <TouchableOpacity style={styles.skipBtn} onPress={handleDone}>
                  <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
              )}

              <View style={styles.content}>
                <Text style={styles.emoji}>{slide.emoji}</Text>
                <Text style={styles.title}>{slide.title}</Text>
                <Text style={styles.subtitle}>{slide.subtitle}</Text>
              </View>

              {/* Dots */}
              <View style={styles.dots}>
                {SLIDES.map((_, di) => (
                  <View
                    key={di}
                    style={[styles.dot, di === i && styles.dotActive]}
                  />
                ))}
              </View>

              {/* Bottom CTA */}
              <View style={styles.bottomArea}>
                {i === SLIDES.length - 1 ? (
                  <TouchableOpacity style={styles.getStartedBtn} onPress={handleDone}>
                    <Text style={styles.getStartedText}>Get Started</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.nextBtn}
                    onPress={() => goToSlide(i + 1)}
                  >
                    <Text style={styles.nextText}>Next →</Text>
                  </TouchableOpacity>
                )}
              </View>
            </SafeAreaView>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  slide: { width: SCREEN_W, flex: 1 },
  safeSlide: { flex: 1 },
  skipBtn: {
    alignSelf: 'flex-end',
    padding: 16,
    marginTop: 8,
    marginRight: 8,
  },
  skipText: { color: 'rgba(255,255,255,0.75)', fontSize: 15 },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emoji: { fontSize: 72, marginBottom: 24 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: { backgroundColor: '#fff', width: 20 },
  bottomArea: {
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  nextBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  getStartedBtn: {
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  getStartedText: { color: '#1a365d', fontSize: 18, fontWeight: '800' },
});
