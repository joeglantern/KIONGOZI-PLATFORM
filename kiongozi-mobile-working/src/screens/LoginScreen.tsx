import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import apiClient from '../utils/apiClient';

const { width } = Dimensions.get('window');

export default function LoginScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const { signIn, signUp, resetPassword, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'reserved' | 'short'>('idle');
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleFocusEmail = React.useCallback(() => setFocusedField('email'), []);
  const handleFocusPassword = React.useCallback(() => setFocusedField('password'), []);
  const handleFocusFirstName = React.useCallback(() => setFocusedField('firstName'), []);
  const handleFocusLastName = React.useCallback(() => setFocusedField('lastName'), []);
  const handleFocusUsername = React.useCallback(() => setFocusedField('username'), []);
  const handleBlur = React.useCallback(() => setFocusedField(null), []);

  // Auto-suggest username from first+last name (only when user hasn't manually edited it)
  useEffect(() => {
    if (usernameTouched) return;
    const suggested = (firstName + lastName)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');
    setUsername(suggested || '');
  }, [firstName, lastName, usernameTouched]);

  // Debounced availability check whenever username changes (sign-up only)
  useEffect(() => {
    if (!isSignUp) return;
    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);

    if (username.length === 0) { setUsernameStatus('idle'); return; }
    if (username.length < 3)   { setUsernameStatus('short'); return; }

    setUsernameStatus('checking');
    usernameCheckTimer.current = setTimeout(async () => {
      try {
        const res = await apiClient.checkUsername(username);
        if (res.reason === 'Reserved') {
          setUsernameStatus('reserved');
        } else {
          setUsernameStatus(res.available ? 'available' : 'taken');
        }
      } catch {
        setUsernameStatus('idle');
      }
    }, 500);

    return () => { if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current); };
  }, [username, isSignUp]);

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

    if (isSignUp && (!firstName || !lastName)) {
      Alert.alert('Error', 'Please enter your first and last name');
      return;
    }

    if (isSignUp && username.length > 0 && username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    if (isSignUp && (usernameStatus === 'taken' || usernameStatus === 'reserved')) {
      Alert.alert('Error', usernameStatus === 'reserved' ? 'That username is reserved' : 'That username is already taken');
      return;
    }

    if (isSignUp && username.length > 0 && usernameStatus === 'checking') {
      Alert.alert('Please wait', 'Still checking username availability');
      return;
    }

    try {
      const result = isSignUp
        ? await signUp(email, password, firstName, lastName, username || undefined)
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
              {forgotMode ? (
                <View style={styles.forgotHeader}>
                  <TouchableOpacity
                    onPress={() => setForgotMode(false)}
                    style={styles.backBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="arrow-back" size={22} color="#111827" />
                  </TouchableOpacity>
                  <Text style={styles.title}>Reset Password</Text>
                  <View style={styles.backBtnPlaceholder} />
                </View>
              ) : (
                <View style={styles.logoContainer}>
                  <Image
                    source={require('../../assets/logo.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.title}>
                    {isSignUp ? 'Create an account' : 'Sign in'}
                  </Text>
                </View>
              )}
            </View>

            {/* Forgot Password Card */}
            {forgotMode && (
              <View style={styles.formContainer}>
                {resetSent ? (
                  <View style={styles.resetSuccessCard}>
                    <Ionicons name="checkmark-circle" size={48} color="#22c55e" style={{ alignSelf: 'center', marginBottom: 12 }} />
                    <Text style={styles.resetSuccessTitle}>Check your email</Text>
                    <Text style={styles.resetSuccessText}>
                      We sent a password reset link to {resetEmail}. Tap the link to set a new password.
                    </Text>
                    <TouchableOpacity
                      style={styles.submitButton}
                      onPress={() => { setForgotMode(false); setResetSent(false); }}
                    >
                      <Text style={styles.submitButtonText}>Back to sign in</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <Text style={styles.resetSubtitle}>
                      Enter your email address and we'll send you a link to reset your password.
                    </Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, styles.inputWithIcon]}
                        placeholder="Email address"
                        placeholderTextColor="#9ca3af"
                        value={resetEmail}
                        onChangeText={setResetEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="email"
                      />
                    </View>
                    <TouchableOpacity
                      style={[styles.submitButton, (resetLoading || !resetEmail) && styles.submitButtonDisabled]}
                      disabled={resetLoading || !resetEmail}
                      onPress={async () => {
                        setResetLoading(true);
                        const result = await resetPassword(resetEmail);
                        setResetLoading(false);
                        if (result.success) {
                          setResetSent(true);
                        } else {
                          Alert.alert('Error', result.error || 'Failed to send reset email.');
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      {resetLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.submitButtonText}>Send Reset Email</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {/* Form Container */}
            {!forgotMode && <View style={styles.formContainer}>
              {isSignUp && (
                <>
                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color="#9ca3af"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[
                        styles.input,
                        styles.inputWithIcon,
                        focusedField === 'firstName' && styles.inputFocused
                      ]}
                      placeholder="First Name"
                      placeholderTextColor="#9ca3af"
                      value={firstName}
                      onChangeText={setFirstName}
                      onFocus={handleFocusFirstName}
                      onBlur={handleBlur}
                      autoCapitalize="words"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color="#9ca3af"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[
                        styles.input,
                        styles.inputWithIcon,
                        focusedField === 'lastName' && styles.inputFocused
                      ]}
                      placeholder="Last Name"
                      placeholderTextColor="#9ca3af"
                      value={lastName}
                      onChangeText={setLastName}
                      onFocus={handleFocusLastName}
                      onBlur={handleBlur}
                      autoCapitalize="words"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.usernameAt}>@</Text>
                    <TextInput
                      style={[
                        styles.input,
                        styles.inputWithAt,
                        styles.inputWithStatusIcon,
                        focusedField === 'username' && styles.inputFocused,
                        usernameStatus === 'taken' && styles.inputError,
                        usernameStatus === 'reserved' && styles.inputError,
                        usernameStatus === 'available' && styles.inputSuccess,
                      ]}
                      placeholder="username"
                      placeholderTextColor="#9ca3af"
                      value={username}
                      onChangeText={(text) => {
                        setUsernameTouched(true);
                        setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                      }}
                      onFocus={handleFocusUsername}
                      onBlur={handleBlur}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {usernameStatus === 'checking' && (
                      <ActivityIndicator size="small" color="#9ca3af" style={styles.statusIcon} />
                    )}
                    {usernameStatus === 'available' && (
                      <Ionicons name="checkmark-circle" size={20} color="#22c55e" style={styles.statusIcon} />
                    )}
                    {(usernameStatus === 'taken' || usernameStatus === 'reserved') && (
                      <Ionicons name="close-circle" size={20} color="#ef4444" style={styles.statusIcon} />
                    )}
                    {(usernameStatus === 'taken' || usernameStatus === 'reserved' || usernameStatus === 'short') && (
                      <Text style={styles.usernameHint}>
                        {usernameStatus === 'taken' && 'Username already taken'}
                        {usernameStatus === 'reserved' && 'That username is reserved'}
                        {usernameStatus === 'short' && 'At least 3 characters required'}
                      </Text>
                    )}
                  </View>
                </>
              )}

              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#9ca3af"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    styles.inputWithIcon,
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
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#9ca3af"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    styles.inputWithIcon,
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

              {!isSignUp && (
                <TouchableOpacity
                  onPress={() => { setForgotMode(true); setResetSent(false); setResetEmail(email); }}
                  style={styles.forgotLink}
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              )}

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
            </View>}

            {/* Switch Auth Mode */}
            {!forgotMode && <View style={styles.footer}>
              <Text style={styles.footerText}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </Text>
              <TouchableOpacity onPress={toggleAuthMode} style={styles.switchButton}>
                <Text style={styles.switchText}>
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            </View>}
          </Animated.View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: Dimensions.get('window').height - 100,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  logoImage: {
    width: 60,
    height: 40,
    marginRight: 12,
  },
  aiIconText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  formContainer: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 14,
    zIndex: 1,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputWithIcon: {
    paddingLeft: 48,
  },
  usernameAt: {
    position: 'absolute',
    left: 16,
    top: 14,
    zIndex: 1,
    fontSize: 15,
    color: '#9ca3af',
    fontWeight: '600',
  },
  inputWithAt: {
    paddingLeft: 32,
  },
  inputWithStatusIcon: {
    paddingRight: 40,
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  inputSuccess: {
    borderColor: '#22c55e',
    borderWidth: 2,
  },
  statusIcon: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  usernameHint: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    marginLeft: 4,
  },
  inputFocused: {
    borderColor: '#3b82f6',
    borderWidth: 2,
    shadowOpacity: 0.1,
    elevation: 2,
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
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#111827',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0.1,
    elevation: 1,
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
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  googleIcon: {
    marginRight: 10,
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
    color: '#6b7280',
    fontSize: 14,
  },
  switchButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  switchText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
  },
  forgotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  backBtn: {
    padding: 4,
  },
  backBtnPlaceholder: {
    width: 30,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    paddingVertical: 4,
  },
  forgotText: {
    color: '#6366f1',
    fontSize: 14,
  },
  resetSubtitle: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 20,
  },
  cancelForgotBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  cancelForgotText: {
    color: '#64748b',
    fontSize: 15,
  },
  resetSuccessCard: {
    paddingVertical: 24,
  },
  resetSuccessTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  resetSuccessText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
});