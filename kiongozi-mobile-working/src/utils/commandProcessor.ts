/**
 * Enhanced Command Processor with Real LMS Integration
 * Handles special commands like /modules, /progress, /help with live API data
 */
import { parseCommand } from './messageProcessor';
import apiClient from './apiClient';
import {
  CommandResponse,
  ModuleCommandResponse,
  ProgressCommandResponse,
  CategoryCommandResponse,
  LearningModule,
  ModuleCategory,
  LearningStats,
  LearningStatsApiResponse,
  UserProgress,
  CourseEnrollment
} from '../types/lms';

// Updated interface that matches our LMS types
export interface EnhancedCommandResponse {
  type: 'command_response';
  command: string;
  title: string;
  content: string;
  success: boolean;
  data?: CommandResponse; // Now contains structured LMS data
}

/**
 * Process chat commands and return appropriate responses with real LMS data
 */
export async function processCommand(text: string): Promise<EnhancedCommandResponse> {
  const command = parseCommand(text);
  
  if (!command) {
    return {
      type: 'command_response',
      command: text,
      title: 'Unknown Command',
      content: 'Sorry, I don\'t recognize that command. Try `/modules` to see learning modules or `/progress` to check your progress.',
      success: false
    };
  }

  const { command: cmd, args } = command;

  try {
    switch (cmd.toLowerCase()) {
      case 'modules':
      case 'learn':
        return await handleModulesCommand(args);
      
      case 'progress':
      case 'stats':
        return await handleProgressCommand(args);
      
      case 'categories':
      case 'cats':
        return await handleCategoriesCommand();
      
      case 'search':
        return await handleSearchCommand(args);
      
      case 'courses':
      case 'course':
        return await handleCoursesCommand(args);
      
      case 'enroll':
        return await handleEnrollCommand(args);
      
      case 'my-courses':
      case 'enrollments':
        return await handleMyCoursesCommand(args);
      
      case 'drop':
      case 'unenroll':
        return await handleDropCommand(args);
      
      case 'help':
        return handleHelpCommand();
      
      default:
        return {
          type: 'command_response',
          command: cmd,
          title: 'Unknown Command',
          content: `Unknown command: "${cmd}". Available commands:\n\n• \`/modules\` - View learning modules\n• \`/courses\` - View learning courses\n• \`/progress\` - Check your progress\n• \`/categories\` - Browse categories\n• \`/search [query]\` - Search modules\n• \`/enroll [course]\` - Enroll in a course\n• \`/my-courses\` - View your enrollments\n• \`/help\` - Show help`,
          success: false
        };
    }
  } catch (error: any) {
    console.error('Command processing error:', error);
    return {
      type: 'command_response',
      command: cmd,
      title: 'Error',
      content: `Sorry, there was an error processing the command "${cmd}". Please try again later.`,
      success: false
    };
  }
}

/**
 * Handle /modules command with real API data
 */
