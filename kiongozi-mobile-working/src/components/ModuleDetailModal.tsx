/**
 * ModuleDetailModal Component
 * Beautiful full-screen modal for viewing module details
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  useColorScheme,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import MarkdownRenderer from './MarkdownRenderer';
import { LearningModule } from '../types/lms';
import apiClient from '../utils/apiClient';

const { width, height } = Dimensions.get('window');

interface ModuleDetailModalProps {
  visible: boolean;
  module: LearningModule | null;
  onClose: () => void;
  darkMode?: boolean;
  onStartLearning?: (module: LearningModule) => void;
  onBookmark?: (module: LearningModule, bookmarked: boolean) => void;
}

export default function ModuleDetailModal({
  visible,
  module,
  onClose,
  darkMode = false,
  onStartLearning,
  onBookmark,
}: ModuleDetailModalProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = darkMode || colorScheme === 'dark';

  if (!module) return null;

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return '#10b981';
      case 'intermediate':
        return '#f59e0b';
      case 'advanced':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getDifficultyIcon = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'leaf-outline';
      case 'intermediate':
        return 'flash-outline';
      case 'advanced':
        return 'rocket-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 
      ? `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minutes`
      : `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  const handleStartLearning = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onStartLearning?.(module);
    onClose();
  };

  const handleBookmark = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      setLoading(true);
      const newBookmarkState = !isBookmarked;
      
      // Update local state immediately for better UX
      setIsBookmarked(newBookmarkState);
      
      // Call API to update bookmark
      await apiClient.bookmarkModule(module.id, newBookmarkState);
      
      // Notify parent component
      onBookmark?.(module, newBookmarkState);
      
    } catch (error) {
      // Revert state on error
      setIsBookmarked(!isBookmarked);
      Alert.alert(
        'Error',
        'Failed to update bookmark. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Implement sharing functionality
    Alert.alert(
      'Share Module',
      'Sharing functionality coming soon!',
      [{ text: 'OK' }]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
        {/* Header */}
        <View style={[styles.header, isDark && styles.headerDark]}>
          <TouchableOpacity
            style={[styles.headerButton, isDark && styles.headerButtonDark]}
            onPress={onClose}
          >
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color={isDark ? '#f9fafb' : '#111827'} 
            />
          </TouchableOpacity>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerButton, isDark && styles.headerButtonDark]}
              onPress={handleShare}
            >
              <Ionicons 
                name="share-outline" 
                size={24} 
                color={isDark ? '#f9fafb' : '#111827'} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.headerButton, isDark && styles.headerButtonDark]}
              onPress={handleBookmark}
              disabled={loading}
            >
              <Ionicons 
                name={isBookmarked ? 'bookmark' : 'bookmark-outline'} 
                size={24} 
                color={isBookmarked ? '#fbbf24' : (isDark ? '#f9fafb' : '#111827')} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Hero Section */}
          <View style={styles.hero}>
            {/* Category & Difficulty */}
            <View style={styles.metaRow}>
              <View style={[styles.categoryBadge, { backgroundColor: `${getDifficultyColor(module.difficulty_level)}15` }]}>
                <Ionicons 
                  name={getDifficultyIcon(module.difficulty_level) as any} 
                  size={16} 
                  color={getDifficultyColor(module.difficulty_level)} 
                />
                <Text style={[styles.categoryText, { color: getDifficultyColor(module.difficulty_level) }]}>
                  {module.category?.name || 'General'}
                </Text>
              </View>
              
              <View style={styles.difficultyBadge}>
                <Text style={[styles.difficultyText, { color: getDifficultyColor(module.difficulty_level) }]}>
                  {module.difficulty_level.charAt(0).toUpperCase() + module.difficulty_level.slice(1)}
                </Text>
              </View>
            </View>

            {/* Featured Badge */}
            {module.featured && (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={16} color="#fbbf24" />
                <Text style={styles.featuredText}>Featured</Text>
              </View>
            )}

            {/* Title */}
            <Text style={[styles.title, isDark && styles.titleDark]}>
              {module.title}
            </Text>

            {/* Description */}
            <Text style={[styles.description, isDark && styles.descriptionDark]}>
              {module.description}
            </Text>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons 
                  name="time-outline" 
                  size={18} 
                  color={isDark ? '#9ca3af' : '#6b7280'} 
                />
                <Text style={[styles.statText, isDark && styles.statTextDark]}>
                  {formatDuration(module.estimated_duration_minutes)}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Ionicons 
                  name="eye-outline" 
                  size={18} 
                  color={isDark ? '#9ca3af' : '#6b7280'} 
                />
                <Text style={[styles.statText, isDark && styles.statTextDark]}>
                  {module.view_count} views
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Ionicons 
                  name="calendar-outline" 
                  size={18} 
                  color={isDark ? '#9ca3af' : '#6b7280'} 
                />
                <Text style={[styles.statText, isDark && styles.statTextDark]}>
                  {new Date(module.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>

          {/* Learning Objectives */}
          {module.learning_objectives && module.learning_objectives.length > 0 && (
            <View style={[styles.section, isDark && styles.sectionDark]}>
              <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
                What You'll Learn
              </Text>
              {module.learning_objectives.map((objective, index) => (
                <View key={index} style={styles.objectiveItem}>
                  <Ionicons 
                    name="checkmark-circle-outline" 
                    size={20} 
                    color="#10b981" 
                  />
                  <Text style={[styles.objectiveText, isDark && styles.objectiveTextDark]}>
                    {objective}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Keywords */}
          {module.keywords && module.keywords.length > 0 && (
            <View style={[styles.section, isDark && styles.sectionDark]}>
              <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
                Topics Covered
              </Text>
              <View style={styles.keywordsContainer}>
                {module.keywords.map((keyword, index) => (
                  <View key={index} style={[styles.keywordChip, isDark && styles.keywordChipDark]}>
                    <Text style={[styles.keywordText, isDark && styles.keywordTextDark]}>
                      {keyword}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Module Content Preview */}
          <View style={[styles.section, isDark && styles.sectionDark]}>
            <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
              Content Preview
            </Text>
            <View style={[styles.contentPreview, isDark && styles.contentPreviewDark]}>
              <MarkdownRenderer
                content={module.content.length > 500 
                  ? module.content.substring(0, 500) + "..." 
                  : module.content}
                darkMode={isDark}
                enableCopy={false}
              />
              {module.content.length > 500 && (
                <Text style={[styles.previewNote, isDark && styles.previewNoteDark]}>
                  This is a preview. Start learning to see the full content.
                </Text>
              )}
            </View>
          </View>

          {/* Bottom Padding */}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Bottom Action Bar */}
        <View style={[styles.bottomBar, isDark && styles.bottomBarDark]}>
          <View style={styles.bottomContent}>
            <View style={styles.priceInfo}>
              <Text style={[styles.priceText, isDark && styles.priceTextDark]}>
                Free
              </Text>
              <Text style={[styles.priceSubtext, isDark && styles.priceSubtextDark]}>
                Full access included
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStartLearning}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={20} color="#ffffff" />
              <Text style={styles.startButtonText}>
                Start Learning
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerDark: {
    backgroundColor: '#1f2937',
    borderBottomColor: '#374151',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonDark: {
    backgroundColor: '#374151',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  content: {
    flex: 1,
  },
  hero: {
    padding: 24,
    backgroundColor: '#ffffff',
  },
  heroDark: {
    backgroundColor: '#1f2937',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    flex: 1,
    marginRight: 12,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    marginBottom: 16,
  },
  featuredText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fbbf24',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
    lineHeight: 36,
  },
  titleDark: {
    color: '#f9fafb',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#6b7280',
    marginBottom: 24,
  },
  descriptionDark: {
    color: '#d1d5db',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#6b7280',
  },
  statTextDark: {
    color: '#9ca3af',
  },
  section: {
    backgroundColor: '#ffffff',
    marginTop: 12,
    padding: 24,
  },
  sectionDark: {
    backgroundColor: '#1f2937',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  sectionTitleDark: {
    color: '#f9fafb',
  },
  objectiveItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  objectiveText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
    flex: 1,
  },
  objectiveTextDark: {
    color: '#d1d5db',
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordChip: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  keywordChipDark: {
    backgroundColor: '#374151',
  },
  keywordText: {
    fontSize: 14,
    color: '#6b7280',
  },
  keywordTextDark: {
    color: '#d1d5db',
  },
  contentPreview: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  contentPreviewDark: {
    backgroundColor: '#111827',
    borderColor: '#374151',
  },
  previewNote: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
  },
  previewNoteDark: {
    color: '#6b7280',
  },
  bottomBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  bottomBarDark: {
    backgroundColor: '#1f2937',
    borderTopColor: '#374151',
  },
  bottomContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceInfo: {
    flex: 1,
  },
  priceText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 2,
  },
  priceTextDark: {
    color: '#10b981',
  },
  priceSubtext: {
    fontSize: 14,
    color: '#6b7280',
  },
  priceSubtextDark: {
    color: '#9ca3af',
  },
  startButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});

