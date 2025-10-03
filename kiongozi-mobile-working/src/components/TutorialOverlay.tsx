import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import TutorialSpotlight from './TutorialSpotlight';
import AnimatedPointer from './AnimatedPointer';
import TutorialTooltip from './TutorialTooltip';
import { markTutorialAsSeen } from '../utils/tutorialStorage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TutorialStep {
  id: number;
  spotlightX: number;
  spotlightY: number;
  spotlightWidth: number;
  spotlightHeight: number;
  pointerType: 'swipe-left' | 'swipe-right' | 'tap';
  pointerX: number;
  pointerY: number;
  tooltipText: string;
  tooltipX: number;
  tooltipY: number;
}

interface TutorialOverlayProps {
  visible: boolean;
  onComplete: () => void;
  darkMode?: boolean;
}

export default function TutorialOverlay({
  visible,
  onComplete,
  darkMode = false,
}: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Define tutorial steps
  const steps: TutorialStep[] = [
    // Step 1: Suggestions Button (centered on screen, below title with 40px margin)
    {
      id: 1,
      spotlightX: SCREEN_WIDTH / 2 - 105,
      spotlightY: SCREEN_HEIGHT / 2 + 50,
      spotlightWidth: 210,
      spotlightHeight: 48,
      pointerType: 'tap',
      pointerX: SCREEN_WIDTH / 2 - 30,
      pointerY: SCREEN_HEIGHT / 2 + 115,
      tooltipText: 'Tap here to see suggestions',
      tooltipX: SCREEN_WIDTH / 2 - 110,
      tooltipY: SCREEN_HEIGHT / 2 + 180,
    },
    // Step 2: Menu
    {
      id: 2,
      spotlightX: 16,
      spotlightY: Platform.OS === 'ios' ? 60 : 20,
      spotlightWidth: 80,
      spotlightHeight: 44,
      pointerType: 'tap',
      pointerX: 30,
      pointerY: Platform.OS === 'ios' ? 110 : 70,
      tooltipText: 'Tap here to see your conversations',
      tooltipX: SCREEN_WIDTH / 2 - 140,
      tooltipY: Platform.OS === 'ios' ? 160 : 120,
    },
    // Step 3: Input
    {
      id: 3,
      spotlightX: 16,
      spotlightY: SCREEN_HEIGHT - 100,
      spotlightWidth: SCREEN_WIDTH - 32,
      spotlightHeight: 60,
      pointerType: 'tap',
      pointerX: SCREEN_WIDTH / 2 - 28,
      pointerY: SCREEN_HEIGHT - 160,
      tooltipText: 'Ask me anything to get started',
      tooltipX: SCREEN_WIDTH / 2 - 140,
      tooltipY: SCREEN_HEIGHT - 200,
    },
  ];

  const currentStepData = steps[currentStep];

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Tutorial complete
      await markTutorialAsSeen();
      onComplete();
    }
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await markTutorialAsSeen();
    onComplete();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Spotlight */}
        <TutorialSpotlight
          x={currentStepData.spotlightX}
          y={currentStepData.spotlightY}
          width={currentStepData.spotlightWidth}
          height={currentStepData.spotlightHeight}
          darkMode={darkMode}
        />

        {/* Animated Pointer */}
        <AnimatedPointer
          type={currentStepData.pointerType}
          x={currentStepData.pointerX}
          y={currentStepData.pointerY}
          darkMode={darkMode}
        />

        {/* Tooltip */}
        <TutorialTooltip
          text={currentStepData.tooltipText}
          x={currentStepData.tooltipX}
          y={currentStepData.tooltipY}
          darkMode={darkMode}
        />

        {/* Controls */}
        <View style={styles.controls}>
          {/* Skip Button */}
          <TouchableOpacity
            style={[styles.skipButton, darkMode && styles.skipButtonDark]}
            onPress={handleSkip}
          >
            <Text style={[styles.skipText, darkMode && styles.skipTextDark]}>
              Skip
            </Text>
          </TouchableOpacity>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index === currentStep && styles.progressDotActive,
                  index === currentStep && darkMode && styles.progressDotActiveDark,
                ]}
              />
            ))}
          </View>

          {/* Next/Finish Button */}
          <TouchableOpacity
            style={[styles.nextButton, darkMode && styles.nextButtonDark]}
            onPress={handleNext}
          >
            <Text style={styles.nextText}>
              {currentStep === steps.length - 1 ? 'Got it!' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  skipButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  skipButtonDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  skipText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipTextDark: {
    color: '#f3f4f6',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  progressDotActive: {
    backgroundColor: '#ffffff',
    width: 28,
  },
  progressDotActiveDark: {
    backgroundColor: '#f3f4f6',
  },
  nextButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  nextButtonDark: {
    backgroundColor: '#2563eb',
    shadowColor: '#60a5fa',
  },
  nextText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