async function handleModulesCommand(args: string[]): Promise<EnhancedCommandResponse> {
  try {
    // Parse arguments for filtering
    const filterCategory = args.length > 0 ? args.join(' ').toLowerCase() : null;
    const limit = 8; // Show max 8 modules in chat
    
    // Fetch modules from API
    const response = await apiClient.getModules({
      featured: filterCategory ? undefined : true, // Show featured if no filter
      search: filterCategory || undefined,
      limit
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch modules');
    }

    const modules: LearningModule[] = response.data.data || response.data;
    const totalCount = response.data.pagination?.total || modules.length;

    // Create structured response
    const commandResponse: ModuleCommandResponse = {
      type: 'modules',
      title: filterCategory ? `Modules: "${filterCategory}"` : 'Featured Learning Modules',
      description: filterCategory 
        ? `Found ${modules.length} modules matching "${filterCategory}"`
        : `Here are our ${modules.length} featured learning modules`,
      modules,
      total_count: totalCount,
      search_query: filterCategory || undefined
    };

    // Create human-readable content
    const content = modules.length > 0
      ? `${commandResponse.description}:\n\n${
          modules.map(module => 
            `**${module.title}**\n` +
            `📚 ${module.category?.name || 'General'} • ${capitalizeFirst(module.difficulty_level)}\n` +
            `⏱️ ${module.estimated_duration_minutes} min\n` +
            `${module.description}\n`
          ).join('\n')
        }\n💡 *Tap any module card below to learn more!*`
      : `No modules found${filterCategory ? ` for "${filterCategory}"` : ''}. Try browsing all categories or searching for different terms.`;

    return {
      type: 'command_response',
      command: 'modules',
      title: commandResponse.title,
      content,
      success: true,
      data: commandResponse
    };
  } catch (error: any) {
    console.error('Modules command error:', error);
    return {
      type: 'command_response',
      command: 'modules',
      title: 'Error Loading Modules',
      content: 'Sorry, I couldn\'t load the learning modules right now. Please check your connection and try again.',
      success: false
    };
  }
}

/**
 * Handle /progress command with real user data
 */
async function handleProgressCommand(args: string[]): Promise<EnhancedCommandResponse> {
  try {
    // Fetch user progress, stats, and enrollments in parallel
    const [statsResponse, progressResponse, allEnrollmentsResponse] = await Promise.all([
      apiClient.getLearningStats(),
      apiClient.getUserProgress({ limit: 5 }), // Recent progress
      apiClient.getUserEnrollments() // All enrollments to calculate stats
    ]);

    if (!statsResponse.success) {
      throw new Error(statsResponse.error || 'Failed to fetch learning stats');
    }

    // Handle the nested API response structure
    const apiData = statsResponse.data as LearningStatsApiResponse;

    // Get enrollment data for course-based stats
    const allEnrollments = allEnrollmentsResponse.success ?
      (allEnrollmentsResponse.data?.data || allEnrollmentsResponse.data || []) : [];

    const completedCourses = allEnrollments.filter((e: any) => e.status === 'completed');
    const inProgressCourses = allEnrollments.filter((e: any) => e.status === 'active');

    // Transform nested structure to flat LearningStats structure with real enrollment data
    const stats: LearningStats = {
      total_modules: apiData.overview.total_modules_started,
      completed_modules: apiData.overview.completed_modules,
      in_progress_modules: inProgressCourses.length, // Use real enrollment count
      bookmarked_modules: apiData.overview.bookmarked_modules,
      total_time_spent_minutes: apiData.overview.total_time_spent_minutes,
      completion_rate: apiData.overview.completion_rate,
      current_streak_days: apiData.overview.current_streak_days,
      longest_streak_days: 0, // Not in API response, keeping as 0
      recent_activity: apiData.recent_activity || [],
      favorite_categories: apiData.categories.map(cat => ({
        category: cat.category,
        modules_completed: cat.modules_completed
      }))
    };

    const recentProgress: UserProgress[] = progressResponse.success ?
      (progressResponse.data?.data || progressResponse.data || []) : [];

    // Create structured response
    const commandResponse: ProgressCommandResponse = {
      type: 'progress',
      title: 'Your Learning Progress',
      description: `You've completed ${stats.completed_modules} out of ${stats.total_modules} modules`,
      stats,
      recent_modules: recentProgress,
      completed_courses: completedCourses
    };

    // Create human-readable content
    const completionRate = Math.round(stats.completion_rate || 0);
    const hoursSpent = Math.round((stats.total_time_spent_minutes || 0) / 60 * 10) / 10;

    const content = `## Your Learning Progress 📊\n\n` +
      `**Overall Completion:** ${completionRate}% (${stats.completed_modules}/${stats.total_modules} modules)\n\n` +
      `**Time Invested:** ${hoursSpent} hours\n` +
      `**Learning Streak:** ${stats.current_streak_days || 0} days 🔥\n\n` +
      (completedCourses.length > 0 ?
        `### Completed Courses ✅\n${
          completedCourses.slice(0, 3).map(enrollment => {
            const course = enrollment.courses;
            return `• ${course?.title || 'Unknown Course'} (${enrollment.progress_percentage}%)`;
          }).join('\n')
        }${completedCourses.length > 3 ? `\n• ...and ${completedCourses.length - 3} more` : ''}\n\n` : '') +
      (recentProgress.length > 0 ?
        `### Recent Activity\n${
          recentProgress.map(progress =>
            `• ${capitalizeFirst(progress.status.replace('_', ' '))} "${progress.module?.title || 'Module'}" (${progress.progress_percentage}%)`
          ).join('\n')
        }\n\n` : '') +
      `**Quick Stats:**\n` +
      `• In Progress: ${stats.in_progress_modules} courses\n` +
      `• Bookmarked: ${stats.bookmarked_modules} modules\n\n` +
      `*Keep up the excellent work! 🚀*`;

    return {
      type: 'command_response',
      command: 'progress',
      title: commandResponse.title,
      content,
      success: true,
      data: commandResponse
    };
  } catch (error: any) {
    console.error('Progress command error:', error);
    return {
      type: 'command_response',
      command: 'progress',
      title: 'Error Loading Progress',
      content: 'Sorry, I couldn\'t load your progress right now. Please check your connection and try again.',
      success: false
    };
  }
}

/**
 * Handle /categories command
 */
async function handleCategoriesCommand(): Promise<EnhancedCommandResponse> {
  try {
    const response = await apiClient.getModuleCategories();

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch categories');
    }

    const categories: ModuleCategory[] = response.data.data || response.data;

    // Create structured response
    const commandResponse: CategoryCommandResponse = {
      type: 'categories',
      title: 'Learning Categories',
      description: `Browse ${categories.length} learning categories`,
      categories
    };

    // Create human-readable content
    const content = categories.length > 0
      ? `Here are all available learning categories:\n\n${
          categories.map(category => 
            `**${category.name}**\n` +
            `${category.description}\n`
          ).join('\n')
        }\n💡 *Use \`/modules [category]\` to see modules in a specific category!*`
      : 'No categories available at the moment. Please check back later.';

    return {
      type: 'command_response',
      command: 'categories',
      title: commandResponse.title,
      content,
      success: true,
      data: commandResponse
    };
  } catch (error: any) {
    console.error('Categories command error:', error);
    return {
      type: 'command_response',
      command: 'categories',
      title: 'Error Loading Categories',
      content: 'Sorry, I couldn\'t load the categories right now. Please check your connection and try again.',
      success: false
    };
  }
}

