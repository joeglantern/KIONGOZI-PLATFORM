// Chat command processing utilities

import apiClient from './apiClient';
import type { ChatCommand, ModuleSearchResult } from '../types/lms-chat';
import type { LearningModule } from '../types/lms';

export const CHAT_COMMANDS = {
  SEARCH: '/search',
  PROGRESS: '/progress',
  RECOMMEND: '/recommend',
  BOOKMARK: '/bookmark',
  BOOKMARKS: '/bookmarks',
  COMPLETE: '/complete',
  BROWSE: '/browse',
  PROFILE: '/profile',
  HELP: '/help'
} as const;

// Check if a message is a command
export function isCommand(message: string): boolean {
  return message.trim().startsWith('/');
}

// Parse command and parameters
export function parseCommand(message: string): { command: string; params: string[] } {
  const trimmed = message.trim();
  const parts = trimmed.split(' ');
  const command = parts[0].toLowerCase();
  const params = parts.slice(1);

  return { command, params };
}

// Process search command
export async function handleSearchCommand(params: string[]): Promise<{
  type: 'search_results';
  query: string;
  results: ModuleSearchResult[];
}> {
  const query = params.join(' ');

  if (!query) {
    throw new Error('Please provide a search term. Example: /search digital transformation');
  }

  try {
    const response = await apiClient.searchModules(query);

    if (!response.success || !response.data) {
      throw new Error('Search failed. Please try again.');
    }

    // Transform API response to search results
    const results: ModuleSearchResult[] = response.data.modules.map((module: LearningModule) => ({
      module,
      relevanceScore: calculateRelevanceScore(module, query),
      matchedKeywords: findMatchedKeywords(module, query),
      snippet: generateSnippet(module, query)
    }));

    // Sort by relevance
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return {
      type: 'search_results',
      query,
      results: results.slice(0, 10) // Limit to top 10 results
    };
  } catch (error) {
    console.error('Search command error:', error);
    throw new Error('Failed to search modules. Please try again.');
  }
}

// Process progress command
export async function handleProgressCommand(): Promise<{
  type: 'progress_summary';
  data: any;
}> {
  try {
    const [statsResponse, progressResponse] = await Promise.all([
      apiClient.getLearningStats(),
      apiClient.getUserProgress()
    ]);

    return {
      type: 'progress_summary',
      data: {
        stats: statsResponse.data,
        progress: progressResponse.data
      }
    };
  } catch (error) {
    console.error('Progress command error:', error);
    throw new Error('Failed to fetch progress data. Please try again.');
  }
}

// Process recommend command
export async function handleRecommendCommand(): Promise<{
  type: 'recommendations';
  data: any;
}> {
  try {
    const response = await apiClient.getModuleRecommendations();

    if (!response.success || !response.data) {
      throw new Error('No recommendations available at the moment.');
    }

    return {
      type: 'recommendations',
      data: response.data
    };
  } catch (error) {
    console.error('Recommend command error:', error);
    throw new Error('Failed to get recommendations. Please try again.');
  }
}

// Process bookmark command
export async function handleBookmarkCommand(params: string[]): Promise<{
  type: 'bookmark_action';
  success: boolean;
  module?: LearningModule;
  message: string;
  isBookmarked: boolean;
}> {
  const moduleTitle = params.join(' ');

  if (!moduleTitle) {
    throw new Error('Please provide a module title. Example: /bookmark Digital Skills Basics');
  }

  try {
    // First, search for the module to get its ID
    const searchResponse = await apiClient.searchModules(moduleTitle);

    if (!searchResponse.success || !searchResponse.data?.modules.length) {
      throw new Error(`Module "${moduleTitle}" not found. Try /search to find the exact module name.`);
    }

    // Find the best match (first result is typically most relevant)
    const module = searchResponse.data.modules[0];

    // Add bookmark
    const bookmarkResponse = await apiClient.toggleModuleBookmark(module.id, true);

    if (!bookmarkResponse.success) {
      throw new Error('Failed to bookmark module. Please try again.');
    }

    return {
      type: 'bookmark_action',
      success: true,
      module,
      message: `"${module.title}" has been added to your bookmarks! 🔖`,
      isBookmarked: true
    };
  } catch (error) {
    console.error('Bookmark command error:', error);
    throw error;
  }
}

