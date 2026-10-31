// Sign in / sign up: one clean sheet. Auth is email + password on Supabase (plus Google and Apple),
// so email is the main field; there is no phone flow on the backend, so none is shown here.
// Every problem is said inline under its field, never as a pop-up.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../stores/authStore';
import apiClient from '../utils/apiClient';
import { useTheme } from '../hooks/useTheme';

/** iOS system link blue (light / dark) */
const linkBlue = (dark: boolean) => (dark ? '#0A84FF' : '#007AFF');

/** Set when an account was just created, so the app shows "Who should be in your feed?" once. */
export const FIRST_FEED_PENDING_KEY = 'first_feed_pending';

type Field = 'firstName' | 'lastName' | 'username' | 'email' | 'password' | 'newPassword' | 'confirm';
type Errors = Partial<Record<Field | 'form', string>>;

interface Props {
  onLoginSuccess: () => void;
  /** Which door the welcome screen was opened from */
  initialMode?: 'signin' | 'signup';
  /** Back to the welcome screen (hidden when not given) */
  onBack?: () => void;
}

export default function LoginScreen({ onLoginSuccess, initialMode = 'signin', onBack }: Props) {
  const T = useTheme();
  const { signIn, signUp, resetPassword, verifyResetOTP, cancelPasswordReset, signInWithGoogle, signInWithApple, loading } = useAuthStore();
  const [appleAvailable, setAppleAvailable] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
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
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<Field | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [oauthBusy, setOauthBusy] = useState<null | 'google' | 'apple'>(null);
  // Sign-up done but the email link still has to be tapped
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);

  // Forgot password
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetNote, setResetNote] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const otpInputRef = useRef<TextInput>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [resetPwLoading, setResetPwLoading] = useState(false);

  const setError = (k: keyof Errors, msg?: string) => setErrors(e => {
    if (!msg) { if (!(k in e)) return e; const n = { ...e }; delete n[k]; return n; }
    return { ...e, [k]: msg };
  });

  // Auto-submit when all 6 OTP digits are in
  useEffect(() => {
    if (otpCode.length === 6 && resetSent && !otpVerified && !otpLoading) handleVerifyOTP();
  }, [otpCode]);

  const handleVerifyOTP = async () => {
    if (otpCode.length < 6 || otpLoading) return;
    setOtpLoading(true);
    setResetError(null);
    const result = await verifyResetOTP(resetEmail, otpCode);
    setOtpLoading(false);
    if (result.success) {
      setOtpVerified(true);
    } else {
      setResetError(result.error || 'That code is wrong or has expired.');
      setOtpCode('');
    }
  };

  const handleSetNewPassword = async () => {
    setResetError(null);
    if (newPassword.length < 8) { setResetError('Password needs at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setResetError('The two passwords do not match.'); return; }
    setResetPwLoading(true);
    const { updatePassword } = useAuthStore.getState();
    const result = await updatePassword(newPassword);
    setResetPwLoading(false);
    if (!result.success) setResetError(result.error || 'Could not update your password.');
    // On success authStore sets the user and the app moves on by itself
  };

  const exitForgotMode = async () => {
    if (otpVerified) await cancelPasswordReset();
    setForgotMode(false);
    setResetSent(false);
    setOtpCode('');
    setOtpVerified(false);
    setNewPassword('');
    setConfirmPassword('');
    setResetError(null);
    setResetNote(null);
  };

  const sendResetCode = async () => {
    setResetLoading(true);
    setResetError(null);
    const result = await resetPassword(resetEmail.trim());
    setResetLoading(false);
    if (result.success) setResetSent(true);
    else setResetError(result.error || 'Could not send the code.');
  };

  // Suggest a username from the name until they type their own
  useEffect(() => {
    if (usernameTouched) return;
    const suggested = (firstName + lastName).toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(suggested || '');
  }, [firstName, lastName, usernameTouched]);

  // Debounced availability check (sign-up only)
  useEffect(() => {
    if (!isSignUp) return;
    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
    if (username.length === 0) { setUsernameStatus('idle'); return; }
    if (username.length < 3) { setUsernameStatus('short'); return; }
    setUsernameStatus('checking');
    usernameCheckTimer.current = setTimeout(async () => {
      try {
        const res = await apiClient.checkUsername(username);
        if (res.reason === 'Reserved') setUsernameStatus('reserved');
        else setUsernameStatus(res.available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 500);
    return () => { if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current); };
  }, [username, isSignUp]);

  const togglePasswordVisibility = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setShowPassword(v => !v);
  }, []);

  const toggleAuthMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setErrors({});
    setIsSignUp(v => !v);
  };

  const handleSubmit = async () => {
    const next: Errors = {};
    const em = email.trim();
    if (!em) next.email = 'Enter your email.';
    else if (!/^\S+@\S+\.\S+$/.test(em)) next.email = 'That does not look like an email.';
    if (!password) next.password = 'Enter your password.';
    else if (isSignUp && password.length < 8) next.password = 'Use at least 8 characters.';
    if (isSignUp) {
      if (!firstName.trim()) next.firstName = 'Your first name.';
      if (!lastName.trim()) next.lastName = 'Your last name.';
      if (username.length > 0 && username.length < 3) next.username = 'At least 3 characters.';
      else if (usernameStatus === 'taken') next.username = 'That username is taken.';
      else if (usernameStatus === 'reserved') next.username = 'That username is reserved.';
      else if (username.length > 0 && usernameStatus === 'checking') next.username = 'Still checking that username, one moment.';
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
      const result = isSignUp
        ? await signUp(em, password, firstName.trim(), lastName.trim(), username || undefined)
        : await signIn(em, password);

      if (result.success) {
        if (isSignUp) {
          try { await AsyncStorage.setItem(FIRST_FEED_PENDING_KEY, '1'); } catch {}
          if ('needsVerification' in result && result.needsVerification) { setVerifyEmail(em); return; }
        }
        onLoginSuccess();
      } else {
        const msg = result.error || 'Could not sign you in.';
        if (/password|credential/i.test(msg) && !/email/i.test(msg)) setError('password', friendly(msg));
        else if (/email/i.test(msg)) setError('email', friendly(msg));
        else setError('form', friendly(msg));
      }
    } catch (error: any) {
      setError('form', error?.message || 'Something went wrong. Try again.');
    }
  };

  const runOAuth = async (which: 'google' | 'apple') => {
    setError('form');
    setOauthBusy(which);
    try {
      const result = which === 'google' ? await signInWithGoogle() : await signInWithApple();
      if (!result.success && result.error && result.error !== 'Sign-in cancelled') setError('form', result.error);
    } finally {
      setOauthBusy(null);
    }
  };

  const { height: winH } = useWindowDimensions();
  const compact = winH < 700;
  const busy = loading || !!oauthBusy;

  const fieldStyle = (name: Field, hasError?: boolean) => [
    styles.input,
    { backgroundColor: T.inputBg, borderColor: hasError ? T.error : focusedField === name ? T.text : T.borderLight, color: T.text },
  ];

  const showBack = forgotMode || !!verifyEmail || !!onBack;
  const goBack = () => {
    if (forgotMode) { exitForgotMode(); return; }
    if (verifyEmail) { setVerifyEmail(null); setIsSignUp(false); return; }
    onBack?.();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: T.bg }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.scroll, compact && { paddingTop: 8 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* back */}
          <View style={styles.topRow}>
            {showBack ? (
              <Pressable onPress={goBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back"
                style={({ pressed }) => [styles.back, { backgroundColor: T.surface2 }, pressed && { opacity: 0.7 }]}>
                <Ionicons name="chevron-back" size={20} color={T.text} />
              </Pressable>
            ) : <View style={{ height: 36 }} />}
          </View>

          {/* title */}
          <Text style={[styles.title, { color: T.text }, compact && { fontSize: 27 }]} maxFontSizeMultiplier={1.2}>
            {verifyEmail ? 'Check your email' : forgotMode ? 'Reset your password' : isSignUp ? 'Create your account' : 'Welcome back'}
          </Text>
          <Text style={[styles.sub, { color: T.textSub }]} maxFontSizeMultiplier={1.3}>
            {verifyEmail
              ? `We sent a link to ${verifyEmail}. Tap it to finish creating your account, then come back here.`
              : forgotMode
                ? (!resetSent ? 'Enter your email and we will send a 6-digit code.' : !otpVerified ? `We sent a 6-digit code to ${resetEmail}.` : 'Choose a new password.')
                : isSignUp ? 'Join the conversation shaping Kenya.' : 'Sign in with the email you used before.'}
          </Text>

          {/* waiting on the email link */}
          {verifyEmail && (
            <View style={styles.form}>
              <Pressable onPress={() => { setVerifyEmail(null); setIsSignUp(false); }} accessibilityRole="button"
                style={({ pressed }) => [styles.primary, { backgroundColor: T.text }, pressed && { opacity: 0.85 }]}>
                <Text style={[styles.primaryText, { color: T.bg }]} maxFontSizeMultiplier={1.2}>Back to sign in</Text>
              </Pressable>
            </View>
          )}

          {/* forgot password */}
          {forgotMode && !verifyEmail && (
            <View style={styles.form}>
              {!resetSent && (
                <>
                  <TextInput
                    style={fieldStyle('email', !!resetError)}
                    placeholder="Email address"
                    placeholderTextColor={T.placeholder}
                    value={resetEmail}
                    onChangeText={t => { setResetEmail(t); setResetError(null); }}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                  />
                  {resetError && <Text style={[styles.err, { color: T.error }]}>{resetError}</Text>}
                  <Pressable
                    onPress={sendResetCode}
                    disabled={resetLoading || !resetEmail.trim()}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.primary, { backgroundColor: T.text }, (pressed || resetLoading || !resetEmail.trim()) && { opacity: resetLoading || !resetEmail.trim() ? 0.35 : 0.85 }]}
                  >
                    {resetLoading ? <ActivityIndicator color={T.bg} size="small" /> : <Text style={[styles.primaryText, { color: T.bg }]} maxFontSizeMultiplier={1.2}>Send code</Text>}
                  </Pressable>
                </>
              )}

              {resetSent && !otpVerified && (
                <>
                  <Pressable onPress={() => otpInputRef.current?.focus()} style={styles.otpWrap} accessibilityLabel="6-digit code">
                    <View style={styles.otpRow} pointerEvents="none">
                      {[0, 1, 2, 3, 4, 5].map(i => (
                        <View key={i} style={[
                          styles.otpBox,
                          { backgroundColor: T.inputBg, borderColor: i < otpCode.length ? T.text : i === otpCode.length ? T.text : T.borderLight },
                          i === otpCode.length && { borderWidth: 2 },
                        ]}>
                          <Text style={[styles.otpDigit, { color: T.text }]} maxFontSizeMultiplier={1.2}>{otpCode[i] || ''}</Text>
                        </View>
                      ))}
                    </View>
                    <TextInput
                      ref={otpInputRef}
                      style={styles.otpHidden}
                      value={otpCode}
                      onChangeText={t => { setOtpCode(t.replace(/[^0-9]/g, '').slice(0, 6)); setResetError(null); }}
                      keyboardType="number-pad"
                      maxLength={6}
                      caretHidden
                      autoFocus
                    />
                  </Pressable>
                  {resetError && <Text style={[styles.err, { color: T.error }]}>{resetError}</Text>}
                  {resetNote && !resetError && <Text style={[styles.note, { color: T.textSub }]}>{resetNote}</Text>}
                  <Pressable
                    onPress={handleVerifyOTP}
                    disabled={otpLoading || otpCode.length < 6}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.primary, { backgroundColor: T.text }, (otpLoading || otpCode.length < 6) ? { opacity: 0.35 } : pressed && { opacity: 0.85 }]}
                  >
                    {otpLoading ? <ActivityIndicator color={T.bg} size="small" /> : <Text style={[styles.primaryText, { color: T.bg }]} maxFontSizeMultiplier={1.2}>Verify code</Text>}
                  </Pressable>
                  <Pressable
                    style={styles.linkBtn}
                    disabled={resetLoading}
                    onPress={async () => {
                      setOtpCode('');
                      setResetError(null);
                      setResetLoading(true);
                      const r = await resetPassword(resetEmail);
                      setResetLoading(false);
                      if (r.success) setResetNote('A new code is on its way.');
                      else setResetError(r.error || 'Could not resend the code.');
                    }}
                  >
                    <Text style={[styles.link, { color: T.text }]}>{resetLoading ? 'Sending' : 'Did not get it? Resend code'}</Text>
                  </Pressable>
                </>
              )}

              {resetSent && otpVerified && (
                <>
                  <View style={styles.pwWrap}>
                    <TextInput
                      style={[...fieldStyle('newPassword', !!resetError), styles.pwInput]}
                      placeholder="New password (8+ characters)"
                      placeholderTextColor={T.placeholder}
                      value={newPassword}
                      onChangeText={t => { setNewPassword(t); setResetError(null); }}
                      onFocus={() => setFocusedField('newPassword')}
                      onBlur={() => setFocusedField(null)}
                      secureTextEntry={!showNewPw}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Pressable style={styles.eye} onPress={() => setShowNewPw(v => !v)} hitSlop={8} accessibilityLabel={showNewPw ? 'Hide password' : 'Show password'}>
                      <Ionicons name={showNewPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={T.textSub} />
                    </Pressable>
                  </View>
                  <View style={styles.pwWrap}>
                    <TextInput
                      style={[...fieldStyle('confirm', !!resetError), styles.pwInput]}
                      placeholder="Confirm new password"
                      placeholderTextColor={T.placeholder}
                      value={confirmPassword}
                      onChangeText={t => { setConfirmPassword(t); setResetError(null); }}
                      onFocus={() => setFocusedField('confirm')}
                      onBlur={() => setFocusedField(null)}
                      secureTextEntry={!showConfirmPw}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Pressable style={styles.eye} onPress={() => setShowConfirmPw(v => !v)} hitSlop={8} accessibilityLabel={showConfirmPw ? 'Hide password' : 'Show password'}>
                      <Ionicons name={showConfirmPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={T.textSub} />
                    </Pressable>
                  </View>
                  {resetError && <Text style={[styles.err, { color: T.error }]}>{resetError}</Text>}
                  <Pressable
                    onPress={handleSetNewPassword}
                    disabled={resetPwLoading || !newPassword || !confirmPassword}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.primary, { backgroundColor: T.text }, (resetPwLoading || !newPassword || !confirmPassword) ? { opacity: 0.35 } : pressed && { opacity: 0.85 }]}
                  >
                    {resetPwLoading ? <ActivityIndicator color={T.bg} size="small" /> : <Text style={[styles.primaryText, { color: T.bg }]} maxFontSizeMultiplier={1.2}>Set new password</Text>}
                  </Pressable>
                </>
              )}
            </View>
          )}

          {/* sign in / sign up */}
          {!forgotMode && !verifyEmail && (
            <View style={styles.form}>
              {isSignUp && (
                <>
                  <View style={styles.row}>
                    <View style={styles.flex}>
                      <TextInput
                        style={fieldStyle('firstName', !!errors.firstName)}
                        placeholder="First name"
                        placeholderTextColor={T.placeholder}
                        value={firstName}
                        onChangeText={t => { setFirstName(t); setError('firstName'); }}
                        onFocus={() => setFocusedField('firstName')}
                        onBlur={() => setFocusedField(null)}
                        autoCapitalize="words"
                        autoCorrect={false}
                        autoComplete="given-name"
                      />
                      {errors.firstName && <Text style={[styles.err, { color: T.error }]}>{errors.firstName}</Text>}
                    </View>
                    <View style={styles.flex}>
                      <TextInput
                        style={fieldStyle('lastName', !!errors.lastName)}
                        placeholder="Last name"
                        placeholderTextColor={T.placeholder}
                        value={lastName}
                        onChangeText={t => { setLastName(t); setError('lastName'); }}
                        onFocus={() => setFocusedField('lastName')}
                        onBlur={() => setFocusedField(null)}
                        autoCapitalize="words"
                        autoCorrect={false}
                        autoComplete="family-name"
                      />
                      {errors.lastName && <Text style={[styles.err, { color: T.error }]}>{errors.lastName}</Text>}
                    </View>
                  </View>

                  <View style={styles.pwWrap}>
                    <Text style={[styles.at, { color: T.textSub }]}>@</Text>
                    <TextInput
                      style={[
                        ...fieldStyle('username', !!errors.username || usernameStatus === 'taken' || usernameStatus === 'reserved'),
                        styles.withAt,
                        usernameStatus === 'available' && { borderColor: T.accent },
                      ]}
                      placeholder="username"
                      placeholderTextColor={T.placeholder}
                      value={username}
                      onChangeText={text => {
                        setUsernameTouched(true);
                        setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                        setError('username');
                      }}
                      onFocus={() => setFocusedField('username')}
                      onBlur={() => setFocusedField(null)}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="username"
                    />
                    <View style={styles.status} pointerEvents="none">
                      {usernameStatus === 'checking' && <ActivityIndicator size="small" color={T.textSub} />}
                      {usernameStatus === 'available' && <Ionicons name="checkmark-circle" size={20} color={T.accent} />}
                      {(usernameStatus === 'taken' || usernameStatus === 'reserved') && <Ionicons name="close-circle" size={20} color={T.error} />}
                    </View>
                  </View>
                  {(errors.username || usernameStatus === 'taken' || usernameStatus === 'reserved' || usernameStatus === 'short') && (
                    <Text style={[styles.err, { color: T.error }]}>
                      {errors.username
                        || (usernameStatus === 'taken' ? 'That username is taken.' : usernameStatus === 'reserved' ? 'That username is reserved.' : 'At least 3 characters.')}
                    </Text>
                  )}
                </>
              )}

              <TextInput
                style={fieldStyle('email', !!errors.email)}
                placeholder="Email address"
                placeholderTextColor={T.placeholder}
                value={email}
                onChangeText={t => { setEmail(t); setError('email'); setError('form'); }}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                textContentType="emailAddress"
              />
              {errors.email && <Text style={[styles.err, { color: T.error }]}>{errors.email}</Text>}

              <View style={styles.pwWrap}>
                <TextInput
                  style={[...fieldStyle('password', !!errors.password), styles.pwInput]}
                  placeholder="Password"
                  placeholderTextColor={T.placeholder}
                  value={password}
                  onChangeText={t => { setPassword(t); setError('password'); setError('form'); }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                  autoComplete={isSignUp ? 'new-password' : 'password'}
                  textContentType={isSignUp ? 'newPassword' : 'password'}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                />
                <Pressable style={styles.eye} onPress={togglePasswordVisibility} hitSlop={8} accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={T.textSub} />
                </Pressable>
              </View>
              {errors.password && <Text style={[styles.err, { color: T.error }]}>{errors.password}</Text>}

              {!isSignUp && (
                <Pressable
                  onPress={() => { setForgotMode(true); setResetSent(false); setOtpCode(''); setOtpVerified(false); setResetEmail(email); setResetError(null); }}
                  style={styles.forgot}
                  hitSlop={6}
                  accessibilityRole="button"
                >
                  <Text style={[styles.link, { color: linkBlue(T.bg === '#000000') }]}>Forgot password?</Text>
                </Pressable>
              )}

              {errors.form && <Text style={[styles.err, styles.formErr, { color: T.error }]}>{errors.form}</Text>}

              <Pressable
                onPress={handleSubmit}
                disabled={busy}
                accessibilityRole="button"
                style={({ pressed }) => [styles.primary, { backgroundColor: T.text, marginTop: isSignUp ? 14 : 6 }, busy ? { opacity: 0.5 } : pressed && { opacity: 0.85 }]}
              >
                {loading && !oauthBusy ? <ActivityIndicator color={T.bg} size="small" /> : <Text style={[styles.primaryText, { color: T.bg }]} maxFontSizeMultiplier={1.2}>Continue</Text>}
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: T.borderLight }]} />
                <Text style={[styles.dividerText, { color: T.textSub }]}>or</Text>
                <View style={[styles.dividerLine, { backgroundColor: T.borderLight }]} />
              </View>

              {appleAvailable && (
                <Pressable
                  onPress={() => runOAuth('apple')}
                  disabled={busy}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.oauth, { backgroundColor: T.card, borderColor: T.border }, busy ? { opacity: 0.5 } : pressed && { opacity: 0.8 }]}
                >
                  {oauthBusy === 'apple' ? <ActivityIndicator color={T.text} size="small" /> : (
                    <>
                      <Ionicons name="logo-apple" size={22} color={T.text} style={{ marginTop: -2 }} />
                      <Text style={[styles.oauthText, { color: T.text }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>Continue with Apple</Text>
                    </>
                  )}
                </Pressable>
              )}

              <Pressable
                onPress={() => runOAuth('google')}
                disabled={busy}
                accessibilityRole="button"
                style={({ pressed }) => [styles.oauth, { backgroundColor: T.card, borderColor: T.border }, busy ? { opacity: 0.5 } : pressed && { opacity: 0.8 }]}
              >
                {oauthBusy === 'google' ? <ActivityIndicator color={T.text} size="small" /> : (
                  <>
                    <Image source={require('../../assets/google-icon.png')} style={styles.googleIcon} resizeMode="contain" />
                    <Text style={[styles.oauthText, { color: T.text }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>Continue with Google</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          {!forgotMode && !verifyEmail && (
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: T.textSub }]}>{isSignUp ? 'Have an account?' : 'New here?'}</Text>
              <Pressable onPress={toggleAuthMode} style={styles.switch} hitSlop={6} accessibilityRole="button">
                <Text style={[styles.switchText, { color: T.text }]}>{isSignUp ? 'Sign in' : 'Create an account'}</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Supabase's own wording, made plainer where it is terse */
function friendly(msg: string) {
  if (/invalid login credentials/i.test(msg)) return 'Wrong email or password.';
  if (/email not confirmed/i.test(msg)) return 'Confirm your email first. Check your inbox for the link.';
  if (/already registered|already been registered/i.test(msg)) return 'There is already an account with this email. Sign in instead.';
  if (/rate limit|too many/i.test(msg)) return 'Too many tries. Wait a minute and try again.';
  return msg;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28 },
  topRow: { height: 44, justifyContent: 'center', marginBottom: 12 },
  back: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6 },
  sub: { fontSize: 15, lineHeight: 21, marginTop: 6 },
  form: { marginTop: 24 },
  row: { flexDirection: 'row', gap: 10 },
  input: { height: 54, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 0, fontSize: 16, marginTop: 10 },
  pwWrap: { position: 'relative' },
  pwInput: { paddingRight: 50 },
  eye: { position: 'absolute', right: 14, top: 10 + 17, padding: 2 },
  at: { position: 'absolute', left: 16, top: 10 + 17, zIndex: 1, fontSize: 16, fontWeight: '600' },
  withAt: { paddingLeft: 34, paddingRight: 44 },
  status: { position: 'absolute', right: 14, top: 10 + 17 },
  err: { fontSize: 13, lineHeight: 17, marginTop: 6, marginLeft: 4 },
  formErr: { marginTop: 12, marginLeft: 0 },
  note: { fontSize: 13, lineHeight: 17, marginTop: 6, marginLeft: 4 },
  forgot: { alignSelf: 'flex-end', paddingVertical: 10 },
  link: { fontSize: 14, fontWeight: '600' },
  linkBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  primary: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  primaryText: { fontSize: 17, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13 },
  oauth: { height: 54, borderRadius: 27, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 },
  oauthText: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  googleIcon: { width: 18, height: 18 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', marginTop: 'auto', paddingTop: 20 },
  footerText: { fontSize: 15 },
  switch: { paddingVertical: 8, paddingHorizontal: 6 },
  switchText: { fontSize: 15, fontWeight: '700' },
  otpWrap: { position: 'relative', marginTop: 14, marginBottom: 4 },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  otpBox: { flex: 1, maxWidth: 48, height: 56, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  otpDigit: { fontSize: 22, fontWeight: '700' },
  otpHidden: { position: 'absolute', width: '100%', height: '100%', color: 'transparent', backgroundColor: 'transparent', opacity: 0.01 },
});
