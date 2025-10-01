"use client";

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { StopCircle, ArrowUp, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChatInputProps } from '../../types/chat';
import ChatInputHints from './ChatInputHints';
import SimpleQuickActionsMenu from './SimpleQuickActionsMenu';

const ChatInput: React.FC<ChatInputProps> = ({
  input,
  onInputChange,
  onSendMessage,
  isLoading = false,
  isDisabled = false,
  placeholder = "Ask a question...",
  maxLength = 10000,
  onFocusChange,
  showVoiceInput = false,
  onVoiceInputStart
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading || isDisabled) return;

    const message = input.trim();
    // Clear input immediately for better UX
    onInputChange('');

    try {
      setIsGenerating(true);
      await onSendMessage(message);
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore input on error
      onInputChange(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInputChangeInternal = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;

    // Enforce max length
    if (maxLength && newValue.length > maxLength) {
      return;
    }

    onInputChange(newValue);

    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFocus = () => {
    setIsInputFocused(true);
    setShowHints(true);
    onFocusChange?.(true);
  };

  const handleBlur = () => {
    setIsInputFocused(false);
    // Delay hiding hints to allow clicking on them
    setTimeout(() => setShowHints(false), 150);
    onFocusChange?.(false);
  };

  const handleCommandSelect = (command: string) => {
    onInputChange(command);
    inputRef.current?.focus();
  };

  const handleQuickActionSelect = (command: string) => {
    onInputChange(command);
    setShowQuickActions(false);
    inputRef.current?.focus();
  };


  const stopGeneration = () => {
    setIsGenerating(false);
    // This would typically cancel the ongoing request
  };

  // Handle keyboard shortcuts
  const handleKeyDownWithShortcuts = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + K opens quick actions
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setShowQuickActions(true);
      return;
    }

    // Forward slash opens quick actions (when input is empty)
    if (e.key === '/' && input.trim() === '') {
      e.preventDefault();
      setShowQuickActions(true);
      return;
    }

    handleKeyDown(e);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className={`relative bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-200 ${
          isInputFocused ? 'border-gray-300 shadow-xl' : 'shadow-lg'
        }`}>
          <div className="flex items-end gap-3 px-4 py-3">
            {/* Quick Actions Button */}
            <Button
              type="button"
              onClick={() => setShowQuickActions(true)}
              size="sm"
              variant="ghost"
              className={`rounded-lg w-7 h-7 p-0 min-w-7 shrink-0 transition-all duration-200 hover:bg-gray-100 ${
                isInputFocused ? 'text-gray-600' : 'text-gray-400'
              }`}
              title="Quick Actions (Ctrl+K or /)"
            >
              <Grid3X3 size={16} />
            </Button>

            {/* Main textarea */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChangeInternal}
              onKeyDown={handleKeyDownWithShortcuts}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
              className="flex-1 resize-none bg-transparent text-gray-900 focus:outline-none min-h-[24px] max-h-[120px] placeholder-gray-500 text-[15px] leading-6"
              disabled={isLoading || isDisabled}
              maxLength={maxLength}
              rows={1}
            />

            {/* Send/Stop button */}
            {isGenerating ? (
              <Button
                type="button"
                onClick={stopGeneration}
                size="sm"
                variant="destructive"
                className="rounded-lg w-7 h-7 p-0 min-w-7 shrink-0"
              >
                <StopCircle size={16} />
              </Button>
            ) : (
              <Button
                type="submit"
                size="sm"
                disabled={isLoading || !input.trim() || isDisabled}
                className={`rounded-lg w-7 h-7 p-0 min-w-7 shrink-0 transition-all duration-200 ${
                  input.trim()
                    ? 'bg-gray-900 hover:bg-gray-800'
                    : 'bg-gray-200 cursor-not-allowed'
                }`}
              >
                <ArrowUp
                  size={16}
                  className={input.trim() ? 'text-white' : 'text-gray-400'}
                />
              </Button>
            )}
          </div>

          {/* Character counter (show when approaching limit) */}
          {maxLength && input.length > maxLength * 0.8 && (
            <div className="px-3 pb-2">
              <div className="text-xs text-gray-500 text-right">
                {input.length}/{maxLength}
              </div>
            </div>
          )}
        </div>
      </form>

      {/* Command hints */}
      <ChatInputHints
        onCommandSelect={handleCommandSelect}
        input={input}
        isVisible={showHints && input.trim() === ''}
      />

      {/* Quick Actions Menu */}
      <SimpleQuickActionsMenu
        visible={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        onActionSelect={handleQuickActionSelect}
      />
    </div>
  );
};

export default ChatInput;