// Process bookmarks list command
export async function handleBookmarksCommand(): Promise<{
  type: 'bookmarks_list';
  bookmarks: LearningModule[];
  message: string;
}> {
  try {
    const progressResponse = await apiClient.getUserProgress();

    if (!progressResponse.success || !progressResponse.data) {
      throw new Error('Failed to fetch your bookmarks');
    }

    // Filter for bookmarked modules
    const bookmarkedProgress = progressResponse.data.filter(
      (progress: any) => progress.status === 'bookmarked'
    );

    // Get full module details for bookmarked items
    const bookmarkedModules: LearningModule[] = [];
    for (const progress of bookmarkedProgress) {
      try {
        const moduleResponse = await apiClient.getLearningModule(progress.module_id);
        if (moduleResponse.success && moduleResponse.data) {
          bookmarkedModules.push(moduleResponse.data);
        }
      } catch (err) {
        console.warn('Failed to fetch bookmarked module:', progress.module_id);
      }
    }

    const message = bookmarkedModules.length > 0
      ? `You have ${bookmarkedModules.length} bookmarked module${bookmarkedModules.length !== 1 ? 's' : ''}`
      : 'You haven\'t bookmarked any modules yet. Use /bookmark [module name] to save modules for later!';

    return {
      type: 'bookmarks_list',
      bookmarks: bookmarkedModules,
      message
    };
  } catch (error) {
    console.error('Bookmarks command error:', error);
    throw error;
  }
}

// Process profile command
export async function handleProfileCommand(): Promise<{
  type: 'user_profile';
  profile: any;
  stats: any;
}> {
  try {
    const [profileResponse, statsResponse] = await Promise.all([
      apiClient.getCurrentUser(),
      apiClient.getUserStats()
    ]);

    return {
      type: 'user_profile',
      profile: profileResponse.success ? profileResponse.data : null,
      stats: statsResponse.success ? statsResponse.data : null
    };
  } catch (error) {
    console.error('Profile command error:', error);
    throw new Error('Failed to fetch profile information. Please try again.');
  }
}

// Process browse command
export async function handleBrowseCommand(params: string[]): Promise<{
  type: 'category_browse';
  category?: string;
  modules: LearningModule[];
  categoryName: string;
}> {
  const categoryName = params.join(' ');

  try {
    // If no category specified, get all categories
    if (!categoryName) {
      const categoriesResponse = await apiClient.getModuleCategories();
      if (!categoriesResponse.success || !categoriesResponse.data) {
        throw new Error('Failed to fetch categories');
      }

      return {
        type: 'category_browse',
        modules: [],
        categoryName: 'All Categories',
        category: undefined
      };
    }

    // First, get all categories to find matching category
    const categoriesResponse = await apiClient.getModuleCategories();
    if (!categoriesResponse.success || !categoriesResponse.data) {
      throw new Error('Failed to fetch categories');
    }

    // Find category by name (case insensitive)
    const category = categoriesResponse.data.find(cat =>
      cat.name.toLowerCase().includes(categoryName.toLowerCase()) ||
      categoryName.toLowerCase().includes(cat.name.toLowerCase())
    );

    if (!category) {
      throw new Error(`Category "${categoryName}" not found. Try /browse to see all categories.`);
    }

    // Get modules for this category
    const modulesResponse = await apiClient.getModulesByCategory(category.id);
    if (!modulesResponse.success || !modulesResponse.data) {
      throw new Error('Failed to fetch modules for this category');
    }

    return {
      type: 'category_browse',
      category: category.id,
      modules: modulesResponse.data.modules || [],
      categoryName: category.name
    };
  } catch (error) {
    console.error('Browse command error:', error);
    throw error;
  }
}

// Process complete command
export async function handleCompleteCommand(params: string[]): Promise<{
  type: 'module_completion';
  success: boolean;
  module?: LearningModule;
  message: string;
}> {
  const moduleTitle = params.join(' ');

  if (!moduleTitle) {
    throw new Error('Please provide a module title. Example: /complete Digital Skills Basics');
  }

  try {
    // First, search for the module to get its ID
    const searchResponse = await apiClient.searchModules(moduleTitle);

    if (!searchResponse.success || !searchResponse.data?.modules.length) {
      throw new Error(`Module "${moduleTitle}" not found. Try /search to find the exact module name.`);
    }

    // Find the best match (first result is typically most relevant)
    const module = searchResponse.data.modules[0];

    // Mark module as complete
    const completeResponse = await apiClient.completeModule(module.id);

    if (!completeResponse.success) {
      throw new Error('Failed to mark module as complete. Please try again.');
    }

    return {
      type: 'module_completion',
      success: true,
      module,
      message: `Congratulations! You've completed "${module.title}". Great job! 🎉`
    };
  } catch (error) {
    console.error('Complete command error:', error);
    throw error;
  }
}

