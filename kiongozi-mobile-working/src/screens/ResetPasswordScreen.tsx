import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';

interface ResetPasswordScreenProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function ResetPasswordScreen({ visible, onDismiss }: ResetPasswordScreenProps) {
  const { updatePassword } = useAuthStore();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Clear state whenever modal is opened/closed
  React.useEffect(() => {
    if (!visible) {
      setNewPassword('');
      setConfirmPassword('');
      setShowNew(false);
      setShowConfirm(false);
      setLoading(false);
      setFocusedField(null);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    const result = await updatePassword(newPassword);
    setLoading(false);
    if (result.success) {
      Alert.alert('Password updated', 'Your password has been changed. Please sign in.', [
        { text: 'OK', onPress: onDismiss },
      ]);
    } else {
      Alert.alert('Error', result.error || 'Failed to update password.');
    }
  };

  return (
    <Modal visible={visible} presentationStyle="pageSheet" animationType="slide">
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.inner}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Set New Password</Text>
            <TouchableOpacity onPress={onDismiss} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Enter a new password for your account.
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, focusedField === 'new' && styles.inputFocused]}
              placeholder="New password (min. 8 characters)"
              placeholderTextColor="#9ca3af"
              value={newPassword}
              onChangeText={setNewPassword}
              onFocus={() => setFocusedField('new')}
              onBlur={() => setFocusedField(null)}
              secureTextEntry={!showNew}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNew(!showNew)}>
              <Ionicons name={showNew ? 'eye-off' : 'eye'} size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, focusedField === 'confirm' && styles.inputFocused]}
              placeholder="Confirm new password"
              placeholderTextColor="#9ca3af"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onFocus={() => setFocusedField('confirm')}
              onBlur={() => setFocusedField(null)}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(!showConfirm)}>
              <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, (loading || !newPassword || !confirmPassword) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading || !newPassword || !confirmPassword}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Set New Password</Text>
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 24,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingRight: 48,
    fontSize: 15,
    color: '#FFFFFF',
  },
  inputFocused: {
    borderColor: '#5CB85C',
    borderWidth: 2,
  },
  eyeBtn: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  submitBtn: {
    backgroundColor: '#5CB85C',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#333333',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
