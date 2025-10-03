import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface EmailVerificationModalProps {
  visible: boolean;
  email: string;
  onResendEmail: () => void;
  onVerifyCheck: () => void;
  onClose: () => void;
  darkMode?: boolean;
  resending?: boolean;
}

export default function EmailVerificationModal({
  visible,
  email,
  onResendEmail,
  onVerifyCheck,
  onClose,
  darkMode = false,
  resending = false,
}: EmailVerificationModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Modal entrance animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Mail icon pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(0.95);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const handleResend = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onResendEmail();
  };

  const handleVerifyCheck = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onVerifyCheck();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          darkMode && styles.overlayDark,
          { opacity: fadeAnim },
        ]}
      >
        <Animated.View
          style={[
            styles.card,
            darkMode && styles.cardDark,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          {/* Mail Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              darkMode && styles.iconContainerDark,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={40}
              color={darkMode ? '#60a5fa' : '#3b82f6'}
            />
          </Animated.View>

          {/* Heading */}
          <Text style={[styles.heading, darkMode && styles.headingDark]}>
            Check your email
          </Text>

          {/* Body Text */}
          <Text style={[styles.bodyText, darkMode && styles.bodyTextDark]}>
            We sent a verification link to
          </Text>

          {/* Email Display */}
          <Text style={[styles.emailText, darkMode && styles.emailTextDark]}>
            {email}
          </Text>

          <Text style={[styles.bodyText, darkMode && styles.bodyTextDark]}>
            Click the link to activate your account.
          </Text>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            {/* Resend Button */}
            <TouchableOpacity
              style={[styles.resendButton, darkMode && styles.resendButtonDark]}
              onPress={handleResend}
              disabled={resending}
              activeOpacity={0.7}
            >
              {resending ? (
                <ActivityIndicator size="small" color={darkMode ? '#60a5fa' : '#3b82f6'} />
              ) : (
                <Text style={[styles.resendButtonText, darkMode && styles.resendButtonTextDark]}>
                  Resend email
                </Text>
              )}
            </TouchableOpacity>

            {/* Verify Button */}
            <TouchableOpacity
              style={[styles.verifyButton, darkMode && styles.verifyButtonDark]}
              onPress={handleVerifyCheck}
              activeOpacity={0.8}
            >
              <Text style={styles.verifyButtonText}>I verified my email</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  overlayDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  cardDark: {
    backgroundColor: '#1f2937',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainerDark: {
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  headingDark: {
    color: '#f9fafb',
  },
  bodyText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  bodyTextDark: {
    color: '#9ca3af',
  },
  emailText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3b82f6',
    textAlign: 'center',
    marginBottom: 8,
  },
  emailTextDark: {
    color: '#60a5fa',
  },
  buttonsContainer: {
    width: '100%',
    marginTop: 24,
    gap: 12,
  },
  resendButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  resendButtonDark: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  resendButtonTextDark: {
    color: '#d1d5db',
  },
  verifyButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  verifyButtonDark: {
    backgroundColor: '#2563eb',
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