// Process help command
export function handleHelpCommand(): {
  type: 'help';
  commands: Array<{ command: string; description: string; example: string }>;
} {
  return {
    type: 'help',
    commands: [
      {
        command: '/search [term]',
        description: 'Search for learning modules',
        example: '/search digital transformation'
      },
      {
        command: '/progress',
        description: 'Show your learning progress',
        example: '/progress'
      },
      {
        command: '/complete [module]',
        description: 'Mark a module as complete',
        example: '/complete Digital Skills Basics'
      },
      {
        command: '/browse [category]',
        description: 'Browse modules by category',
        example: '/browse Digital Skills'
      },
      {
        command: '/bookmark [module]',
        description: 'Bookmark a module for later',
        example: '/bookmark Digital Skills Basics'
      },
      {
        command: '/bookmarks',
        description: 'Show your bookmarked modules',
        example: '/bookmarks'
      },
      {
        command: '/profile',
        description: 'Show your profile and stats',
        example: '/profile'
      },
      {
        command: '/recommend',
        description: 'Get personalized module recommendations',
        example: '/recommend'
      },
      {
        command: '/help',
        description: 'Show available commands',
        example: '/help'
      }
    ]
  };
}

// Main command processor
export async function processCommand(message: string): Promise<any> {
  const { command, params } = parseCommand(message);

  switch (command) {
    case CHAT_COMMANDS.SEARCH:
      return await handleSearchCommand(params);

    case CHAT_COMMANDS.PROGRESS:
      return await handleProgressCommand();

    case CHAT_COMMANDS.RECOMMEND:
      return await handleRecommendCommand();

    case CHAT_COMMANDS.COMPLETE:
      return await handleCompleteCommand(params);

    case CHAT_COMMANDS.BROWSE:
      return await handleBrowseCommand(params);

    case CHAT_COMMANDS.BOOKMARK:
      return await handleBookmarkCommand(params);

    case CHAT_COMMANDS.BOOKMARKS:
      return await handleBookmarksCommand();

    case CHAT_COMMANDS.PROFILE:
      return await handleProfileCommand();

    case CHAT_COMMANDS.HELP:
      return handleHelpCommand();

    default:
      throw new Error(`Unknown command: ${command}. Type /help to see available commands.`);
  }
}

// Helper functions
function calculateRelevanceScore(module: LearningModule, query: string): number {
  const queryLower = query.toLowerCase();
  let score = 0;

  // Title match (highest weight)
  if (module.title.toLowerCase().includes(queryLower)) {
    score += 0.5;
  }

  // Description match
  if (module.description.toLowerCase().includes(queryLower)) {
    score += 0.3;
  }

  // Keywords match
  if (module.keywords) {
    const matchingKeywords = module.keywords.filter(keyword =>
      keyword.toLowerCase().includes(queryLower) || queryLower.includes(keyword.toLowerCase())
    );
    score += matchingKeywords.length * 0.1;
  }

  // Category match
  if (module.category?.name.toLowerCase().includes(queryLower)) {
    score += 0.2;
  }

  return Math.min(score, 1); // Cap at 1.0
}

function findMatchedKeywords(module: LearningModule, query: string): string[] {
  if (!module.keywords) return [];

  const queryLower = query.toLowerCase();
  return module.keywords.filter(keyword =>
    keyword.toLowerCase().includes(queryLower) || queryLower.includes(keyword.toLowerCase())
  );
}

function generateSnippet(module: LearningModule, query: string): string {
  const description = module.description;
  const queryLower = query.toLowerCase();
  const descriptionLower = description.toLowerCase();

  const index = descriptionLower.indexOf(queryLower);
  if (index === -1) {
    return description.substring(0, 150) + (description.length > 150 ? '...' : '');
  }

  const start = Math.max(0, index - 50);
  const end = Math.min(description.length, index + query.length + 50);

  return (start > 0 ? '...' : '') +
         description.substring(start, end) +
         (end < description.length ? '...' : '');
}