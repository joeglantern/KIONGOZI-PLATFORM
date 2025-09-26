"use client";

import React, { useState, useEffect } from 'react';
import type { TypewriterEffectProps } from '../../types/chat';
import { processMarkdown } from '../../utils/messageProcessing';

const TypewriterEffect: React.FC<TypewriterEffectProps> = ({
  text,
  onComplete,
  speed = 30,
  className = ''
}) => {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);


  // Faster typing speed
  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        // Add multiple characters at once for faster typing
        const charsToAdd = Math.min(
          // Add 2-4 characters at a time for smooth typing
          2 + Math.floor(Math.random() * 3),
          // Don't go past the end of text
          text.length - currentIndex
        );

        const nextChars = text.substring(currentIndex, currentIndex + charsToAdd);
        setDisplayText(prev => {
          const newText = prev + nextChars;
          return newText;
        });

        setCurrentIndex(prev => prev + charsToAdd);
      }, speed + Math.random() * 10); // Configurable typing speed with randomization

      return () => clearTimeout(timeout);
    } else if (onComplete && !isComplete) {
      setIsComplete(true);
      onComplete();
    }
  }, [currentIndex, text, onComplete, isComplete, speed]);

  // Reset effect when text changes
  useEffect(() => {
    setDisplayText("");
    setCurrentIndex(0);
    setIsComplete(false);
  }, [text]);

  // When typing is complete, return the full text with formatting
  if (currentIndex >= text.length && text.length > 0) {
    return (
      <div
        className={`leading-relaxed ${className}`}
        dangerouslySetInnerHTML={{ __html: processMarkdown(text) }}
      />
    );
  }

  // During typing, show current progress with cursor

  return (
    <div className={`leading-relaxed ${className}`}>
      <span dangerouslySetInnerHTML={{ __html: processMarkdown(displayText) }} />
      <span className="inline-block w-0.5 h-5 bg-blue-500 ml-1 animate-pulse" />
    </div>
  );
};

export default TypewriterEffect;