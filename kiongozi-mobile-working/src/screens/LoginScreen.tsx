import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';

const { width } = Dimensions.get('window');

export default function LoginScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const { signIn, signUp, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleFocusEmail = React.useCallback(() => setFocusedField('email'), []);
  const handleFocusPassword = React.useCallback(() => setFocusedField('password'), []);
  const handleFocusFullName = React.useCallback(() => setFocusedField('fullName'), []);
  const handleBlur = React.useCallback(() => setFocusedField(null), []);

  const togglePasswordVisibility = React.useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPassword(!showPassword);
  }, [showPassword]);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  const toggleAuthMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSignUp(!isSignUp);
  };

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (isSignUp && !fullName) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    try {
      const result = isSignUp
        ? await signUp(email, password, fullName)
        : await signIn(email, password);

      if (result.success) {
        onLoginSuccess();
      } else {
        Alert.alert('Error', result.error || 'Authentication failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong');
    }
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY }],
          },
        ]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.aiIcon}>
                <Text style={styles.aiIconText}>AI</Text>
              </View>
              <Text style={styles.title}>Kiongozi</Text>
            </View>
            <Text style={styles.subtitle}>
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </Text>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {isSignUp && (
              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'fullName' && styles.inputFocused
                  ]}
                  placeholder="Full Name"
                  placeholderTextColor="#9ca3af"
                  value={fullName}
                  onChangeText={setFullName}
                  onFocus={handleFocusFullName}
                  onBlur={handleBlur}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'email' && styles.inputFocused
                ]}
                placeholder="Email address"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                onFocus={handleFocusEmail}
                onBlur={handleBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  focusedField === 'password' && styles.inputFocused
                ]}
                placeholder="Password"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                onFocus={handleFocusPassword}
                onBlur={handleBlur}
                secureTextEntry={!showPassword}
                autoComplete="password"
                autoCorrect={false}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={togglePasswordVisibility}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, (loading || !email || !password) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading || !email || !password}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isSignUp ? 'Create Account' : 'Continue'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign In */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Alert.alert('Coming Soon', 'Google sign-in will be available in a future update.');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          {/* Switch Auth Mode */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TouchableOpacity onPress={toggleAuthMode} style={styles.switchButton}>
              <Text style={styles.switchText}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  aiIcon: {
    width: 36,
    height: 36,
    backgroundColor: '#3b82f6',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aiIconText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  formContainer: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputFocused: {
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 14,
    padding: 4,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  googleButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 8,
  },
  switchButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  switchText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
});