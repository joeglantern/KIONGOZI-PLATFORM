"use client";

/**
 * AuthModalManager Component
 * Manages switching between login and signup modals
 * Handles authentication flow and callbacks
 */
import { useState } from 'react';
import AuthModal from './AuthModal';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';

interface AuthModalManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialView?: 'login' | 'signup';
}

export default function AuthModalManager({
  isOpen,
  onClose,
  onSuccess,
  initialView = 'login'
}: AuthModalManagerProps) {
  const [currentView, setCurrentView] = useState<'login' | 'signup'>(initialView);

  const handleSuccess = () => {
    // Close modal and trigger success callback
    onClose();
    if (onSuccess) {
      onSuccess();
    }
  };

  const handleSwitchToSignup = () => {
    setCurrentView('signup');
  };

  const handleSwitchToLogin = () => {
    setCurrentView('login');
  };

  // Reset view when modal closes
  const handleClose = () => {
    setCurrentView(initialView);
    onClose();
  };

  return (
    <AuthModal
      isOpen={isOpen}
      onClose={handleClose}
      title={currentView === 'login' ? 'Sign in' : 'Create an account'}
    >
      {currentView === 'login' ? (
        <LoginForm
          onSuccess={handleSuccess}
          onSwitchToSignup={handleSwitchToSignup}
          showSignupLink={true}
        />
      ) : (
        <SignupForm
          onSuccess={handleSuccess}
          onSwitchToLogin={handleSwitchToLogin}
          showLoginLink={true}
        />
      )}
    </AuthModal>
  );
}