/**
 * Handle /search command
 */
async function handleSearchCommand(args: string[]): Promise<EnhancedCommandResponse> {
  const query = args.join(' ').trim();
  
  if (!query) {
    return {
      type: 'command_response',
      command: 'search',
      title: 'Search Modules',
      content: 'Please provide a search term. Example: `/search digital skills`',
      success: false
    };
  }

  try {
    const response = await apiClient.searchModules(query, { limit: 6 });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Search failed');
    }

    const modules: LearningModule[] = response.data.data || response.data;

    // Create structured response (reuse ModuleCommandResponse)
    const commandResponse: ModuleCommandResponse = {
      type: 'modules',
      title: `Search Results: "${query}"`,
      description: `Found ${modules.length} modules matching "${query}"`,
      modules,
      search_query: query
    };

    const content = modules.length > 0
      ? `${commandResponse.description}:\n\n${
          modules.map(module => 
            `**${module.title}**\n` +
            `📚 ${module.category?.name || 'General'} • ${capitalizeFirst(module.difficulty_level)}\n` +
            `⏱️ ${module.estimated_duration_minutes} min\n` +
            `${module.description}\n`
          ).join('\n')
        }\n💡 *Tap any module card below to learn more!*`
      : `No modules found for "${query}". Try different search terms or browse categories.`;

    return {
      type: 'command_response',
      command: 'search',
      title: commandResponse.title,
      content,
      success: true,
      data: commandResponse
    };
  } catch (error: any) {
    console.error('Search command error:', error);
    return {
      type: 'command_response',
      command: 'search',
      title: 'Search Error',
      content: `Sorry, I couldn't search for "${query}" right now. Please try again later.`,
      success: false
    };
  }
}

