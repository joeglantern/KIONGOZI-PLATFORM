"use client";

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FiStopCircle, FiArrowUp } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import type { ChatInputProps } from '../../types/chat';

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
    onFocusChange?.(true);
  };

  const handleBlur = () => {
    setIsInputFocused(false);
    onFocusChange?.(false);
  };

  const stopGeneration = () => {
    setIsGenerating(false);
    // This would typically cancel the ongoing request
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className={`relative bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700/50 overflow-hidden transition-all duration-200 ${
          isInputFocused ? 'ring-1 ring-gray-300 dark:ring-gray-600' : ''
        }`}>
          <div className="flex items-end gap-3 px-4 py-3">
            {/* Main textarea */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChangeInternal}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
              className="flex-1 resize-none bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none min-h-[24px] max-h-[200px] placeholder-gray-500 dark:placeholder-gray-400 text-base leading-6"
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
                className="rounded-full w-8 h-8 p-0 min-w-8 shrink-0"
              >
                <FiStopCircle size={16} />
              </Button>
            ) : (
              <Button
                type="submit"
                size="sm"
                disabled={isLoading || !input.trim() || isDisabled}
                className={`rounded-full w-8 h-8 p-0 min-w-8 shrink-0 transition-all duration-200 ${
                  input.trim()
                    ? 'bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200'
                    : 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed'
                }`}
              >
                <FiArrowUp
                  size={16}
                  className={input.trim() ? 'text-white dark:text-gray-900' : 'text-gray-400'}
                />
              </Button>
            )}
          </div>

          {/* Character counter (show when approaching limit) */}
          {maxLength && input.length > maxLength * 0.8 && (
            <div className="px-4 pb-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                {input.length}/{maxLength}
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default ChatInput;