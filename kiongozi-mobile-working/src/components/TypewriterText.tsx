import React, { useState, useEffect, useRef } from 'react';
import { Text, View, StyleSheet, Animated } from 'react-native';

interface TypewriterTextProps {
  text: string;
  speed?: number; // Characters per second
  onComplete?: () => void;
  style?: any;
  darkMode?: boolean;
  showCursor?: boolean;
  startDelay?: number; // Delay before starting animation
  enableSound?: boolean; // For future sound effects
}

export default function TypewriterText({
  text,
  speed = 50, // 50 characters per second
  onComplete,
  style,
  darkMode = false,
  showCursor = true,
  startDelay = 0,
  enableSound = false,
}: TypewriterTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Cursor blinking animation
  useEffect(() => {
    if (!showCursor) return;

    const blinkAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );

    blinkAnimation.start();

    return () => blinkAnimation.stop();
  }, [showCursor, cursorOpacity]);

  // Main typewriter effect
  useEffect(() => {
    if (!text || text.length === 0) {
      setIsComplete(true);
      onComplete?.();
      return;
    }

    // Reset state when text changes
    setDisplayText('');
    setCurrentIndex(0);
    setIsComplete(false);
    startTimeRef.current = null;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const startAnimation = () => {
      startTimeRef.current = Date.now();
      animateText();
    };

    if (startDelay > 0) {
      timeoutRef.current = setTimeout(startAnimation, startDelay);
    } else {
      startAnimation();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, speed, startDelay]);

  const animateText = () => {
    if (!startTimeRef.current) return;

    const elapsed = Date.now() - startTimeRef.current;
    const targetIndex = Math.min(
      Math.floor((elapsed / 1000) * speed),
      text.length
    );

    if (targetIndex > currentIndex) {
      const newText = text.substring(0, targetIndex);
      setDisplayText(newText);
      setCurrentIndex(targetIndex);

      // Add subtle haptic feedback for punctuation (optional)
      // if (enableSound && /[.!?]/.test(text[targetIndex - 1])) {
      //   // Could add haptic feedback here
      // }
    }

    if (targetIndex < text.length) {
      // Continue animation
      timeoutRef.current = setTimeout(animateText, 16); // ~60fps
    } else {
      // Animation complete
      setIsComplete(true);
      onComplete?.();
    }
  };

  // Stop cursor blinking when complete
  useEffect(() => {
    if (isComplete && showCursor) {
      // Stop blinking and show solid cursor briefly, then hide
      cursorOpacity.stopAnimation();
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.delay(500),
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isComplete, showCursor, cursorOpacity]);

  const renderFormattedText = (text: string) => {
    // Simple markdown-like formatting
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/);
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // Bold text
        return (
          <Text
            key={index}
            style={[
              styles.boldText,
              darkMode && styles.boldTextDark
            ]}
          >
            {part.slice(2, -2)}
          </Text>
        );
      } else if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
        // Italic text
        return (
          <Text
            key={index}
            style={[
              styles.italicText,
              darkMode && styles.italicTextDark
            ]}
          >
            {part.slice(1, -1)}
          </Text>
        );
      } else if (part.startsWith('`') && part.endsWith('`')) {
        // Inline code
        return (
          <Text
            key={index}
            style={[
              styles.codeText,
              darkMode && styles.codeTextDark
            ]}
          >
            {part.slice(1, -1)}
          </Text>
        );
      } else {
        // Regular text
        return (
          <Text key={index} style={style}>
            {part}
          </Text>
        );
      }
    });
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.text, darkMode && styles.textDark, style]}>
        {renderFormattedText(displayText)}
        {showCursor && !isComplete && (
          <Animated.Text
            style={[
              styles.cursor,
              darkMode && styles.cursorDark,
              { opacity: cursorOpacity }
            ]}
          >
            |
          </Animated.Text>
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1f2937',
    flexWrap: 'wrap',
  },
  textDark: {
    color: '#f3f4f6',
  },
  cursor: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '300',
  },
  cursorDark: {
    color: '#60a5fa',
  },
  boldText: {
    fontWeight: '600',
    color: '#111827',
  },
  boldTextDark: {
    color: '#f9fafb',
  },
  italicText: {
    fontStyle: 'italic',
    color: '#374151',
  },
  italicTextDark: {
    color: '#e5e7eb',
  },
  codeText: {
    fontFamily: 'Courier',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 14,
    color: '#dc2626',
  },
  codeTextDark: {
    backgroundColor: '#374151',
    color: '#fbbf24',
  },
});