/**
 * Handle /courses command with real API data
 */
async function handleCoursesCommand(args: string[]): Promise<EnhancedCommandResponse> {
  try {
    // Parse arguments for filtering
    const filterCategory = args.length > 0 ? args.join(' ').toLowerCase() : null;
    const limit = 6; // Show max 6 courses in chat
    
    // Fetch courses from API
    const response = await apiClient.getCourses({
      featured: filterCategory ? undefined : true, // Show featured if no filter
      search: filterCategory || undefined,
      limit
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch courses');
    }

    const courses = response.data.data || response.data;
    const totalCount = response.data.pagination?.total || courses.length;

    const commandResponse = {
      type: 'courses' as const,
      title: filterCategory ? `Courses: "${filterCategory}"` : 'Featured Learning Courses',
      description: filterCategory 
        ? `Found ${courses.length} courses matching "${filterCategory}"`
        : `Here are our ${courses.length} featured learning courses`,
      courses,
      total_count: totalCount,
      search_query: filterCategory || undefined
    };

    const content = courses.length > 0
      ? `${commandResponse.description}:\n\n${
          courses.map((course: any) => 
            `**${course.title}**\n` +
            `📚 ${course.category?.name || 'General'} • ${capitalizeFirst(course.difficulty_level)}\n` +
            `⏱️ ${course.estimated_duration_hours}h • ${course.enrollment_count || 0} enrolled\n` +
            `${course.description}\n`
          ).join('\n')
        }\n💡 *Tap any course card below to learn more or enroll!*`
      : `No courses found${filterCategory ? ` for "${filterCategory}"` : ''}. Try browsing all categories or searching for different terms.`;

    return {
      type: 'command_response',
      command: 'courses',
      title: commandResponse.title,
      content,
      success: true,
      data: commandResponse
    };
  } catch (error: any) {
    console.error('Courses command error:', error);
    return {
      type: 'command_response',
      command: 'courses',
      title: 'Error Loading Courses',
      content: 'Sorry, I couldn\'t load the learning courses right now. Please check your connection and try again.',
      success: false
    };
  }
}

/**
 * Handle /enroll command
 */
async function handleEnrollCommand(args: string[]): Promise<EnhancedCommandResponse> {
  try {
    if (args.length === 0) {
      return {
        type: 'command_response',
        command: 'enroll',
        title: 'Course Enrollment',
        content: 'Please specify a course to enroll in. Example: `/enroll Digital Skills` or use `/courses` to see available courses.',
        success: false
      };
    }

    const courseQuery = args.join(' ').trim();
    
    // First, search for the course
    const searchResponse = await apiClient.searchCourses(courseQuery, { limit: 1 });
    
    if (!searchResponse.success || !searchResponse.data) {
      throw new Error(searchResponse.error || 'Failed to search courses');
    }

    const courses = searchResponse.data.data || searchResponse.data;
    
    if (!courses || courses.length === 0) {
      return {
        type: 'command_response',
        command: 'enroll',
        title: 'Course Not Found',
        content: `No course found matching "${courseQuery}". Use \`/courses\` to see available courses.`,
        success: false
      };
    }

    const course = courses[0];
    
    // Try to enroll in the course
    const enrollResponse = await apiClient.enrollInCourse(course.id);
    
    if (!enrollResponse.success) {
      return {
        type: 'command_response',
        command: 'enroll',
        title: 'Enrollment Failed',
        content: `Failed to enroll in "${course.title}": ${enrollResponse.error || 'Unknown error'}`,
        success: false
      };
    }

    return {
      type: 'command_response',
      command: 'enroll',
      title: 'Successfully Enrolled! 🎉',
      content: `You have successfully enrolled in **${course.title}**!\n\n` +
        `📚 **Course:** ${course.title}\n` +
        `⏱️ **Duration:** ${course.estimated_duration_hours} hours\n` +
        `📈 **Difficulty:** ${capitalizeFirst(course.difficulty_level)}\n\n` +
        `Use \`/my-courses\` to see all your enrollments or start learning right away!`,
      success: true
    };
  } catch (error: any) {
    console.error('Enroll command error:', error);
    return {
      type: 'command_response',
      command: 'enroll',
      title: 'Enrollment Error',
      content: 'Sorry, there was an error processing your enrollment. Please try again later.',
      success: false
    };
  }
}

/**
 * Handle /my-courses command
 */
async function handleMyCoursesCommand(args: string[]): Promise<EnhancedCommandResponse> {
  try {
    // Parse status filter from args
    const statusFilter = args.length > 0 ? args[0].toLowerCase() : null;
    const validStatuses = ['active', 'completed', 'dropped', 'suspended'];
    
    const params: any = { limit: 10 };
    if (statusFilter && validStatuses.includes(statusFilter)) {
      params.status = statusFilter;
    }

    // Fetch user's enrollments
    const response = await apiClient.getUserEnrollments(params);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch enrollments');
    }

    const enrollments = response.data.data || response.data;
    const totalCount = response.data.pagination?.total || enrollments.length;

    const commandResponse = {
      type: 'enrollments' as const,
      title: statusFilter ? `${capitalizeFirst(statusFilter)} Courses` : 'My Courses',
      description: statusFilter 
        ? `You have ${enrollments.length} ${statusFilter} course enrollments`
        : `You are enrolled in ${enrollments.length} courses`,
      enrollments,
      total_count: totalCount,
      status_filter: statusFilter || undefined
    };

    const content = enrollments.length > 0
      ? `${commandResponse.description}:\n\n${
          enrollments.map((enrollment: any) => {
            const course = enrollment.courses || enrollment.course;
            const statusEmoji = {
              active: '🔄',
              completed: '✅',
              dropped: '❌',
              suspended: '⏸️'
            }[enrollment.status] || '📚';
            
            return `${statusEmoji} **${course?.title || 'Unknown Course'}**\n` +
              `📊 Progress: ${enrollment.progress_percentage}%\n` +
              `📅 Status: ${capitalizeFirst(enrollment.status.replace('_', ' '))}\n` +
              `⏱️ Duration: ${course?.estimated_duration_hours || 'N/A'}h\n`;
          }).join('\n')
        }\n💡 *Use \`/enroll [course]\` to enroll in more courses!*`
      : statusFilter 
        ? `You have no ${statusFilter} course enrollments. Use \`/courses\` to find courses to enroll in.`
        : 'You are not enrolled in any courses yet. Use `/courses` to find courses to enroll in.';

    return {
      type: 'command_response',
      command: 'my-courses',
      title: commandResponse.title,
      content,
      success: true,
      data: commandResponse
    };
  } catch (error: any) {
    console.error('My courses command error:', error);
    return {
      type: 'command_response',
      command: 'my-courses',
      title: 'Error Loading Enrollments',
      content: 'Sorry, I couldn\'t load your course enrollments right now. Please check your connection and try again.',
      success: false
    };
  }
}

