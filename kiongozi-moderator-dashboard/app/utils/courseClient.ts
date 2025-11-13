/**
 * Direct Supabase Client for Courses
 * Fetches courses directly from Supabase database
 */

import { getSupabase } from './supabaseClient';
import type { Course, ModuleCategory } from '../types/lms';

export async function getCourses(filters?: {
  status?: string;
  category_id?: string;
  limit?: number;
}) {
  const supabase = getSupabase();

  let query = supabase
    .from('courses')
    .select(`
      *,
      category:module_categories(id, name, color, icon),
      modules:course_modules(
        id,
        order_index,
        module:learning_modules(id, title, description)
      )
    `)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching courses:', error);
    return { success: false, error: error.message };
  }

  // Transform data to match Course type
  const courses = (data || []).map((course: any) => ({
    id: course.id,
    title: course.title,
    description: course.description,
    category_id: course.category_id,
    category_name: course.category?.name || 'Uncategorized',
    difficulty_level: course.difficulty_level,
    difficulty: course.difficulty_level, // Alias
    estimated_duration_hours: course.estimated_duration_hours,
    estimated_hours: course.estimated_duration_hours, // Alias
    status: course.status,
    module_count: course.modules?.length || 0,
    enrollment_count: course.enrollment_count || 0,
    created_at: course.created_at,
    published_at: course.published_at
  })) as unknown as Course[];

  return { success: true, data: courses };
}

export async function getCourse(courseId: string) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      category:module_categories(id, name, color, icon),
      modules:course_modules(
        id,
        order_index,
        is_required,
        learning_modules(
          id,
          title,
          description,
          estimated_duration_minutes,
          difficulty_level
        )
      )
    `)
    .eq('id', courseId)
    .single();

  if (error) {
    console.error('Error fetching course:', error);
    return { success: false, error: error.message };
  }

  // Sort modules by order_index
  if (data?.modules) {
    data.modules.sort((a: any, b: any) => a.order_index - b.order_index);
  }

  return { success: true, data };
}

export async function getCategories() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('module_categories')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as ModuleCategory[] };
}

export async function getModule(moduleId: string) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('learning_modules')
    .select(`
      *,
      category:module_categories(id, name, color, icon)
    `)
    .eq('id', moduleId)
    .single();

  if (error) {
    console.error('Error fetching module:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function enrollInCourse(courseId: string, userId: string) {
  const supabase = getSupabase();

  // Check if already enrolled
  const { data: existing } = await supabase
    .from('course_enrollments')
    .select('*')
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    return { success: true, data: existing };
  }

  // Create enrollment
  const { data, error } = await supabase
    .from('course_enrollments')
    .insert({
      course_id: courseId,
      user_id: userId,
      status: 'active',
      progress_percentage: 0
    })
    .select()
    .single();

  if (error) {
    console.error('Error enrolling in course:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function getCourseEnrollment(courseId: string, userId: string) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('course_enrollments')
    .select('*')
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .single();

  if (error) {
    // Not enrolled is not an error
    if (error.code === 'PGRST116') {
      return { success: true, data: null };
    }
    console.error('Error fetching enrollment:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function getUserEnrollments(userId: string) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('course_enrollments')
    .select(`
      *,
      course:courses(
        id,
        title,
        description,
        difficulty_level,
        estimated_duration_hours,
        category:module_categories(id, name, icon),
        modules:course_modules(id)
      )
    `)
    .eq('user_id', userId)
    .order('enrolled_at', { ascending: false });

  if (error) {
    console.error('Error fetching enrollments:', error);
    return { success: false, error: error.message };
  }

  // Add module count to each course
  const enrollments = (data || []).map((enrollment: any) => ({
    ...enrollment,
    course: {
      ...enrollment.course,
      module_count: enrollment.course?.modules?.length || 0
    }
  }));

  return { success: true, data: enrollments };
}

export async function updateModuleProgress(
  moduleId: string,
  courseId: string,
  userId: string,
  status: 'active' | 'completed' = 'completed'
) {
  const supabase = getSupabase();

  // Check if progress record exists
  const { data: existing } = await supabase
    .from('user_progress')
    .select('*')
    .eq('module_id', moduleId)
    .eq('user_id', userId)
    .single();

  let progressData;

  if (existing) {
    // Update existing record
    const { data, error } = await supabase
      .from('user_progress')
      .update({
        status,
        progress_percentage: status === 'completed' ? 100 : existing.progress_percentage,
        completed_at: status === 'completed' ? new Date().toISOString() : existing.completed_at
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating progress:', error);
      return { success: false, error: error.message };
    }

    progressData = data;
  } else {
    // Create new progress record
    const { data, error } = await supabase
      .from('user_progress')
      .insert({
        user_id: userId,
        module_id: moduleId,
        status,
        progress_percentage: status === 'completed' ? 100 : 0,
        completed_at: status === 'completed' ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating progress:', error);
      return { success: false, error: error.message };
    }

    progressData = data;
  }

  // Update course enrollment progress
  await updateCourseProgress(courseId, userId);

  return { success: true, data: progressData };
}

async function updateCourseProgress(courseId: string, userId: string) {
  const supabase = getSupabase();

  // Get all modules in the course
  const { data: courseModules } = await supabase
    .from('course_modules')
    .select('learning_modules(id)')
    .eq('course_id', courseId);

  if (!courseModules || courseModules.length === 0) return;

  const moduleIds = courseModules
    .map((cm: any) => cm.learning_modules?.id)
    .filter(Boolean);

  // Get user's progress for all modules in the course
  const { data: userProgress } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .in('module_id', moduleIds);

  const completedCount = userProgress?.filter((p: any) => p.status === 'completed').length || 0;
  const totalCount = moduleIds.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Update course enrollment
  await supabase
    .from('course_enrollments')
    .update({
      progress_percentage: progressPercentage,
      status: progressPercentage === 100 ? 'completed' : 'active'
    })
    .eq('course_id', courseId)
    .eq('user_id', userId);
}

export async function getModuleProgress(moduleId: string, userId: string) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('module_id', moduleId)
    .eq('user_id', userId)
    .single();

  if (error) {
    // No progress record is not an error
    if (error.code === 'PGRST116') {
      return { success: true, data: null };
    }
    console.error('Error fetching module progress:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}
