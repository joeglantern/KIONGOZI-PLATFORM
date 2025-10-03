import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ChatSuggestion } from './SmartSuggestions';

const { width } = Dimensions.get('window');

interface WelcomeScreenProps {
  onSuggestionPress: (suggestion: ChatSuggestion) => void;
  darkMode?: boolean;
  userName?: string;
}

// Simple suggestions matching web app
const SUGGESTIONS: ChatSuggestion[] = [
  {
    id: 'learn-modules',
    text: 'Show me learning modules',
    action: '/modules',
    category: 'learning',
    icon: '📚',
    color: '#10b981',
  },
  {
    id: 'learn-green-tech',
    text: 'Green technology modules',
    action: 'What learning modules are available about sustainable technology and green innovation?',
    category: 'learning',
    icon: '🌱',
    color: '#10b981',
  },
  {
    id: 'learn-progress',
    text: 'Check my progress',
    action: '/progress',
    category: 'learning',
    icon: '📊',
    color: '#10b981',
  },
  {
    id: 'career-green-economy',
    text: 'Career paths in green economy',
    action: 'What career opportunities are available in Kenya\'s green economy and sustainability sector?',
    category: 'career',
    icon: '💼',
    color: '#8b5cf6',
  },
  {
    id: 'tech-ai-ml',
    text: 'Learn about AI and machine learning',
    action: 'How can I get started with artificial intelligence and machine learning? What resources are available?',
    category: 'tech',
    icon: '🤖',
    color: '#3b82f6',
  },
  {
    id: 'general-platform',
    text: 'What is Kiongozi Platform?',
    action: 'Tell me about the Kiongozi Platform and how it can help me with my learning journey.',
    category: 'general',
    icon: '❓',
    color: '#6b7280',
  },
];

export default function WelcomeScreen({
  onSuggestionPress,
  darkMode = false,
  userName = 'there',
}: WelcomeScreenProps) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const [showSuggestions, setShowSuggestions] = useState(false);

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleSuggestionsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSuggestions(true);
  };

  const handleSuggestionSelect = (suggestion: ChatSuggestion) => {
    setShowSuggestions(false);
    onSuggestionPress(suggestion);
  };

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          darkMode && styles.containerDark,
          { opacity: fadeAnim }
        ]}
      >
        {/* Clean centered welcome */}
        <View style={styles.centerSection}>
          <View style={styles.titleContainer}>
            <Text style={[styles.mainTitle, darkMode && styles.mainTitleDark]}>
              How can I help you today?
            </Text>
            <Text style={[styles.subtitle, darkMode && styles.subtitleDark]}>
              Ask me anything about your learning journey, digital transformation, or green technologies.
            </Text>
          </View>

          {/* Show suggestions button */}
          <TouchableOpacity
            style={[styles.suggestionsButton, darkMode && styles.suggestionsButtonDark]}
            onPress={handleSuggestionsPress}
            activeOpacity={0.7}
          >
            <Ionicons
              name="bulb-outline"
              size={18}
              color={darkMode ? '#9ca3af' : '#6b7280'}
            />
            <Text style={[styles.suggestionsButtonText, darkMode && styles.suggestionsButtonTextDark]}>
              Show suggestions
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={darkMode ? '#9ca3af' : '#6b7280'}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Simple suggestions modal */}
      <Modal
        visible={showSuggestions}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSuggestions(false)}
      >
        <View style={[styles.modalContainer, darkMode && styles.modalContainerDark]}>
          {/* Modal header */}
          <View style={[styles.modalHeader, darkMode && styles.modalHeaderDark]}>
            <View style={styles.modalHeaderContent}>
              <Text style={[styles.modalTitle, darkMode && styles.modalTitleDark]}>
                What would you like to explore?
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowSuggestions(false)}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={darkMode ? '#9ca3af' : '#6b7280'}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Simple suggestions grid */}
          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.suggestionsGrid}>
              {SUGGESTIONS.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion.id}
                  style={[styles.suggestionCard, darkMode && styles.suggestionCardDark]}
                  onPress={() => handleSuggestionSelect(suggestion)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestionIcon}>{suggestion.icon}</Text>
                  <Text style={[styles.suggestionText, darkMode && styles.suggestionTextDark]} numberOfLines={2}>
                    {suggestion.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    maxWidth: width - 48,
    marginBottom: 40,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '400',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  mainTitleDark: {
    color: '#f9fafb',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: width - 80,
  },
  subtitleDark: {
    color: '#9ca3af',
  },
  suggestionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    gap: 8,
  },
  suggestionsButtonDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  suggestionsButtonText: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
  suggestionsButtonTextDark: {
    color: '#9ca3af',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalContainerDark: {
    backgroundColor: '#111827',
  },
  modalHeader: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingTop: 16,
    paddingBottom: 16,
  },
  modalHeaderDark: {
    backgroundColor: '#1f2937',
    borderBottomColor: '#374151',
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  modalTitleDark: {
    color: '#f9fafb',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  suggestionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    width: (width - 52) / 2, // 2 cards per row with gaps
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
    minHeight: 100,
  },
  suggestionCardDark: {
    backgroundColor: '#1f2937',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  suggestionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 13,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '500',
  },
  suggestionTextDark: {
    color: '#d1d5db',
  },
});
