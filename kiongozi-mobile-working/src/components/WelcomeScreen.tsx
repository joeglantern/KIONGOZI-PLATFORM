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
import SmartSuggestions, { ChatSuggestion } from './SmartSuggestions';

const { width } = Dimensions.get('window');

interface WelcomeScreenProps {
  onSuggestionPress: (suggestion: ChatSuggestion) => void;
  darkMode?: boolean;
  userName?: string;
}

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

          {/* Subtle suggestion button */}
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

      {/* Responsive suggestions modal */}
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

          {/* Suggestions content */}
          <ScrollView 
            style={styles.modalContent}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={true}
            indicatorStyle={darkMode ? 'white' : 'black'}
            bounces={true}
            decelerationRate="fast"
          >
            <SmartSuggestions
              onSuggestionPress={handleSuggestionSelect}
              darkMode={darkMode}
              maxSuggestions={12} // Increased to show more suggestions
              showCategories={true}
            />
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
    fontSize: 32,
    fontWeight: '400',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  mainTitleDark: {
    color: '#f9fafb',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
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
  closeButtonDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalContent: {
    flex: 1,
    paddingTop: 16,
  },
  modalScrollContent: {
    paddingBottom: 40, // Extra padding at bottom for better scrolling experience
    flexGrow: 1, // Allow content to expand if needed
  },
});
