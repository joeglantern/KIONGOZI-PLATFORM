import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
  Dimensions,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface ModernMessageInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
  darkMode?: boolean;
  loading?: boolean;
  isGenerating?: boolean;
  onStopGenerating?: () => void;
  disabled?: boolean;
  maxLength?: number;
  onQuickActionsPress?: () => void;
}

export default function ModernMessageInput({
  value,
  onChangeText,
  onSend,
  placeholder = "Ask me anything...",
  darkMode = false,
  loading = false,
  isGenerating = false,
  onStopGenerating,
  disabled = false,
  maxLength = 1000,
  onQuickActionsPress,
}: ModernMessageInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [inputHeight, setInputHeight] = useState(44);

  const textInputRef = useRef<TextInput>(null);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const sendButtonScale = useRef(new Animated.Value(0.9)).current;
  const sendButtonRotation = useRef(new Animated.Value(0)).current;
  const heightAnimValue = useRef(new Animated.Value(44)).current;

  const canSend = value.trim().length > 0 && !loading && !disabled;

  // Disable focus animation on iOS to prevent glitching
  useEffect(() => {
    if (Platform.OS === 'ios') {
      // Skip animation on iOS
      return;
    }
    Animated.spring(focusAnim, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  }, [isFocused]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(sendButtonScale, {
        toValue: canSend ? 1 : 0.9,
        useNativeDriver: true,
        tension: 200,
        friction: 10,
      }),
      Animated.timing(sendButtonRotation, {
        toValue: canSend ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, [canSend]);

  const handleFocus = () => {
    setIsFocused(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleSend = () => {
    if (!canSend) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Add a satisfying send animation
    Animated.sequence([
      Animated.timing(sendButtonScale, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(sendButtonScale, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start();

    // Dismiss keyboard after sending
    textInputRef.current?.blur();
    Keyboard.dismiss();

    onSend();
  };

  const handleContentSizeChange = (event: any) => {
    if (Platform.OS === 'ios') {
      // Disable dynamic height on iOS to prevent glitching
      return;
    }
    const { height } = event.nativeEvent.contentSize;
    const maxHeight = 120; // About 4 lines
    const minHeight = 44;
    const newHeight = Math.max(minHeight, Math.min(maxHeight, height + 20));
    setInputHeight(newHeight);
  };

  // Animated styles - simplified for iOS
  const containerBorderColor = Platform.OS === 'ios'
    ? (isFocused
        ? (darkMode ? '#3b82f6' : '#3b82f6')
        : (darkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 0.8)'))
    : focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: darkMode
          ? ['rgba(75, 85, 99, 0.3)', '#3b82f6']
          : ['rgba(229, 231, 235, 0.8)', '#3b82f6']
      });

  const containerShadowOpacity = Platform.OS === 'ios'
    ? (isFocused ? 0.15 : 0.05)
    : focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.05, 0.15]
      });

  const sendButtonRotationDeg = sendButtonRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg']
  });

  // Use regular View on iOS to prevent animation glitches
  const ContainerComponent = Platform.OS === 'ios' ? View : Animated.View;

  const containerStyle = Platform.OS === 'ios'
    ? [
        styles.container,
        darkMode && styles.containerDark,
        isFocused && styles.containerFocused,
        isFocused && darkMode && styles.containerFocusedDark,
        {
          borderColor: containerBorderColor,
          shadowOpacity: containerShadowOpacity,
        }
      ]
    : [
        styles.container,
        darkMode && styles.containerDark,
        {
          borderColor: containerBorderColor,
          shadowOpacity: containerShadowOpacity,
          height: inputHeight,
        }
      ];

  return (
    <ContainerComponent style={containerStyle}>
      {/* Text Input */}
      <TextInput
        ref={textInputRef}
        style={[
          styles.textInput,
          darkMode && styles.textInputDark,
          Platform.OS === 'ios'
            ? { maxHeight: 100 } // Fixed max height on iOS
            : { height: inputHeight - 8 }
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={darkMode ? '#9ca3af' : '#6b7280'}
        multiline={Platform.OS === 'android'}
        maxLength={maxLength}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onContentSizeChange={handleContentSizeChange}
        returnKeyType="send"
        onSubmitEditing={handleSend}
        blurOnSubmit={Platform.OS === 'ios'}
        scrollEnabled={Platform.OS === 'ios' ? true : inputHeight >= 120}
        editable={!disabled}
        textAlignVertical="top"
        enablesReturnKeyAutomatically={true}
      />

      {/* Action Buttons Container */}
      <View style={styles.actionsContainer}>
        {/* Quick Actions Button */}
        {onQuickActionsPress && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              darkMode && styles.actionButtonDark,
              { opacity: canSend ? 0 : 1 }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onQuickActionsPress();
            }}
            disabled={canSend || disabled}
          >
            <Ionicons
              name="apps"
              size={20}
              color={darkMode ? '#9ca3af' : '#6b7280'}
            />
          </TouchableOpacity>
        )}

        {/* Send Button */}
        <Animated.View
          style={[
            styles.sendButtonContainer,
            {
              transform: [
                { scale: sendButtonScale },
                { rotate: sendButtonRotationDeg }
              ]
            }
          ]}
        >
          {isGenerating && onStopGenerating ? (
            <TouchableOpacity
              style={[
                styles.sendButton,
                styles.stopButtonActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onStopGenerating();
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="stop"
                size={18}
                color="#ffffff"
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.sendButton,
                canSend && (darkMode ? styles.sendButtonActiveDark : styles.sendButtonActive),
                !canSend && styles.sendButtonInactive
              ]}
              onPress={handleSend}
              disabled={!canSend}
              activeOpacity={0.8}
            >
              {loading ? (
                <Animated.View
                  style={{
                    transform: [{
                      rotate: sendButtonRotation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg']
                      })
                    }]
                  }}
                >
                  <Ionicons
                    name="hourglass"
                    size={18}
                    color="#ffffff"
                  />
                </Animated.View>
              ) : (
                <Ionicons
                  name="send-outline"
                  size={18}
                  color={canSend ? "#ffffff" : (darkMode ? '#6b7280' : '#9ca3af')}
                  style={{ transform: [{ rotate: '-45deg' }] }}
                />
              )}
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </ContainerComponent>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(229, 231, 235, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 8 : 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 4,
    elevation: 3,
    minHeight: 44,
    maxWidth: width - 32,
  },
  containerDark: {
    backgroundColor: '#374151',
    borderColor: 'rgba(75, 85, 99, 0.3)',
    shadowColor: '#ffffff',
    shadowOpacity: 0.1,
  },
  containerFocused: {
    borderColor: '#3b82f6',
    shadowOpacity: 0.15,
  },
  containerFocusedDark: {
    borderColor: '#3b82f6',
    shadowOpacity: 0.15,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
    paddingBottom: Platform.OS === 'ios' ? 12 : 8,
    paddingRight: 12,
    lineHeight: 20,
    textAlignVertical: 'center',
  },
  textInputDark: {
    color: '#f3f4f6',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 6,
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sendButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
  },
  sendButtonActive: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sendButtonActiveDark: {
    backgroundColor: '#1d4ed8',
    shadowColor: '#1d4ed8',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  sendButtonInactive: {
    backgroundColor: '#e5e7eb',
  },
  stopButtonActive: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});