import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export interface ChatSuggestion {
  id: string;
  text: string;
  action: string;
  category: 'learning' | 'career' | 'tech' | 'general';
  icon: string;
  color: string;
  featured?: boolean;
}

interface SmartSuggestionsProps {
  onSuggestionPress: (suggestion: ChatSuggestion) => void;
  darkMode?: boolean;
  maxSuggestions?: number;
  showCategories?: boolean;
  contextualSuggestions?: ChatSuggestion[];
  style?: any;
}

// Stable empty array to prevent re-renders
const EMPTY_CONTEXTUAL_SUGGESTIONS: ChatSuggestion[] = [];

// Predefined suggestions organized by category
const DEFAULT_SUGGESTIONS: ChatSuggestion[] = [
  // Learning Category
  {
    id: 'learn-1',
    text: 'Show me learning modules',
    action: '/modules',
    category: 'learning',
    icon: 'book-outline',
    color: '#10b981',
    featured: true,
  },
  {
    id: 'learn-2',
    text: 'What can I learn about green technology?',
    action: 'What learning modules are available about sustainable technology and green innovation?',
    category: 'learning',
    icon: 'leaf-outline',
    color: '#10b981',
  },
  {
    id: 'learn-3',
    text: 'Check my progress',
    action: '/progress',
    category: 'learning',
    icon: 'trending-up-outline',
    color: '#10b981',
  },
  {
    id: 'learn-4',
    text: 'Digital skills training',
    action: 'What digital skills training modules are available for career advancement?',
    category: 'learning',
    icon: 'laptop-outline',
    color: '#3b82f6',
  },

  // Career Category
  {
    id: 'career-1',
    text: 'Career paths in green economy',
    action: 'What career opportunities are available in Kenya\'s green economy and sustainability sector?',
    category: 'career',
    icon: 'briefcase-outline',
    color: '#8b5cf6',
    featured: true,
  },
  {
    id: 'career-2',
    text: 'Digital entrepreneurship guide',
    action: 'How can I start a digital business in Kenya? What skills and resources do I need?',
    category: 'career',
    icon: 'rocket-outline',
    color: '#8b5cf6',
  },
  {
    id: 'career-3',
    text: 'Remote work opportunities',
    action: 'What remote work opportunities are available for Kenyan youth in the digital economy?',
    category: 'career',
    icon: 'globe-outline',
    color: '#8b5cf6',
  },

  // Technology Category
  {
    id: 'tech-1',
    text: 'Latest tech trends in Kenya',
    action: 'What are the latest technology trends and innovations happening in Kenya right now?',
    category: 'tech',
    icon: 'phone-portrait-outline',
    color: '#3b82f6',
    featured: true,
  },
  {
    id: 'tech-2',
    text: 'Learn about AI and machine learning',
    action: 'How can I get started with artificial intelligence and machine learning? What resources are available?',
    category: 'tech',
    icon: 'hardware-chip-outline',
    color: '#3b82f6',
  },
  {
    id: 'tech-3',
    text: 'Renewable energy technologies',
    action: 'What renewable energy technologies are most relevant for Kenya\'s future?',
    category: 'tech',
    icon: 'sunny-outline',
    color: '#f59e0b',
  },

  // General Category
  {
    id: 'general-1',
    text: 'What is Kiongozi Platform?',
    action: 'Tell me about the Kiongozi Platform and how it can help me with my learning journey.',
    category: 'general',
    icon: 'help-circle-outline',
    color: '#6b7280',
  },
  {
    id: 'general-2',
    text: 'Twin Green & Digital Transition',
    action: 'Explain Kenya\'s Twin Green and Digital Transition strategy and how it affects young people.',
    category: 'general',
    icon: 'swap-horizontal-outline',
    color: '#10b981',
  },
];

const CATEGORY_CONFIGS = {
  learning: { name: 'Learning', color: '#10b981', icon: 'school-outline' },
  career: { name: 'Career', color: '#8b5cf6', icon: 'briefcase-outline' },
  tech: { name: 'Technology', color: '#3b82f6', icon: 'hardware-chip-outline' },
  general: { name: 'General', color: '#6b7280', icon: 'chatbubble-outline' },
};

