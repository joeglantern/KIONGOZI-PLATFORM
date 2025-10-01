/**
 * Enhanced CommandResponseCard Component
 * Displays structured responses from chat commands with real LMS integration
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import MarkdownRenderer from './MarkdownRenderer';
import ModuleCard from './ModuleCard';
import {
  CommandResponse,
  ModuleCommandResponse,
  ProgressCommandResponse,
  CategoryCommandResponse,
  LearningModule,
  ModuleCategory,
  LearningStats,
} from '../types/lms';

interface CommandResponseCardProps {
  response: {
    type: string;
    command: string;
    title: string;
    content: string;
    success: boolean;
    data?: CommandResponse;
  };
  darkMode?: boolean;
  onModulePress?: (module: LearningModule) => void;
  onCategoryPress?: (category: ModuleCategory) => void;
}

export default function CommandResponseCard({
  response,
  darkMode = false,
  onModulePress,
  onCategoryPress,
}: CommandResponseCardProps) {

  const handleModulePress = (module: LearningModule) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onModulePress?.(module);
  };

  const handleCategoryPress = (category: ModuleCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCategoryPress?.(category);
  };

  const renderModules = () => {
    if (!response.data || response.data.type !== 'modules') {
      return null;
    }

    const moduleData = response.data as ModuleCommandResponse;
    
    if (!moduleData.modules || moduleData.modules.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons 
            name="library-outline" 
            size={48} 
            color={darkMode ? '#6b7280' : '#9ca3af'} 
          />
          <Text style={[styles.emptyText, darkMode && styles.emptyTextDark]}>
            No modules found
          </Text>
          <Text style={[styles.emptySubtext, darkMode && styles.emptySubtextDark]}>
            Try browsing different categories or search terms
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.modulesContainer}>
        {/* Search/Filter Info */}
        {moduleData.search_query && (
          <View style={[styles.searchInfo, darkMode && styles.searchInfoDark]}>
            <Ionicons 
              name="search-outline" 
              size={16} 
              color={darkMode ? '#9ca3af' : '#6b7280'} 
            />
            <Text style={[styles.searchText, darkMode && styles.searchTextDark]}>
              Search results for "{moduleData.search_query}"
            </Text>
          </View>
        )}

        {/* Module Cards */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modulesScrollContent}
        >
          {moduleData.modules.map((module) => (
            <View key={module.id} style={styles.moduleCardWrapper}>
              <ModuleCard
                module={module}
                onPress={handleModulePress}
                compact={true}
              />
            </View>
          ))}
        </ScrollView>

        {/* Show more hint */}
        {moduleData.total_count && moduleData.total_count > moduleData.modules.length && (
          <Text style={[styles.showMoreHint, darkMode && styles.showMoreHintDark]}>
            Showing {moduleData.modules.length} of {moduleData.total_count} modules
          </Text>
        )}
      </View>
    );
  };

  const renderProgress = () => {
    if (!response.data || response.data.type !== 'progress') {
      return null;
    }

    const progressData = response.data as ProgressCommandResponse;
    const stats = progressData.stats;
    
    return (
      <View style={styles.progressContainer}>
        {/* Overall Progress */}
        <View style={styles.progressHeader}>
          <View style={[styles.progressCircle, darkMode && styles.progressCircleDark]}>
            <Text style={[styles.progressPercentage, darkMode && styles.progressPercentageDark]}>
              {Math.round(stats.completion_rate || 0)}%
            </Text>
            <Text style={[styles.progressLabel, darkMode && styles.progressLabelDark]}>
              Complete
            </Text>
          </View>

          <View style={styles.progressSummary}>
            <Text style={[styles.progressTitle, darkMode && styles.progressTitleDark]}>
              Learning Progress
            </Text>
            <Text style={[styles.progressSubtitle, darkMode && styles.progressSubtitleDark]}>
              {stats.completed_modules} of {stats.total_modules} modules completed
            </Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, darkMode && styles.statCardDark]}>
            <Text style={[styles.statNumber, darkMode && styles.statNumberDark]}>
              {stats.in_progress_modules}
            </Text>
            <Text style={[styles.statLabel, darkMode && styles.statLabelDark]}>
              In Progress
            </Text>
          </View>

          <View style={[styles.statCard, darkMode && styles.statCardDark]}>
            <Text style={[styles.statNumber, darkMode && styles.statNumberDark]}>
              {stats.current_streak_days}
            </Text>
            <Text style={[styles.statLabel, darkMode && styles.statLabelDark]}>
              Day Streak
            </Text>
          </View>

          <View style={[styles.statCard, darkMode && styles.statCardDark]}>
            <Text style={[styles.statNumber, darkMode && styles.statNumberDark]}>
              {Math.round((stats.total_time_spent_minutes || 0) / 60)}h
            </Text>
            <Text style={[styles.statLabel, darkMode && styles.statLabelDark]}>
              Time Spent
            </Text>
          </View>
        </View>

        {/* Recent Activity */}
        {progressData.recent_modules && progressData.recent_modules.length > 0 && (
          <View style={styles.recentActivity}>
            <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark]}>
              Recent Activity
            </Text>
            {progressData.recent_modules.slice(0, 3).map((progress) => (
              <View key={progress.id} style={[styles.activityItem, darkMode && styles.activityItemDark]}>
                <View style={styles.activityIcon}>
                  <Ionicons
                    name={progress.status === 'completed' ? 'checkmark-circle' : 'play-circle-outline'}
                    size={20}
                    color={progress.status === 'completed' ? '#22c55e' : '#3b82f6'}
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={[styles.activityTitle, darkMode && styles.activityTitleDark]}>
                    {progress.module?.title || 'Module'}
                  </Text>
                  <Text style={[styles.activityStatus, darkMode && styles.activityStatusDark]}>
                    {progress.status.replace('_', ' ').charAt(0).toUpperCase() + progress.status.slice(1).replace('_', ' ')} • {progress.progress_percentage}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderCategories = () => {
    if (!response.data || response.data.type !== 'categories') {
      return null;
    }

    const categoryData = response.data as CategoryCommandResponse;
    
    return (
      <View style={styles.categoriesContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScrollContent}
        >
          {categoryData.categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryCard, darkMode && styles.categoryCardDark]}
              onPress={() => handleCategoryPress(category)}
              activeOpacity={0.8}
            >
              <View style={[styles.categoryIcon, { backgroundColor: `${category.color}15` }]}>
                <Ionicons 
                  name={category.icon as any} 
                  size={24} 
                  color={category.color} 
                />
              </View>
              <Text style={[styles.categoryName, darkMode && styles.categoryNameDark]}>
                {category.name}
              </Text>
              <Text style={[styles.categoryDescription, darkMode && styles.categoryDescriptionDark]} numberOfLines={2}>
                {category.description}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={[styles.container, darkMode && styles.containerDark]}>
      {/* Header */}
      <View style={[styles.header, darkMode && styles.headerDark]}>
        <View style={styles.headerLeft}>
          <View style={[
            styles.commandIcon,
            response.success ? styles.commandIconSuccess : styles.commandIconError
          ]}>
            <Ionicons
              name={response.success ? 'terminal-outline' : 'alert-circle-outline'}
              size={16}
              color={response.success ? '#22c55e' : '#ef4444'}
            />
          </View>
          <Text style={[styles.commandTitle, darkMode && styles.commandTitleDark]}>
            {response.title}
          </Text>
        </View>
        <Text style={[styles.commandBadge, darkMode && styles.commandBadgeDark]}>
          /{response.command}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Render structured responses */}
        {renderModules()}
        {renderProgress()}
        {renderCategories()}
        
        {/* Fallback to markdown content for help and error commands */}
        {(!response.data || response.command === 'help') && (
          <MarkdownRenderer
            content={response.content}
            darkMode={darkMode}
            enableCopy={false}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    marginVertical: 4,
  },
  containerDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerDark: {
    backgroundColor: '#374151',
    borderBottomColor: '#4b5563',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commandIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commandIconSuccess: {
    backgroundColor: '#dcfce7',
  },
  commandIconError: {
    backgroundColor: '#fef2f2',
  },
  commandTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  commandTitleDark: {
    color: '#f9fafb',
  },
  commandBadge: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontFamily: 'Courier',
  },
  commandBadgeDark: {
    color: '#9ca3af',
    backgroundColor: '#4b5563',
  },
  content: {
    padding: 16,
  },
  // Modules Styles
  modulesContainer: {
    gap: 16,
  },
  searchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchInfoDark: {
    backgroundColor: '#4b5563',
  },
  searchText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  searchTextDark: {
    color: '#9ca3af',
  },
  modulesScrollContent: {
    paddingHorizontal: 4,
    gap: 12,
  },
  moduleCardWrapper: {
    width: 280,
  },
  showMoreHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  showMoreHintDark: {
    color: '#9ca3af',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  emptyTextDark: {
    color: '#9ca3af',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  emptySubtextDark: {
    color: '#6b7280',
  },
  // Progress Styles
  progressContainer: {
    gap: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  progressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#3b82f6',
  },
  progressCircleDark: {
    backgroundColor: '#4b5563',
    borderColor: '#60a5fa',
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  progressPercentageDark: {
    color: '#f9fafb',
  },
  progressLabel: {
    fontSize: 10,
    color: '#6b7280',
  },
  progressLabelDark: {
    color: '#9ca3af',
  },
  progressSummary: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  progressTitleDark: {
    color: '#f9fafb',
  },
  progressSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressSubtitleDark: {
    color: '#9ca3af',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statCardDark: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statNumberDark: {
    color: '#f9fafb',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
  statLabelDark: {
    color: '#9ca3af',
  },
  // Recent Activity
  recentActivity: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sectionTitleDark: {
    color: '#f9fafb',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  activityItemDark: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  activityTitleDark: {
    color: '#f9fafb',
  },
  activityStatus: {
    fontSize: 12,
    color: '#6b7280',
  },
  activityStatusDark: {
    color: '#9ca3af',
  },
  // Categories Styles
  categoriesContainer: {
    gap: 16,
  },
  categoriesScrollContent: {
    paddingHorizontal: 4,
    gap: 12,
  },
  categoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    width: 140,
    gap: 8,
  },
  categoryCardDark: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  categoryNameDark: {
    color: '#f9fafb',
  },
  categoryDescription: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  categoryDescriptionDark: {
    color: '#9ca3af',
  },
});