/**
 * Handle /drop command
 */
async function handleDropCommand(args: string[]): Promise<EnhancedCommandResponse> {
  try {
    if (args.length === 0) {
      return {
        type: 'command_response',
        command: 'drop',
        title: 'Drop Course',
        content: 'Please specify a course to drop. Example: `/drop Digital Skills` or use `/my-courses` to see your enrollments.',
        success: false
      };
    }

    const courseQuery = args.join(' ').trim();
    
    // First, get user's enrollments to find the course
    const enrollmentsResponse = await apiClient.getUserEnrollments({ status: 'active' });
    
    if (!enrollmentsResponse.success || !enrollmentsResponse.data) {
      throw new Error(enrollmentsResponse.error || 'Failed to fetch enrollments');
    }

    const enrollments = enrollmentsResponse.data.data || enrollmentsResponse.data;
    
    // Find matching course
    const matchingEnrollment = enrollments.find((enrollment: any) => {
      const course = enrollment.courses || enrollment.course;
      return course?.title.toLowerCase().includes(courseQuery.toLowerCase());
    });

    if (!matchingEnrollment) {
      return {
        type: 'command_response',
        command: 'drop',
        title: 'Course Not Found',
        content: `No active enrollment found for "${courseQuery}". Use \`/my-courses\` to see your current enrollments.`,
        success: false
      };
    }

    const course = matchingEnrollment.courses || matchingEnrollment.course;
    
    // Drop from the course
    const dropResponse = await apiClient.dropFromCourse(course.id);
    
    if (!dropResponse.success) {
      return {
        type: 'command_response',
        command: 'drop',
        title: 'Drop Failed',
        content: `Failed to drop from "${course.title}": ${dropResponse.error || 'Unknown error'}`,
        success: false
      };
    }

    return {
      type: 'command_response',
      command: 'drop',
      title: 'Successfully Dropped',
      content: `You have successfully dropped from **${course.title}**.\n\n` +
        `📊 **Progress Saved:** ${matchingEnrollment.progress_percentage}%\n` +
        `💡 You can re-enroll later using \`/enroll ${course.title}\`\n\n` +
        `Use \`/my-courses\` to see your remaining enrollments.`,
      success: true
    };
  } catch (error: any) {
    console.error('Drop command error:', error);
    return {
      type: 'command_response',
      command: 'drop',
      title: 'Drop Error',
      content: 'Sorry, there was an error processing your request. Please try again later.',
      success: false
    };
  }
}

