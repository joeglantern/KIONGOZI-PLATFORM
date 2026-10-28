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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import apiClient from '../utils/apiClient';
import * as AppleAuthentication from 'expo-apple-authentication';

const { width } = Dimensions.get('window');

export default function LoginScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const { signIn, signUp, resetPassword, verifyResetOTP, cancelPasswordReset, signInWithGoogle, signInWithApple, loading } = useAuthStore();
  const [appleAvailable, setAppleAvailable] = React.useState(false);
  React.useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false));
  }, []);
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
  // OTP step
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const otpInputRef = useRef<TextInput>(null);
  // New password step (inline after OTP)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [resetPwLoading, setResetPwLoading] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Auto-submit when all 6 OTP digits are entered
  useEffect(() => {
    if (otpCode.length === 6 && resetSent && !otpVerified && !otpLoading) {
      handleVerifyOTP();
    }
  }, [otpCode]);

  const handleVerifyOTP = async () => {
    if (otpCode.length < 6 || otpLoading) return;
    setOtpLoading(true);
    const result = await verifyResetOTP(resetEmail, otpCode);
    setOtpLoading(false);
    if (result.success) {
      setOtpVerified(true);
    } else {
      Alert.alert('Invalid code', result.error || 'The code is incorrect or has expired.');
      setOtpCode('');
    }
  };

  const handleSetNewPassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Too short', 'Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    setResetPwLoading(true);
    const { updatePassword } = useAuthStore.getState();
    const result = await updatePassword(newPassword);
    setResetPwLoading(false);
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to update password.');
    }
    // On success, authStore sets user → app navigates away automatically
  };

  const exitForgotMode = async () => {
    if (otpVerified) await cancelPasswordReset();
    setForgotMode(false);
    setResetSent(false);
    setOtpCode('');
    setOtpVerified(false);
    setNewPassword('');
    setConfirmPassword('');
  };

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


  // Layout only: tighter spacing on short phones (SE1 568pt / SE2 667pt) so the form needs less scrolling.
  const { height: winH } = useWindowDimensions();
  const compact = winH < 700;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { minHeight: winH - 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[
            styles.content,
            compact && styles.contentCompact,
            {
              opacity: fadeAnim,
              transform: [{ translateY }],
            },
          ]}>
            {/* Header */}
            <View style={[styles.header, compact && styles.headerCompact]}>
              {forgotMode ? (
                <View style={styles.forgotHeader}>
                  <TouchableOpacity
                    onPress={exitForgotMode}
                    style={styles.backBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text
                    style={[styles.title, styles.forgotTitle, compact && styles.titleCompact]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                    maxFontSizeMultiplier={1.2}
                  >
                    Reset Password
                  </Text>
                  <View style={styles.backBtnPlaceholder} />
                </View>
              ) : (
                <View style={styles.logoContainer}>
                  <Image
                    source={require('../../assets/kchat-logo.png')}
                    style={[styles.logoImage, compact && styles.logoImageCompact]}
                    resizeMode="contain"
                  />
                  <Text style={[styles.title, compact && styles.titleCompact]} maxFontSizeMultiplier={1.2}>
                    {isSignUp ? 'Create an account' : 'Sign in'}
                  </Text>
                  <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
                    {isSignUp ? 'Join the conversation shaping Kenya.' : 'Welcome back. Pick up where you left off.'}
                  </Text>
                </View>
              )}
            </View>

            {/* Forgot Password Flow */}
            {forgotMode && (
              <View style={styles.formContainer}>
                {!resetSent && (
                  /* Step 1: Enter email */
                  <>
                    <Text style={styles.resetSubtitle}>
                      Enter your email and we'll send you a 6-digit code to reset your password.
                    </Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="mail-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, styles.inputWithIcon]}
                        placeholder="Email address"
                        placeholderTextColor="#636366"
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
                          Alert.alert('Error', result.error || 'Failed to send code.');
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      {resetLoading ? (
                        <ActivityIndicator color="#000000" size="small" />
                      ) : (
                        <Text style={styles.submitButtonText} numberOfLines={1} maxFontSizeMultiplier={1.3}>Send code</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}

                {resetSent && !otpVerified && (
                  /* Step 2: Enter 6-digit OTP */
                  <>
                    <Text style={styles.resetSubtitle}>
                      We sent a 6-digit code to {resetEmail}. Enter it below.
                    </Text>
                    <TouchableOpacity
                      activeOpacity={1}
                      onPress={() => otpInputRef.current?.focus()}
                      style={styles.otpWrapper}
                    >
                      <View style={styles.otpBoxRow} pointerEvents="none">
                        {[0, 1, 2, 3, 4, 5].map(i => (
                          <View key={i} style={[
                            styles.otpBox,
                            i < otpCode.length ? styles.otpBoxFilled : (i === otpCode.length && styles.otpBoxActive),
                          ]}>
                            <Text style={styles.otpDigit} maxFontSizeMultiplier={1.2}>{otpCode[i] || ''}</Text>
                          </View>
                        ))}
                      </View>
                      <TextInput
                        ref={otpInputRef}
                        style={styles.otpHiddenInput}
                        value={otpCode}
                        onChangeText={(t) => setOtpCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
                        keyboardType="number-pad"
                        maxLength={6}
                        caretHidden
                        autoFocus
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.submitButton, (otpLoading || otpCode.length < 6) && styles.submitButtonDisabled]}
                      disabled={otpLoading || otpCode.length < 6}
                      onPress={handleVerifyOTP}
                      activeOpacity={0.8}
                    >
                      {otpLoading ? (
                        <ActivityIndicator color="#000000" size="small" />
                      ) : (
                        <Text style={styles.submitButtonText} numberOfLines={1} maxFontSizeMultiplier={1.3}>Verify code</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.resendBtn}
                      onPress={async () => {
                        setOtpCode('');
                        setResetLoading(true);
                        await resetPassword(resetEmail);
                        setResetLoading(false);
                        Alert.alert('Code resent', 'A new code has been sent to your email.');
                      }}
                    >
                      <Text style={styles.resendText}>
                        {resetLoading ? 'Sending…' : "Didn't get it? Resend code"}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {resetSent && otpVerified && (
                  /* Step 3: Set new password */
                  <>
                    <Text style={styles.resetSubtitle}>
                      Choose a new password for your account.
                    </Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="lock-closed-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, styles.inputWithIcon, styles.passwordInput]}
                        placeholder="New password (min. 8 characters)"
                        placeholderTextColor="#636366"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showNewPw}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity style={styles.eyeButton} onPress={() => setShowNewPw(!showNewPw)}>
                        <Ionicons name={showNewPw ? 'eye-off' : 'eye'} size={20} color="#8E8E93" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inputContainer}>
                      <Ionicons name="lock-closed-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, styles.inputWithIcon, styles.passwordInput]}
                        placeholder="Confirm new password"
                        placeholderTextColor="#636366"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPw}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPw(!showConfirmPw)}>
                        <Ionicons name={showConfirmPw ? 'eye-off' : 'eye'} size={20} color="#8E8E93" />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={[styles.submitButton, (resetPwLoading || !newPassword || !confirmPassword) && styles.submitButtonDisabled]}
                      disabled={resetPwLoading || !newPassword || !confirmPassword}
                      onPress={handleSetNewPassword}
                      activeOpacity={0.8}
                    >
                      {resetPwLoading ? (
                        <ActivityIndicator color="#000000" size="small" />
                      ) : (
                        <Text style={styles.submitButtonText} numberOfLines={1} maxFontSizeMultiplier={1.3}>Set new password</Text>
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
                      color="#8E8E93"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[
                        styles.input,
                        styles.inputWithIcon,
                        focusedField === 'firstName' && styles.inputFocused
                      ]}
                      placeholder="First Name"
                      placeholderTextColor="#636366"
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
                      color="#8E8E93"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[
                        styles.input,
                        styles.inputWithIcon,
                        focusedField === 'lastName' && styles.inputFocused
                      ]}
                      placeholder="Last Name"
                      placeholderTextColor="#636366"
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
                      placeholderTextColor="#636366"
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
                      <ActivityIndicator size="small" color="#8E8E93" style={styles.statusIcon} />
                    )}
                    {usernameStatus === 'available' && (
                      <Ionicons name="checkmark-circle" size={20} color="#5CB85C" style={styles.statusIcon} />
                    )}
                    {(usernameStatus === 'taken' || usernameStatus === 'reserved') && (
                      <Ionicons name="close-circle" size={20} color="#FF3B30" style={styles.statusIcon} />
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
                  color="#8E8E93"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    styles.inputWithIcon,
                    focusedField === 'email' && styles.inputFocused
                  ]}
                  placeholder="Email address"
                  placeholderTextColor="#636366"
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
                  color="#8E8E93"
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
                  placeholderTextColor="#636366"
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
                    color="#8E8E93"
                  />
                </TouchableOpacity>
              </View>

              {!isSignUp && (
                <TouchableOpacity
                  onPress={() => { setForgotMode(true); setResetSent(false); setOtpCode(''); setOtpVerified(false); setResetEmail(email); }}
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
                  <ActivityIndicator color="#000000" size="small" />
                ) : (
                  <Text style={styles.submitButtonText} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                    {isSignUp ? 'Create account' : 'Log in'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>}

            {/* Google Sign-In */}
            {!forgotMode && (
              <View style={styles.oauthSection}>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>
                <TouchableOpacity
                  style={[styles.googleBtn, loading && styles.submitButtonDisabled]}
                  disabled={loading}
                  activeOpacity={0.8}
                  onPress={async () => {
                    const result = await signInWithGoogle();
                    if (!result.success && result.error && result.error !== 'Sign-in cancelled') {
                      Alert.alert('Google Sign-In Failed', result.error);
                    }
                  }}
                >
                  <Image
                    source={require('../../assets/google-icon.png')}
                    style={styles.googleIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.googleBtnText} numberOfLines={1} maxFontSizeMultiplier={1.3}>Continue with Google</Text>
                </TouchableOpacity>

                {appleAvailable && (
                  <View style={styles.appleWrap}>
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={14}
                    style={styles.appleBtn}
                    onPress={async () => {
                      const result = await signInWithApple();
                      if (!result.success && result.error && result.error !== 'Sign-in cancelled') {
                        Alert.alert('Apple Sign-In Failed', result.error);
                      }
                    }}
                  />
                  </View>
                )}
              </View>
            )}

            {/* Switch Auth Mode */}
            {!forgotMode && <View style={[styles.footer, compact && { marginTop: 16 }]}>
              <Text style={styles.footerText}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </Text>
              <TouchableOpacity onPress={toggleAuthMode} style={styles.switchButton}>
                <Text style={styles.switchText}>
                  {isSignUp ? 'Log in' : 'Sign up'}
                </Text>
              </TouchableOpacity>
            </View>}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

// Design tokens (screen is dark-only; values mirror src/theme/colors.ts)
const BG = '#000000';
const TEXT = '#FFFFFF';
const MUTED = '#8E8E93';
const FAINT = '#636366';
const BORDER = '#2A2A2A';
const ACCENT = '#5CB85C';
const ERROR = '#FF3B30';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  contentCompact: {
    paddingVertical: 16,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  headerCompact: {
    marginBottom: 20,
  },
  logoContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 72,
    height: 48,
    marginBottom: 28,
  },
  logoImageCompact: {
    width: 60,
    height: 40,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    color: TEXT,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 28,
  },
  // Sits between two 36pt buttons: 320 − 48 gutter − 72 = 200pt, so it must shrink, not overflow.
  forgotTitle: {
    flex: 1,
    marginHorizontal: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: MUTED,
    textAlign: 'center',
    marginTop: 8,
  },
  formContainer: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 12,
    position: 'relative',
  },
  // Plain filled fields (no icons inside: the placeholder already says what goes there)
  inputIcon: {
    display: 'none',
  },
  input: {
    height: 54,
    backgroundColor: '#111113',
    borderWidth: 1,
    borderColor: '#1F1F22',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 0,
    fontSize: 16,
    color: TEXT,
  },
  inputWithIcon: {
    paddingLeft: 16,
  },
  usernameAt: {
    position: 'absolute',
    left: 16,
    top: 15,
    zIndex: 1,
    fontSize: 16,
    color: MUTED,
    fontWeight: '600',
  },
  inputWithAt: {
    paddingLeft: 34,
  },
  inputWithStatusIcon: {
    paddingRight: 44,
  },
  inputError: {
    borderColor: ERROR,
  },
  inputSuccess: {
    borderColor: ACCENT,
  },
  statusIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  usernameHint: {
    fontSize: 13,
    color: ERROR,
    marginTop: 6,
    marginLeft: 4,
  },
  inputFocused: {
    borderColor: ACCENT,
  },
  passwordInput: {
    paddingRight: 52,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 13,
    padding: 4,
  },
  submitButton: {
    height: 54,
    backgroundColor: '#F2F2F2',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.3,
  },
  submitButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  oauthSection: {
    marginTop: 0,
    marginBottom: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },
  dividerText: {
    color: FAINT,
    fontSize: 13,
  },
  googleBtn: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F0F10',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    paddingHorizontal: 20,
    gap: 10,
  },
  googleIcon: {
    width: 18,
    height: 18,
  },
  googleBtnText: {
    flexShrink: 1,
    color: TEXT,
    fontSize: 16,
    fontWeight: '600',
  },
  appleWrap: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    overflow: 'hidden',
  },
  appleBtn: {
    width: '100%',
    height: 52,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: MUTED,
    fontSize: 15,
  },
  switchButton: {
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  switchText: {
    color: ACCENT,
    fontSize: 15,
    fontWeight: '600',
  },
  forgotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: {
    width: 36,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 4,
    paddingVertical: 6,
  },
  forgotText: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: '600',
  },
  resetSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: MUTED,
    marginBottom: 24,
  },
  otpWrapper: {
    position: 'relative',
    marginVertical: 24,
  },
  // 6×46 + 5×10 = 326pt overflowed the 272pt (320 wide) / 312pt (360 wide) content area.
  // flex:1 + maxWidth keeps 46pt boxes where they fit and shrinks them (≈38pt at 320) otherwise.
  otpBoxRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  otpBox: {
    flex: 1,
    maxWidth: 46,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: ACCENT,
  },
  otpBoxFilled: {
    borderColor: '#3A3A3A',
    backgroundColor: '#0E0E0E',
  },
  otpDigit: {
    fontSize: 22,
    color: TEXT,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  otpHiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    color: 'transparent',
    backgroundColor: 'transparent',
  },
  resendBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  resendText: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: '600',
  },
});
