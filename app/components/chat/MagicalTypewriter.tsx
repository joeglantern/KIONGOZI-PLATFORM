"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TypewriterEffectProps } from '../../types/chat';
import { processMarkdown } from '../../utils/messageProcessing';

const MagicalTypewriter: React.FC<TypewriterEffectProps> = ({
  text,
  onComplete,
  speed = 80,
  className = ''
}) => {
  const [visibleWords, setVisibleWords] = useState<number>(0);
  const [isComplete, setIsComplete] = useState(false);

  // Parse text into words while preserving formatting
  const words = useMemo(() => {
    if (!text) return [];

    // Split by spaces but preserve markdown and formatting
    const rawWords = text.split(/(\s+)/);
    const filteredWords = rawWords.filter(word => word.length > 0);
    console.log('📝 [MagicalTypewriter] Parsed words:', filteredWords.length, filteredWords.slice(0, 5));
    return filteredWords;
  }, [text]);

  // Natural typing speed with variance
  const getWordDelay = (wordIndex: number, word: string) => {
    // Base delay
    let delay = speed;

    // Longer words take slightly longer to "think"
    if (word.length > 8) delay += 20;

    // Punctuation adds natural pause
    if (/[.!?]$/.test(word)) delay += 100;
    if (/[,;:]$/.test(word)) delay += 50;

    // Paragraph breaks (double newlines) add longer pause
    if (word.includes('\n\n')) delay += 200;
    if (word.includes('\n')) delay += 80;

    // Add natural variance (±30ms)
    delay += (Math.random() - 0.5) * 60;

    return Math.max(delay, 20); // Minimum 20ms
  };

  // Animate words appearing
  useEffect(() => {
    console.log('🎬 [MagicalTypewriter] Animation state:', { visibleWords, totalWords: words.length, isComplete });

    if (visibleWords < words.length && !isComplete) {
      const currentWord = words[visibleWords] || '';
      const delay = getWordDelay(visibleWords, currentWord);

      console.log(`⏱️ [MagicalTypewriter] Showing word ${visibleWords}: "${currentWord}" (delay: ${delay}ms)`);

      const timeout = setTimeout(() => {
        setVisibleWords(prev => prev + 1);
      }, delay);

      return () => clearTimeout(timeout);
    } else if (visibleWords >= words.length && !isComplete) {
      console.log('✅ [MagicalTypewriter] Animation complete, calling onComplete');
      setIsComplete(true);
      onComplete?.();
    }
  }, [visibleWords, words.length, isComplete, speed, onComplete, words]);

  // Reset when text changes
  useEffect(() => {
    console.log('🔄 [MagicalTypewriter] Text changed, resetting animation:', text.substring(0, 50) + '...');
    setVisibleWords(0);
    setIsComplete(false);
  }, [text]);

  // When complete, show formatted final text
  if (isComplete && words.length > 0) {
    return (
      <div
        className={`leading-relaxed ${className}`}
        dangerouslySetInnerHTML={{ __html: processMarkdown(text) }}
      />
    );
  }

  // During animation, show words with beautiful fade-in effects
  return (
    <div className={`leading-relaxed ${className}`}>
      <AnimatePresence>
        {words.slice(0, visibleWords).map((word, index) => (
          <motion.span
            key={`word-${index}`}
            initial={{
              opacity: 0,
              y: 12,
              filter: 'blur(6px)',
              scale: 0.9,
              rotateX: 15
            }}
            animate={{
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
              scale: 1,
              rotateX: 0
            }}
            transition={{
              duration: 0.6,
              ease: [0.25, 0.46, 0.45, 0.94], // More magical easing curve
              delay: index * 0.08, // Slightly more noticeable stagger
            }}
            className="inline-block"
          >
            {word}
            {/* Add space after word if it's not whitespace */}
            {!word.match(/^\s/) && index < visibleWords - 1 && ' '}
          </motion.span>
        ))}
      </AnimatePresence>

      {/* Magical cursor with beautiful animations */}
      {!isComplete && (
        <motion.span
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [0.8, 1.1, 0.8],
            boxShadow: [
              "0 0 0px rgba(59, 130, 246, 0.3)",
              "0 0 8px rgba(59, 130, 246, 0.8)",
              "0 0 0px rgba(59, 130, 246, 0.3)"
            ]
          }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="inline-block w-1 h-5 bg-gradient-to-b from-blue-400 via-purple-500 to-blue-600 ml-1 rounded-full shadow-lg"
        />
      )}
    </div>
  );
};

export default MagicalTypewriter;