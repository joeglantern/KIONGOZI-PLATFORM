/**
 * ModuleCard Component
 * Displays learning modules in chat responses with beautiful design
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LearningModule } from '../types/lms';

interface ModuleCardProps {
  module: LearningModule;
  onPress: (module: LearningModule) => void;
  compact?: boolean; // For smaller cards in chat
}

export default function ModuleCard({ module, onPress, compact = false }: ModuleCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(module);
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return '#10b981'; // Green
      case 'intermediate':
        return '#f59e0b'; // Amber
      case 'advanced':
        return '#ef4444'; // Red
      default:
        return '#6b7280'; // Gray
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
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  return (
    <TouchableOpacity
      style={[
        compact ? styles.compactCard : styles.card,
        isDark && styles.cardDark,
        module.featured && styles.featuredCard,
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* Featured Badge */}
      {module.featured && (
        <View style={styles.featuredBadge}>
          <Ionicons name="star" size={12} color="#fbbf24" />
          <Text style={styles.featuredText}>Featured</Text>
        </View>
      )}

      {/* Category & Difficulty */}
      <View style={styles.header}>
        <View style={[styles.categoryBadge, { backgroundColor: `${getDifficultyColor(module.difficulty_level)}15` }]}>
          <Ionicons 
            name={getDifficultyIcon(module.difficulty_level) as any} 
            size={14} 
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

      {/* Title */}
      <Text 
        style={[styles.title, isDark && styles.titleDark]} 
        numberOfLines={compact ? 2 : 3}
      >
        {module.title}
      </Text>

      {/* Description */}
      <Text 
        style={[styles.description, isDark && styles.descriptionDark]} 
        numberOfLines={compact ? 2 : 3}
      >
        {module.description}
      </Text>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.metaInfo}>
          <View style={styles.metaItem}>
            <Ionicons 
              name="time-outline" 
              size={14} 
              color={isDark ? '#9ca3af' : '#6b7280'} 
            />
            <Text style={[styles.metaText, isDark && styles.metaTextDark]}>
              {formatDuration(module.estimated_duration_minutes)}
            </Text>
          </View>
          
          <View style={styles.metaItem}>
            <Ionicons 
              name="eye-outline" 
              size={14} 
              color={isDark ? '#9ca3af' : '#6b7280'} 
            />
            <Text style={[styles.metaText, isDark && styles.metaTextDark]}>
              {module.view_count} views
            </Text>
          </View>
        </View>

        <View style={styles.actionButton}>
          <Text style={styles.actionText}>Start</Text>
          <Ionicons 
            name="arrow-forward" 
            size={14} 
            color="#3b82f6" 
          />
        </View>
      </View>

      {/* Learning Objectives Preview */}
      {!compact && module.learning_objectives.length > 0 && (
        <View style={styles.objectivesPreview}>
          <Text style={[styles.objectivesTitle, isDark && styles.objectivesTitleDark]}>
            You'll learn:
          </Text>
          <Text style={[styles.objectivesText, isDark && styles.objectivesTextDark]}>
            {module.learning_objectives.slice(0, 2).join(' • ')}
            {module.learning_objectives.length > 2 && '...'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  compactCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  cardDark: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  featuredCard: {
    borderColor: '#fbbf24',
    borderWidth: 2,
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  featuredText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fbbf24',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    flex: 1,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    lineHeight: 24,
  },
  titleDark: {
    color: '#f9fafb',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6b7280',
    marginBottom: 16,
  },
  descriptionDark: {
    color: '#d1d5db',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaInfo: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  metaTextDark: {
    color: '#9ca3af',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  objectivesPreview: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  objectivesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  objectivesTitleDark: {
    color: '#d1d5db',
  },
  objectivesText: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
  objectivesTextDark: {
    color: '#9ca3af',
  },
});
