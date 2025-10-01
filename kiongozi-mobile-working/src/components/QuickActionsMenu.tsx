/**
 * QuickActionsMenu Component
 * User-friendly alternative to slash commands with visual UI
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  command: string;
  category: 'learning' | 'progress' | 'search' | 'help';
}

interface QuickActionsMenuProps {
  visible: boolean;
  onClose: () => void;
  onActionSelect: (command: string) => void;
  darkMode?: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
  // Learning Actions
  {
    id: 'browse-modules',
    title: 'Browse Modules',
    description: 'Show all available learning modules',
    icon: 'library-outline',
    color: '#3b82f6',
    command: '/modules',
    category: 'learning'
  },
  {
    id: 'featured-modules',
    title: 'Featured Content',
    description: 'Show top recommended modules',
    icon: 'star-outline',
    color: '#fbbf24',
    command: '/modules featured',
    category: 'learning'
  },
  {
    id: 'categories',
    title: 'Browse Categories',
    description: 'Show all learning topics',
    icon: 'apps-outline',
    color: '#10b981',
    command: '/categories',
    category: 'learning'
  },
  {
    id: 'green-tech',
    title: 'Green Technology',
    description: 'Show sustainable tech modules',
    icon: 'leaf-outline',
    color: '#059669',
    command: '/modules green',
    category: 'learning'
  },
  {
    id: 'digital-skills',
    title: 'Digital Skills',
    description: 'Show technology & digital literacy',
    icon: 'phone-portrait-outline',
    color: '#7c3aed',
    command: '/modules digital',
    category: 'learning'
  },
  
  // Progress Actions
  {
    id: 'my-progress',
    title: 'My Progress',
    description: 'Show your learning journey',
    icon: 'trending-up-outline',
    color: '#06b6d4',
    command: '/progress',
    category: 'progress'
  },
  {
    id: 'achievements',
    title: 'Achievements',
    description: 'Show what you\'ve accomplished',
    icon: 'trophy-outline',
    color: '#f59e0b',
    command: '/progress achievements',
    category: 'progress'
  },
  
  // Search Actions
  {
    id: 'search-modules',
    title: 'Search Modules',
    description: 'Find specific content',
    icon: 'search-outline',
    color: '#8b5cf6',
    command: 'search',
    category: 'search'
  },
  
  // Help Actions
  {
    id: 'help',
    title: 'Help & Tips',
    description: 'Learn how to use the platform',
    icon: 'help-circle-outline',
    color: '#6b7280',
    command: '/help',
    category: 'help'
  }
];

const CATEGORIES = [
  { id: 'learning', name: 'Learning', icon: 'school-outline', color: '#3b82f6' },
  { id: 'progress', name: 'Progress', icon: 'trending-up-outline', color: '#06b6d4' },
  { id: 'search', name: 'Search', icon: 'search-outline', color: '#8b5cf6' },
  { id: 'help', name: 'Help', icon: 'help-circle-outline', color: '#6b7280' },
];

export default function QuickActionsMenu({ 
  visible, 
  onClose, 
  onActionSelect, 
  darkMode = false 
}: QuickActionsMenuProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('learning');
  const [searchQuery, setSearchQuery] = useState('');
  const colorScheme = useColorScheme();
  const isDark = darkMode || colorScheme === 'dark';

  const handleActionPress = (action: QuickAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (action.id === 'search-modules') {
      // For search, we'll show a simple prompt
      onActionSelect('What would you like to search for?');
    } else {
      onActionSelect(action.command);
    }
    onClose();
  };

  const handleCategoryPress = (categoryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(categoryId);
  };

  const filteredActions = QUICK_ACTIONS.filter(action => 
    action.category === selectedCategory
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, isDark && styles.containerDark]}>
        {/* Header */}
        <View style={[styles.header, isDark && styles.headerDark]}>
          <View style={styles.headerContent}>
            <Text style={[styles.title, isDark && styles.titleDark]}>
              Quick Actions
            </Text>
            <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
              Choose what you'd like to do
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.closeButton, isDark && styles.closeButtonDark]}
            onPress={onClose}
          >
            <Ionicons 
              name="close" 
              size={24} 
              color={isDark ? '#9ca3af' : '#6b7280'} 
            />
          </TouchableOpacity>
        </View>

        {/* Category Tabs */}
        <View style={styles.categoriesContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContent}
          >
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryTab,
                  isDark && styles.categoryTabDark,
                  selectedCategory === category.id && styles.categoryTabActive,
                  selectedCategory === category.id && { borderColor: category.color }
                ]}
                onPress={() => handleCategoryPress(category.id)}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={category.icon as any} 
                  size={20} 
                  color={selectedCategory === category.id ? category.color : (isDark ? '#9ca3af' : '#6b7280')} 
                />
                <Text style={[
                  styles.categoryTabText,
                  isDark && styles.categoryTabTextDark,
                  selectedCategory === category.id && { color: category.color }
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Actions Grid */}
        <ScrollView 
          style={styles.actionsContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.actionsGrid}>
            {filteredActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.actionCard, isDark && styles.actionCardDark]}
                onPress={() => handleActionPress(action)}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${action.color}15` }]}>
                  <Ionicons 
                    name={action.icon as any} 
                    size={28} 
                    color={action.color} 
                  />
                </View>
                <Text style={[styles.actionTitle, isDark && styles.actionTitleDark]}>
                  {action.title}
                </Text>
                <Text style={[styles.actionDescription, isDark && styles.actionDescriptionDark]}>
                  {action.description}
                </Text>
                
                {/* Action indicator */}
                <View style={styles.actionIndicator}>
                  <Ionicons 
                    name="arrow-forward" 
                    size={16} 
                    color={isDark ? '#6b7280' : '#9ca3af'} 
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>

        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  headerDark: {
    backgroundColor: '#1f2937',
    borderBottomColor: '#374151',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  titleDark: {
    color: '#f9fafb',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  subtitleDark: {
    color: '#9ca3af',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonDark: {
    backgroundColor: '#374151',
  },
  categoriesContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  categoriesContainerDark: {
    backgroundColor: '#1f2937',
    borderBottomColor: '#374151',
  },
  categoriesContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    gap: 8,
  },
  categoryTabDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  categoryTabActive: {
    borderWidth: 2,
    backgroundColor: '#f8fafc',
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  categoryTabTextDark: {
    color: '#9ca3af',
  },
  actionsContainer: {
    flex: 1,
    paddingTop: 20,
  },
  actionsGrid: {
    paddingHorizontal: 20,
    gap: 16,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionCardDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  actionTitleDark: {
    color: '#f9fafb',
  },
  actionDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6b7280',
    marginBottom: 12,
  },
  actionDescriptionDark: {
    color: '#9ca3af',
  },
  actionIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