export default function SmartSuggestions({
  onSuggestionPress,
  darkMode = false,
  maxSuggestions = 8,
  showCategories = true,
  contextualSuggestions = EMPTY_CONTEXTUAL_SUGGESTIONS,
  style,
}: SmartSuggestionsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>([]);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Memoize the filtered and sorted suggestions to prevent infinite re-renders
  const filteredSuggestions = useMemo(() => {
    // Combine contextual and default suggestions
    const allSuggestions = [...contextualSuggestions, ...DEFAULT_SUGGESTIONS];
    
    // Filter by category if selected
    const filtered = selectedCategory
      ? allSuggestions.filter(s => s.category === selectedCategory)
      : allSuggestions;

    // Prioritize featured suggestions
    const sorted = filtered.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return 0;
    });

    // Limit to max suggestions
    return sorted.slice(0, maxSuggestions);
  }, [selectedCategory, contextualSuggestions, maxSuggestions]);

  useEffect(() => {
    setSuggestions(filteredSuggestions);
  }, [filteredSuggestions]);

  // Separate effect for animation to avoid re-running unnecessarily
  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [selectedCategory]); // Only animate on category change

  const handleCategoryPress = (category: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(selectedCategory === category ? null : category);
  };

  const handleSuggestionPress = (suggestion: ChatSuggestion) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSuggestionPress(suggestion);
  };

  const renderCategoryFilter = () => {
    if (!showCategories) return null;

    return (
      <View style={styles.categoriesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {Object.entries(CATEGORY_CONFIGS).map(([key, config]) => {
            const isSelected = selectedCategory === key;
            const suggestionCount = DEFAULT_SUGGESTIONS.filter(s => s.category === key).length;

            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.categoryChip,
                  darkMode && styles.categoryChipDark,
                  isSelected && { backgroundColor: config.color },
                ]}
                onPress={() => handleCategoryPress(key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={config.icon as any}
                  size={16}
                  color={isSelected ? '#ffffff' : (darkMode ? '#9ca3af' : '#6b7280')}
                />
                <Text
                  style={[
                    styles.categoryText,
                    darkMode && styles.categoryTextDark,
                    isSelected && styles.categoryTextSelected,
                  ]}
                >
                  {config.name}
                </Text>
                <View
                  style={[
                    styles.categoryBadge,
                    isSelected && styles.categoryBadgeSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryBadgeText,
                      isSelected && styles.categoryBadgeTextSelected,
                    ]}
                  >
                    {suggestionCount}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderSuggestions = () => {
    if (suggestions.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, darkMode && styles.emptyTextDark]}>
            No suggestions available
          </Text>
        </View>
      );
    }

    return (
      <Animated.View style={[styles.suggestionsGrid, { opacity: fadeAnim }]}>
        {suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={suggestion.id}
            style={[
              styles.suggestionCard,
              darkMode && styles.suggestionCardDark,
              suggestion.featured && styles.suggestionCardFeatured,
              {
                width: (width - 48 - 12) / 2, // Account for padding and gap
              }
            ]}
            onPress={() => handleSuggestionPress(suggestion)}
            activeOpacity={0.8}
          >
            {/* Icon */}
            <View
              style={[
                styles.suggestionIcon,
                { backgroundColor: `${suggestion.color}15` },
              ]}
            >
              <Ionicons
                name={suggestion.icon as any}
                size={20}
                color={suggestion.color}
              />
            </View>

            {/* Text - up to 6 lines with better spacing */}
            <Text
              style={[
                styles.suggestionText,
                darkMode && styles.suggestionTextDark,
              ]}
              numberOfLines={6} // Increased to 6 lines for better content display
            >
              {suggestion.text}
            </Text>

            {/* Featured badge */}
            {suggestion.featured && (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={12} color="#fbbf24" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {renderCategoryFilter()}
      {renderSuggestions()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  categoryChipDark: {
    backgroundColor: '#374151',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  categoryTextDark: {
    color: '#9ca3af',
  },
  categoryTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  categoryBadge: {
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  categoryBadgeSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  categoryBadgeTextSelected: {
    color: '#ffffff',
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    alignItems: 'flex-start', // Align cards to top when heights differ
  },
  suggestionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 100,
    maxHeight: 160, // Increased to accommodate more text
    justifyContent: 'flex-start',
  },
  suggestionCardDark: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  suggestionCardFeatured: {
    borderColor: '#3b82f6',
    borderWidth: 1.5,
  },
  suggestionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start', // Align icon to start
  },
  suggestionText: {
    fontSize: 14,
    lineHeight: 21, // Slightly increased for better readability
    color: '#374151',
    fontWeight: '500',
    marginTop: 12,
    flexShrink: 1, // Allow text to shrink but not truncate
    flexGrow: 1, // Allow text to grow to fit content
    textAlign: 'left', // Ensure consistent alignment
  },
  suggestionTextDark: {
    color: '#e5e7eb',
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  emptyTextDark: {
    color: '#9ca3af',
  },
});
