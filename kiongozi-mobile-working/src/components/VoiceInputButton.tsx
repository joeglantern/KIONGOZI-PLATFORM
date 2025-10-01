/**
 * VoiceInputButton Component
 * Real voice input functionality with speech-to-text for mobile and web
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
  Modal,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Import Voice library with proper error handling for Expo
let Voice: any = null;
let isVoiceAvailable = false;

try {
  // Check if we're in a native environment (not Expo Go)
  if (Platform.OS !== 'web') {
    Voice = require('@react-native-voice/voice').default;
    isVoiceAvailable = Voice !== null && Voice !== undefined;
  }
} catch (error) {
  console.log('Voice library not available - likely running in Expo Go:', error);
  isVoiceAvailable = false;
}

interface VoiceInputButtonProps {
  onTranscription: (text: string) => void;
  darkMode?: boolean;
  disabled?: boolean;
}

export default function VoiceInputButton({
  onTranscription,
  darkMode = false,
  disabled = false,
}: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState('');
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  // Initialize Voice library for mobile
  useEffect(() => {
    if (Platform.OS !== 'web' && isVoiceAvailable && Voice) {
      try {
        Voice.onSpeechStart = onSpeechStart;
        Voice.onSpeechRecognized = onSpeechRecognized;
        Voice.onSpeechEnd = onSpeechEnd;
        Voice.onSpeechError = onSpeechError;
        Voice.onSpeechResults = onSpeechResults;
        Voice.onSpeechPartialResults = onSpeechPartialResults;

        return () => {
          if (Voice && Voice.destroy) {
            Voice.destroy().then(() => {
              if (Voice.removeAllListeners) {
                Voice.removeAllListeners();
              }
            }).catch((error: any) => {
              console.log('Error cleaning up voice listeners:', error);
            });
          }
        };
      } catch (error) {
        console.log('Error initializing voice listeners:', error);
      }
    }
  }, []);

  // Animated pulse effect for recording
  useEffect(() => {
    if (isListening) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      
      const waveAnimation = Animated.loop(
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        })
      );

      pulseAnimation.start();
      waveAnimation.start();

      return () => {
        pulseAnimation.stop();
        waveAnimation.stop();
      };
    } else {
      pulseAnim.setValue(1);
      waveAnim.setValue(0);
    }
  }, [isListening]);

  // Voice event handlers for mobile
  const onSpeechStart = (e: any) => {
    console.log('Speech started', e);
    setIsListening(true);
    setShowVoiceModal(true);
    setTranscription('Listening...');
    setError('');
  };

  const onSpeechRecognized = (e: any) => {
    console.log('Speech recognized', e);
  };

  const onSpeechEnd = (e: any) => {
    console.log('Speech ended', e);
    setIsListening(false);
    setTimeout(() => {
      setShowVoiceModal(false);
    }, 1500);
  };

  const onSpeechError = (e: any) => {
    console.log('Speech error', e);
    setIsListening(false);
    setShowVoiceModal(false);
    
    let errorMessage = 'Could not recognize speech. Please try again.';
    
    if (e.error) {
      switch (e.error.message || e.error.code) {
        case '7': // ERROR_NO_MATCH
        case 'no-match':
          errorMessage = 'No speech detected. Please speak clearly and try again.';
          break;
        case '6': // ERROR_SPEECH_TIMEOUT
        case 'speech-timeout':
          errorMessage = 'Speech timeout. Please try speaking again.';
          break;
        case '5': // ERROR_CLIENT
        case 'client':
          errorMessage = 'Speech recognition client error. Please try again.';
          break;
        case '3': // ERROR_AUDIO
        case 'audio':
          errorMessage = 'Audio recording error. Please check your microphone.';
          break;
        case '9': // ERROR_INSUFFICIENT_PERMISSIONS
        case 'insufficient-permissions':
          errorMessage = 'Microphone permission denied. Please allow microphone access.';
          break;
        default:
          errorMessage = `Speech recognition error: ${e.error.message || e.error.code}`;
      }
    }
    
    setError(errorMessage);
    Alert.alert('Voice Input Error', errorMessage);
  };

  const onSpeechResults = (e: any) => {
    console.log('Speech results', e);
    if (e.value && e.value.length > 0) {
      const transcript = e.value[0];
      setTranscription(transcript);
      onTranscription(transcript.trim());
    }
  };

  const onSpeechPartialResults = (e: any) => {
    console.log('Speech partial results', e);
    if (e.value && e.value.length > 0) {
      setTranscription(e.value[0] + '...');
    }
  };

  // Check Android permissions
  const checkAndroidPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'This app needs access to your microphone for voice input.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  };

  const startListening = async () => {
    if (disabled) return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (Platform.OS === 'web') {
        startWebSpeechRecognition();
      } else {
        await startMobileSpeechRecognition();
      }
    } catch (error) {
      console.error('Speech recognition error:', error);
      Alert.alert(
        'Voice Input Error',
        'Failed to start voice recognition. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const startWebSpeechRecognition = () => {
    try {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      
      if (!SpeechRecognition) {
        showUnsupportedAlert();
        return;
      }

      const recognition = new SpeechRecognition();
      
      // Configuration
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('Web speech recognition started');
        setIsListening(true);
        setShowVoiceModal(true);
        setTranscription('Listening...');
        setError('');
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Show interim results while listening
        if (interimTranscript) {
          setTranscription(interimTranscript + '...');
        }

        // Process final result
        if (finalTranscript) {
          console.log('Final transcript:', finalTranscript);
          setTranscription(finalTranscript);
          onTranscription(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Web speech recognition error:', event.error);
        setIsListening(false);
        setShowVoiceModal(false);
        
        let errorMessage = 'Could not recognize speech. Please try again.';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please speak clearly and try again.';
            break;
          case 'audio-capture':
            errorMessage = 'Microphone not available. Please check your microphone settings.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
            break;
          case 'network':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
          case 'aborted':
            errorMessage = 'Speech recognition was cancelled.';
            break;
        }
        
        setError(errorMessage);
        Alert.alert('Voice Input Error', errorMessage);
      };

      recognition.onend = () => {
        console.log('Web speech recognition ended');
        setIsListening(false);
        setTimeout(() => {
          setShowVoiceModal(false);
        }, 1500);
      };

      recognition.start();
      
    } catch (error) {
      console.error('Failed to start web speech recognition:', error);
      showUnsupportedAlert();
    }
  };

  const startMobileSpeechRecognition = async () => {
    // Check if Voice library is available
    if (!isVoiceAvailable || !Voice) {
      Alert.alert(
        'Voice Recognition Unavailable',
        'Voice recognition is not available in this environment.\n\n' +
        'This feature requires:\n' +
        '• Development build (not Expo Go)\n' +
        '• Native compilation\n\n' +
        'For testing, please use the web version in a browser.',
        [
          {
            text: 'Try Web Version',
            onPress: () => {
              if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
                startWebSpeechRecognition();
              } else {
                showUnsupportedAlert();
              }
            }
          },
          { text: 'OK', style: 'cancel' }
        ]
      );
      return;
    }

    try {
      // Check permissions for Android
      if (Platform.OS === 'android') {
        const hasPermission = await checkAndroidPermissions();
        if (!hasPermission) {
          Alert.alert(
            'Permission Required',
            'Microphone permission is required for voice input.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Check if speech recognition is available
      if (Voice.isAvailable) {
        const isAvailable = await Voice.isAvailable();
        if (!isAvailable) {
          Alert.alert(
            'Speech Recognition Unavailable',
            'Speech recognition is not available on this device.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Start listening
      await Voice.start('en-US');
      
    } catch (error) {
      console.error('Failed to start mobile speech recognition:', error);
      
      // Provide helpful error message
      let errorMessage = 'Failed to start voice recognition.';
      if (error instanceof Error) {
        if (error.message.includes('isSpeechAvailable')) {
          errorMessage = 'Voice recognition is not properly configured. This feature requires a development build.';
        } else {
          errorMessage = `Voice recognition error: ${error.message}`;
        }
      }
      
      Alert.alert(
        'Voice Input Error',
        errorMessage + '\n\nTry using the web version for testing.',
        [
          {
            text: 'Try Web Version',
            onPress: () => {
              if (typeof window !== 'undefined') {
                startWebSpeechRecognition();
              }
            }
          },
          { text: 'OK', style: 'cancel' }
        ]
      );
    }
  };

  const stopListening = async () => {
    setIsListening(false);
    setShowVoiceModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      if (Platform.OS !== 'web' && isVoiceAvailable && Voice && Voice.stop) {
        await Voice.stop();
      }
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
    }
  };

  const showUnsupportedAlert = () => {
    Alert.alert(
      'Voice Input Unavailable',
      'Voice input is not supported in this environment. Please type your message instead.',
      [{ text: 'OK' }]
    );
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.voiceButton,
          darkMode && styles.voiceButtonDark,
          disabled && styles.voiceButtonDisabled,
        ]}
        onPress={startListening}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Ionicons
          name="mic"
          size={20}
          color={disabled ? (darkMode ? '#4b5563' : '#d1d5db') : (darkMode ? '#9ca3af' : '#6b7280')}
        />
      </TouchableOpacity>

      {/* Voice Input Modal */}
      <Modal
        visible={showVoiceModal}
        transparent={true}
        animationType="fade"
        onRequestClose={stopListening}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, darkMode && styles.modalContentDark]}>
            {/* Animated Voice Indicator */}
            <View style={styles.voiceIndicator}>
              <Animated.View
                style={[
                  styles.microphoneIcon,
                  darkMode && styles.microphoneIconDark,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <Ionicons
                  name="mic"
                  size={32}
                  color={isListening ? '#ef4444' : (darkMode ? '#9ca3af' : '#6b7280')}
                />
              </Animated.View>

              {/* Voice Wave Animation */}
              {isListening && (
                <View style={styles.waveContainer}>
                  {[0, 1, 2, 3, 4].map((index) => (
                    <Animated.View
                      key={index}
                      style={[
                        styles.waveLine,
                        darkMode && styles.waveLineDark,
                        {
                          transform: [
                            {
                              scaleY: waveAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.3, 1.5 + Math.random() * 0.5],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* Status Text */}
            <Text style={[styles.statusText, darkMode && styles.statusTextDark]}>
              {isListening ? 'Listening...' : 'Processing...'}
            </Text>

            {/* Transcription */}
            {transcription && transcription !== 'Listening...' && (
              <View style={[styles.transcriptionContainer, darkMode && styles.transcriptionContainerDark]}>
                <Text style={[styles.transcriptionText, darkMode && styles.transcriptionTextDark]}>
                  "{transcription}"
                </Text>
              </View>
            )}

            {/* Error Message */}
            {error && (
              <View style={[styles.errorContainer, darkMode && styles.errorContainerDark]}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={[styles.errorText, darkMode && styles.errorTextDark]}>
                  {error}
                </Text>
              </View>
            )}

            {/* Cancel Button */}
            <TouchableOpacity
              style={[styles.cancelButton, darkMode && styles.cancelButtonDark]}
              onPress={stopListening}
            >
              <Text style={[styles.cancelButtonText, darkMode && styles.cancelButtonTextDark]}>
                {isListening ? 'Stop' : 'Close'}
              </Text>
            </TouchableOpacity>

            {/* Help Text */}
            <Text style={[styles.helpText, darkMode && styles.helpTextDark]}>
              {Platform.OS === 'web' 
                ? 'Speak clearly into your microphone. Allow access when prompted.' 
                : 'Speak clearly. Grant microphone permission if prompted.'}
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButtonDark: {
    backgroundColor: '#374151',
  },
  voiceButtonDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: 320,
  },
  modalContentDark: {
    backgroundColor: '#1f2937',
  },
  voiceIndicator: {
    alignItems: 'center',
    marginBottom: 24,
  },
  microphoneIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  microphoneIconDark: {
    backgroundColor: '#374151',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 30,
  },
  waveLine: {
    width: 3,
    height: 20,
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  waveLineDark: {
    backgroundColor: '#60a5fa',
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  statusTextDark: {
    color: '#f9fafb',
  },
  transcriptionContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  transcriptionContainerDark: {
    backgroundColor: '#111827',
    borderColor: '#374151',
  },
  transcriptionText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  transcriptionTextDark: {
    color: '#d1d5db',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorContainerDark: {
    backgroundColor: '#7f1d1d',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    flex: 1,
  },
  errorTextDark: {
    color: '#fca5a5',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  cancelButtonDark: {
    backgroundColor: '#374151',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  cancelButtonTextDark: {
    color: '#d1d5db',
  },
  helpText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 16,
  },
  helpTextDark: {
    color: '#6b7280',
  },
});