/**
 * Handle /help command
 */
function handleHelpCommand(): EnhancedCommandResponse {
  const content = `## Available Commands 🤖\n\n` +
    `**Module Commands:**\n` +
    `• \`/modules\` - Browse featured learning modules\n` +
    `• \`/modules [category]\` - Filter modules by category\n` +
    `• \`/search [query]\` - Search for specific modules\n\n` +
    `**Course Commands:**\n` +
    `• \`/courses\` - Browse featured learning courses\n` +
    `• \`/courses [category]\` - Filter courses by category\n` +
    `• \`/enroll [course]\` - Enroll in a specific course\n` +
    `• \`/my-courses\` - View your course enrollments\n` +
    `• \`/drop [course]\` - Drop from a course\n\n` +
    `**General Commands:**\n` +
    `• \`/categories\` - View all learning categories\n` +
    `• \`/progress\` - View your learning progress and stats\n` +
    `• \`/help\` - Show this help message\n\n` +
    `**Tips:**\n` +
    `• You can also ask questions naturally, like "What courses are available?"\n` +
    `• Use the suggestion cards for quick actions\n` +
    `• Tap on course/module cards to view details and start learning\n\n` +
    `*Happy learning! 🎓*`;

  return {
    type: 'command_response',
    command: 'help',
    title: 'Command Help',
    content,
    success: true
  };
}

/**
 * Check if a command is available
 */
export function isValidCommand(command: string): boolean {
  const validCommands = [
    'modules', 'learn', 'progress', 'stats', 'categories', 'cats', 'search', 'help',
    'courses', 'course', 'enroll', 'my-courses', 'enrollments', 'drop', 'unenroll'
  ];
  return validCommands.includes(command.toLowerCase());
}

/**
 * Get command suggestions based on input
 */
export function getCommandSuggestions(input: string): string[] {
  const commands = [
    '/modules - Browse learning modules',
    '/courses - Browse learning courses',
    '/progress - Check your progress',
    '/categories - View all categories',
    '/search [query] - Search modules',
    '/enroll [course] - Enroll in a course',
    '/my-courses - View your enrollments',
    '/help - Show available commands'
  ];

  if (!input || input === '/') {
    return commands;
  }

  const query = input.toLowerCase().replace('/', '');
  return commands.filter(cmd => 
    cmd.toLowerCase().includes(query)
  );
}

/**
 * Utility function to capitalize first letter
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Export the types for backward compatibility
export type { EnhancedCommandResponse as CommandResponse };