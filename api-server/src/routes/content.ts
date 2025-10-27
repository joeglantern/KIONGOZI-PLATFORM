import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { supabaseServiceClient } from '../config/supabase';

const router = Router();

// Helper function to check if user has content management permissions
function hasContentPermissions(userRole: string): boolean {
  return ['admin', 'moderator', 'content_editor', 'org_admin'].includes(userRole);
}

// Get all module categories (public)
router.get('/categories', async (req, res) => {
  try {
    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const { data, error } = await supabaseServiceClient
      .from('module_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('Failed to get categories:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve categories' });
  }
});

// Get learning modules with filtering and search (public for published modules)
router.get('/modules', async (req, res) => {
  try {
    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const {
      category_id,
      difficulty_level,
      featured,
      search,
      limit = '20',
      offset = '0'
    } = req.query;

    const limitNum = Math.min(parseInt(String(limit)), 100) || 20;
    const offsetNum = Math.max(parseInt(String(offset)), 0) || 0;

    let query = supabaseServiceClient
      .from('learning_modules')
      .select(`
        *,
        module_categories (
          id,
          name,
          description,
          color,
          icon
        ),
        profiles!learning_modules_author_id_fkey (
          id,
          full_name
        )
      `, { count: 'exact' })
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    // Apply filters
    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    if (difficulty_level) {
      query = query.eq('difficulty_level', difficulty_level);
    }

    if (featured === 'true') {
      query = query.eq('featured', true);
    }

    // Search functionality
    if (search && typeof search === 'string') {
      const searchTerm = search.trim();
      query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,keywords.cs.{${searchTerm}}`);
    }

    const { data, error, count } = await query;

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      data,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: count || 0
      }
    });
  } catch (error: any) {
    console.error('Failed to get modules:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve modules' });
  }
});

// Get a specific module by ID (public for published, author/admin for others)
router.get('/modules/:id', async (req, res) => {
  try {
    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const { id } = req.params;

    const { data, error } = await supabaseServiceClient
      .from('learning_modules')
      .select(`
        *,
        module_categories (
          id,
          name,
          description,
          color,
          icon
        ),
        profiles!learning_modules_author_id_fkey (
          id,
          full_name
        ),
        module_tags (
          tag
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Module not found' });
      }
      return res.status(500).json({ success: false, error: error.message });
    }

    // Increment view count for published modules
    if (data.status === 'published') {
      await supabaseServiceClient.rpc('increment_module_view_count', { module_id: id });
    }

    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('Failed to get module:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve module' });
  }
});

// Create a new learning module (moderator+)
router.post('/modules', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    // Fetch user's role from database (JWT might not have latest role)
    const { data: profiles, error: profileError } = await supabaseServiceClient
      .from('profiles')
      .select('role')
      .eq('id', req.user.id);

    if (profileError || !profiles || profiles.length === 0) {
      return res.status(403).json({ success: false, error: 'User profile not found' });
    }

    const userRole = profiles[0].role || 'user';
    req.user.role = userRole; // Update role from database

    if (!hasContentPermissions(userRole)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions to create modules' });
    }

    const {
      title,
      description,
      content,
      category_id,
      difficulty_level = 'beginner',
      estimated_duration_minutes = 30,
      learning_objectives = [],
      keywords = [],
      status = 'draft',
      featured = false,
      tags = []
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title and content are required'
      });
    }

    // Create the module
    const moduleData = {
      title: title.trim(),
      description: description?.trim() || null,
      content: content.trim(),
      category_id: category_id || null,
      difficulty_level,
      estimated_duration_minutes,
      learning_objectives,
      keywords,
      author_id: req.user.id,
      status,
      featured,
      published_at: status === 'published' ? new Date().toISOString() : null
    };

    console.log('🔧 [POST /modules] Attempting to create module with data:', JSON.stringify(moduleData, null, 2));

    const { data: module, error: moduleError } = await supabaseServiceClient
      .from('learning_modules')
      .insert(moduleData)
      .select()
      .single();

    if (moduleError) {
      console.error('❌ [POST /modules] Module creation failed:', moduleError);
      return res.status(500).json({ success: false, error: moduleError.message });
    }

    console.log('✅ [POST /modules] Module created successfully:', module);

    // Add tags if provided
    if (tags.length > 0) {
      const tagData = tags.map((tag: string) => ({
        module_id: module.id,
        tag: tag.trim().toLowerCase()
      }));

      const { error: tagsError } = await supabaseServiceClient
        .from('module_tags')
        .insert(tagData);

      if (tagsError) {
        console.warn('Failed to create tags:', tagsError);
        // Don't fail the entire request for tag errors
      }
    }

    return res.status(201).json({
      success: true,
      data: module,
      message: 'Learning module created successfully'
    });
  } catch (error: any) {
    console.error('Failed to create module:', error);
    return res.status(500).json({ success: false, error: 'Failed to create module' });
  }
});

// Update a learning module (author or moderator+)
router.put('/modules/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const { id } = req.params;
    const {
      title,
      description,
      content,
      category_id,
      difficulty_level,
      estimated_duration_minutes,
      learning_objectives,
      keywords,
      status,
      featured,
      tags
    } = req.body;

    // Check if module exists and user has permission to edit
    const { data: existingModule, error: fetchError } = await supabaseServiceClient
      .from('learning_modules')
      .select('author_id, status')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Module not found' });
      }
      return res.status(500).json({ success: false, error: fetchError.message });
    }

    // Check permissions (author or moderator+)
    const isAuthor = existingModule.author_id === req.user.id;
    const hasModeratorRights = hasContentPermissions(req.user.role);

    if (!isAuthor && !hasModeratorRights) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions to edit this module' });
    }

    // Prepare update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (content !== undefined) updateData.content = content.trim();
    if (category_id !== undefined) updateData.category_id = category_id;
    if (difficulty_level !== undefined) updateData.difficulty_level = difficulty_level;
    if (estimated_duration_minutes !== undefined) updateData.estimated_duration_minutes = estimated_duration_minutes;
    if (learning_objectives !== undefined) updateData.learning_objectives = learning_objectives;
    if (keywords !== undefined) updateData.keywords = keywords;
    if (featured !== undefined) updateData.featured = featured;

    // Handle status changes
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'published' && existingModule.status !== 'published') {
        updateData.published_at = new Date().toISOString();
      } else if (status !== 'published') {
        updateData.published_at = null;
      }
    }

    // Update the module
    const { data: updatedModule, error: updateError } = await supabaseServiceClient
      .from('learning_modules')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ success: false, error: updateError.message });
    }

    // Update tags if provided
    if (tags !== undefined) {
      // Delete existing tags
      await supabaseServiceClient
        .from('module_tags')
        .delete()
        .eq('module_id', id);

      // Insert new tags
      if (tags.length > 0) {
        const tagData = tags.map((tag: string) => ({
          module_id: id,
          tag: tag.trim().toLowerCase()
        }));

        const { error: tagsError } = await supabaseServiceClient
          .from('module_tags')
          .insert(tagData);

        if (tagsError) {
          console.warn('Failed to update tags:', tagsError);
        }
      }
    }

    return res.json({
      success: true,
      data: updatedModule,
      message: 'Learning module updated successfully'
    });
  } catch (error: any) {
    console.error('Failed to update module:', error);
    return res.status(500).json({ success: false, error: 'Failed to update module' });
  }
});

// Delete a learning module (author or admin)
router.delete('/modules/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const { id } = req.params;

    // Check if module exists and user has permission to delete
    const { data: existingModule, error: fetchError } = await supabaseServiceClient
      .from('learning_modules')
      .select('author_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Module not found' });
      }
      return res.status(500).json({ success: false, error: fetchError.message });
    }

    // Check permissions (author or admin only)
    const isAuthor = existingModule.author_id === req.user.id;
    const isAdmin = ['admin', 'org_admin'].includes(req.user.role);

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions to delete this module' });
    }

    // Delete the module (tags and progress will cascade)
    const { error: deleteError } = await supabaseServiceClient
      .from('learning_modules')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return res.status(500).json({ success: false, error: deleteError.message });
    }

    return res.json({
      success: true,
      message: 'Learning module deleted successfully'
    });
  } catch (error: any) {
    console.error('Failed to delete module:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete module' });
  }
});

// ================================
// COURSE MANAGEMENT ENDPOINTS
// ================================

// Get all courses with filtering and search (public for published courses)
router.get('/courses', async (req, res) => {
  try {
    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const {
      category_id,
      difficulty_level,
      featured,
      search,
      status,
      author_id,
      limit = '20',
      offset = '0'
    } = req.query;

    let query = supabaseServiceClient
      .from('course_details') // Use the view for enriched data
      .select('*');

    // Apply filters
    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    if (difficulty_level) {
      query = query.eq('difficulty_level', difficulty_level);
    }

    if (featured === 'true') {
      query = query.eq('featured', true);
    }

    if (author_id) {
      query = query.eq('author_id', author_id);
    }

    // Status filtering - only show published courses to non-authenticated users
    if (req.user && hasContentPermissions(req.user.role)) {
      // Moderators can see all courses or filter by status
      if (status) {
        query = query.eq('status', status);
      }
    } else {
      // Public users only see published courses
      query = query.eq('status', 'published');
    }

    // Search functionality
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply pagination and ordering
    const limitNum = Math.min(parseInt(limit as string, 10) || 20, 100);
    const offsetNum = parseInt(offset as string, 10) || 0;

    query = query
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    const { data, error, count } = await query;

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      data,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: count || data?.length || 0
      }
    });
  } catch (error: any) {
    console.error('Failed to get courses:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve courses' });
  }
});

// Get a specific course by ID (public for published courses)
router.get('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    // Get course details with modules
    const { data: course, error: courseError } = await supabaseServiceClient
      .from('course_details')
      .select('*')
      .eq('id', id)
      .single();

    if (courseError) {
      if (courseError.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Course not found' });
      }
      return res.status(500).json({ success: false, error: courseError.message });
    }

    // Check if user can access this course
    if (course.status !== 'published') {
      if (!req.user || (!hasContentPermissions(req.user.role) && course.author_id !== req.user.id)) {
        return res.status(404).json({ success: false, error: 'Course not found' });
      }
    }

    // Get course modules
    const { data: modules, error: modulesError } = await supabaseServiceClient
      .from('course_modules')
      .select(`
        order_index,
        is_required,
        learning_modules (
          id,
          title,
          description,
          difficulty_level,
          estimated_duration_minutes,
          status,
          view_count
        )
      `)
      .eq('course_id', id)
      .order('order_index', { ascending: true });

    if (modulesError) {
      console.warn('Failed to get course modules:', modulesError);
    }

    // Update view count if this is a published course
    if (course.status === 'published') {
      await supabaseServiceClient
        .from('courses')
        .update({ view_count: (course.view_count || 0) + 1 })
        .eq('id', id);
    }

    return res.json({
      success: true,
      data: {
        ...course,
        modules: modules || []
      }
    });
  } catch (error: any) {
    console.error('Failed to get course:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve course' });
  }
});

// Create a new course (moderator+)
router.post('/courses', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!hasContentPermissions(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions to create courses' });
    }

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const {
      title,
      description,
      overview,
      category_id,
      difficulty_level = 'beginner',
      estimated_duration_hours = 10,
      prerequisites = [],
      learning_outcomes = [],
      status = 'draft',
      featured = false
    } = req.body;

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Title and description are required'
      });
    }

    // Validate category exists if provided
    if (category_id) {
      const { data: category, error: categoryError } = await supabaseServiceClient
        .from('module_categories')
        .select('id')
        .eq('id', category_id)
        .single();

      if (categoryError || !category) {
        return res.status(400).json({
          success: false,
          error: 'Invalid category_id provided'
        });
      }
    }

    // Create the course
    const courseData = {
      title: title.trim(),
      description: description.trim(),
      overview: overview?.trim() || null,
      category_id: category_id || null,
      difficulty_level,
      estimated_duration_hours: Math.max(1, estimated_duration_hours),
      prerequisites: Array.isArray(prerequisites) ? prerequisites : [],
      learning_outcomes: Array.isArray(learning_outcomes) ? learning_outcomes : [],
      author_id: req.user.id,
      status,
      featured,
      published_at: status === 'published' ? new Date().toISOString() : null
    };

    const { data: course, error: courseError } = await supabaseServiceClient
      .from('courses')
      .insert(courseData)
      .select()
      .single();

    if (courseError) {
      return res.status(500).json({ success: false, error: courseError.message });
    }

    return res.status(201).json({
      success: true,
      data: course,
      message: 'Course created successfully'
    });
  } catch (error: any) {
    console.error('Failed to create course:', error);
    return res.status(500).json({ success: false, error: 'Failed to create course' });
  }
});

// Update a course (author or moderator+)
router.put('/courses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    // Get existing course
    const { data: existingCourse, error: fetchError } = await supabaseServiceClient
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Course not found' });
      }
      return res.status(500).json({ success: false, error: fetchError.message });
    }

    // Check permissions (author or moderator+)
    const isAuthor = existingCourse.author_id === req.user.id;
    const isModerator = hasContentPermissions(req.user.role);

    if (!isAuthor && !isModerator) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions to update this course' });
    }

    const {
      title,
      description,
      overview,
      category_id,
      difficulty_level,
      estimated_duration_hours,
      prerequisites,
      learning_outcomes,
      status,
      featured
    } = req.body;

    // Validate category exists if provided
    if (category_id) {
      const { data: category, error: categoryError } = await supabaseServiceClient
        .from('module_categories')
        .select('id')
        .eq('id', category_id)
        .single();

      if (categoryError || !category) {
        return res.status(400).json({
          success: false,
          error: 'Invalid category_id provided'
        });
      }
    }

    // Prepare update data (only include provided fields)
    const updateData: any = {};

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (overview !== undefined) updateData.overview = overview?.trim() || null;
    if (category_id !== undefined) updateData.category_id = category_id;
    if (difficulty_level !== undefined) updateData.difficulty_level = difficulty_level;
    if (estimated_duration_hours !== undefined) {
      updateData.estimated_duration_hours = Math.max(1, estimated_duration_hours);
    }
    if (prerequisites !== undefined) {
      updateData.prerequisites = Array.isArray(prerequisites) ? prerequisites : [];
    }
    if (learning_outcomes !== undefined) {
      updateData.learning_outcomes = Array.isArray(learning_outcomes) ? learning_outcomes : [];
    }

    // Only moderators can change status and featured
    if (isModerator) {
      if (status !== undefined) {
        updateData.status = status;
        updateData.published_at = status === 'published' ? new Date().toISOString() : null;
      }
      if (featured !== undefined) updateData.featured = featured;
    }

    // Update the course
    const { data: updatedCourse, error: updateError } = await supabaseServiceClient
      .from('courses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ success: false, error: updateError.message });
    }

    return res.json({
      success: true,
      data: updatedCourse,
      message: 'Course updated successfully'
    });
  } catch (error: any) {
    console.error('Failed to update course:', error);
    return res.status(500).json({ success: false, error: 'Failed to update course' });
  }
});

// Delete a course (author or admin only)
router.delete('/courses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    // Get existing course
    const { data: existingCourse, error: fetchError } = await supabaseServiceClient
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Course not found' });
      }
      return res.status(500).json({ success: false, error: fetchError.message });
    }

    // Check permissions (author or admin only)
    const isAuthor = existingCourse.author_id === req.user.id;
    const isAdmin = ['admin', 'org_admin'].includes(req.user.role);

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions to delete this course' });
    }

    // Check if course has enrollments
    const { data: enrollments, error: enrollmentError } = await supabaseServiceClient
      .from('course_enrollments')
      .select('id')
      .eq('course_id', id)
      .limit(1);

    if (enrollmentError) {
      return res.status(500).json({ success: false, error: 'Failed to check course enrollments' });
    }

    if (enrollments && enrollments.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete course with active enrollments. Archive it instead.'
      });
    }

    // Delete the course (course_modules and other related data will cascade)
    const { error: deleteError } = await supabaseServiceClient
      .from('courses')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return res.status(500).json({ success: false, error: deleteError.message });
    }

    return res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error: any) {
    console.error('Failed to delete course:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete course' });
  }
});

// ================================
// COURSE-MODULE RELATIONSHIP ENDPOINTS
// ================================

// Get modules for a specific course (public for published courses)
router.get('/courses/:courseId/modules', async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    // First check if course exists and user can access it
    const { data: course, error: courseError } = await supabaseServiceClient
      .from('courses')
      .select('id, status, author_id')
      .eq('id', courseId)
      .single();

    if (courseError) {
      if (courseError.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Course not found' });
      }
      return res.status(500).json({ success: false, error: courseError.message });
    }

    // Check if user can access this course
    if (course.status !== 'published') {
      if (!req.user || (!hasContentPermissions(req.user.role) && course.author_id !== req.user.id)) {
        return res.status(404).json({ success: false, error: 'Course not found' });
      }
    }

    // Get course modules with module details
    const { data: courseModules, error: modulesError } = await supabaseServiceClient
      .from('course_modules')
      .select(`
        id,
        order_index,
        is_required,
        created_at,
        learning_modules (
          id,
          title,
          description,
          difficulty_level,
          estimated_duration_minutes,
          learning_objectives,
          keywords,
          status,
          view_count,
          category:module_categories (
            id,
            name,
            color,
            icon
          )
        )
      `)
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (modulesError) {
      return res.status(500).json({ success: false, error: modulesError.message });
    }

    return res.json({
      success: true,
      data: courseModules || []
    });
  } catch (error: any) {
    console.error('Failed to get course modules:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve course modules' });
  }
});

// Add a module to a course (author or moderator+)
router.post('/courses/:courseId/modules', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { module_id, order_index, is_required = true } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    // Validate required fields
    if (!module_id) {
      return res.status(400).json({
        success: false,
        error: 'module_id is required'
      });
    }

    // Check if course exists and user has permissions
    const { data: course, error: courseError } = await supabaseServiceClient
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError) {
      if (courseError.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Course not found' });
      }
      return res.status(500).json({ success: false, error: courseError.message });
    }

    // Check permissions (author or moderator+)
    const isAuthor = course.author_id === req.user.id;
    const isModerator = hasContentPermissions(req.user.role);

    if (!isAuthor && !isModerator) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions to modify this course' });
    }

    // Check if module exists and is published (or user has permissions to see it)
    const { data: module, error: moduleError } = await supabaseServiceClient
      .from('learning_modules')
      .select('id, title, status, author_id')
      .eq('id', module_id)
      .single();

    if (moduleError) {
      if (moduleError.code === 'PGRST116') {
        return res.status(400).json({ success: false, error: 'Module not found' });
      }
      return res.status(500).json({ success: false, error: moduleError.message });
    }

    // Check if module is accessible
    if (module.status !== 'published') {
      if (!hasContentPermissions(req.user.role) && module.author_id !== req.user.id) {
        return res.status(400).json({ success: false, error: 'Module not accessible' });
      }
    }

    // Check if module is already in the course
    const { data: existingRelation, error: checkError } = await supabaseServiceClient
      .from('course_modules')
      .select('id')
      .eq('course_id', courseId)
      .eq('module_id', module_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return res.status(500).json({ success: false, error: 'Failed to check existing relationship' });
    }

    if (existingRelation) {
      return res.status(400).json({
        success: false,
        error: 'Module is already part of this course'
      });
    }

    // Determine order_index if not provided
    let finalOrderIndex = order_index;
    if (finalOrderIndex === undefined) {
      const { data: lastModule, error: orderError } = await supabaseServiceClient
        .from('course_modules')
        .select('order_index')
        .eq('course_id', courseId)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      if (orderError && orderError.code !== 'PGRST116') {
        return res.status(500).json({ success: false, error: 'Failed to determine order index' });
      }

      finalOrderIndex = lastModule ? lastModule.order_index + 1 : 1;
    }

    // Add the module to the course
    const { data: courseModule, error: insertError } = await supabaseServiceClient
      .from('course_modules')
      .insert({
        course_id: courseId,
        module_id: module_id,
        order_index: finalOrderIndex,
        is_required
      })
      .select(`
        id,
        order_index,
        is_required,
        created_at,
        learning_modules (
          id,
          title,
          description,
          difficulty_level,
          estimated_duration_minutes
        )
      `)
      .single();

    if (insertError) {
      if (insertError.code === '23505') { // Unique constraint violation
        return res.status(400).json({
          success: false,
          error: 'Module already exists in this course or order index conflict'
        });
      }
      return res.status(500).json({ success: false, error: insertError.message });
    }

    return res.status(201).json({
      success: true,
      data: courseModule,
      message: `Module "${module.title}" added to course successfully`
    });
  } catch (error: any) {
    console.error('Failed to add module to course:', error);
    return res.status(500).json({ success: false, error: 'Failed to add module to course' });
  }
});

// Remove a module from a course (author or moderator+)
router.delete('/courses/:courseId/modules/:moduleId', authenticateToken, async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    // Check if course exists and user has permissions
    const { data: course, error: courseError } = await supabaseServiceClient
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError) {
      if (courseError.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Course not found' });
      }
      return res.status(500).json({ success: false, error: courseError.message });
    }

    // Check permissions (author or moderator+)
    const isAuthor = course.author_id === req.user.id;
    const isModerator = hasContentPermissions(req.user.role);

    if (!isAuthor && !isModerator) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions to modify this course' });
    }

    // Check if the relationship exists
    const { data: courseModule, error: relationError } = await supabaseServiceClient
      .from('course_modules')
      .select(`
        id,
        order_index,
        learning_modules (
          title
        )
      `)
      .eq('course_id', courseId)
      .eq('module_id', moduleId)
      .single();

    if (relationError) {
      if (relationError.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Module not found in this course' });
      }
      return res.status(500).json({ success: false, error: relationError.message });
    }

    // Remove the module from the course
    const { error: deleteError } = await supabaseServiceClient
      .from('course_modules')
      .delete()
      .eq('course_id', courseId)
      .eq('module_id', moduleId);

    if (deleteError) {
      return res.status(500).json({ success: false, error: deleteError.message });
    }

    // Reorder remaining modules to fill the gap
    const { error: reorderError } = await supabaseServiceClient.rpc('reorder_course_modules', {
      p_course_id: courseId,
      p_removed_order: courseModule.order_index
    });

    if (reorderError) {
      console.warn('Failed to reorder modules after deletion:', reorderError);
      // Don't fail the request for reordering issues
    }

    const moduleTitle = (courseModule.learning_modules as any)?.title || 'Unknown';
    return res.json({
      success: true,
      message: `Module "${moduleTitle}" removed from course successfully`
    });
  } catch (error: any) {
    console.error('Failed to remove module from course:', error);
    return res.status(500).json({ success: false, error: 'Failed to remove module from course' });
  }
});

// Reorder modules within a course (author or moderator+)
router.put('/courses/:courseId/modules/order', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { module_orders } = req.body; // Array of { module_id, order_index }

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    // Validate input
    if (!Array.isArray(module_orders) || module_orders.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'module_orders must be a non-empty array of { module_id, order_index }'
      });
    }

    // Check if course exists and user has permissions
    const { data: course, error: courseError } = await supabaseServiceClient
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError) {
      if (courseError.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Course not found' });
      }
      return res.status(500).json({ success: false, error: courseError.message });
    }

    // Check permissions (author or moderator+)
    const isAuthor = course.author_id === req.user.id;
    const isModerator = hasContentPermissions(req.user.role);

    if (!isAuthor && !isModerator) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions to modify this course' });
    }

    // Validate that all modules belong to this course
    const moduleIds = module_orders.map(item => item.module_id);
    const { data: existingModules, error: validateError } = await supabaseServiceClient
      .from('course_modules')
      .select('module_id')
      .eq('course_id', courseId)
      .in('module_id', moduleIds);

    if (validateError) {
      return res.status(500).json({ success: false, error: validateError.message });
    }

    if (existingModules.length !== moduleIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Some modules do not belong to this course'
      });
    }

    // Update the order for each module
    const updatePromises = module_orders.map(({ module_id, order_index }) =>
      supabaseServiceClient
        .from('course_modules')
        .update({ order_index })
        .eq('course_id', courseId)
        .eq('module_id', module_id)
    );

    const results = await Promise.all(updatePromises);

    // Check if any updates failed
    const failedUpdates = results.filter(result => result.error);
    if (failedUpdates.length > 0) {
      console.error('Some module order updates failed:', failedUpdates);
      return res.status(500).json({
        success: false,
        error: 'Failed to update some module orders'
      });
    }

    // Get updated course modules
    const { data: updatedModules, error: fetchError } = await supabaseServiceClient
      .from('course_modules')
      .select(`
        id,
        order_index,
        is_required,
        learning_modules (
          id,
          title,
          description
        )
      `)
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (fetchError) {
      console.warn('Failed to fetch updated modules:', fetchError);
    }

    return res.json({
      success: true,
      data: updatedModules || [],
      message: 'Module order updated successfully'
    });
  } catch (error: any) {
    console.error('Failed to reorder course modules:', error);
    return res.status(500).json({ success: false, error: 'Failed to reorder course modules' });
  }
});

// Update module settings within a course (author or moderator+)
router.put('/courses/:courseId/modules/:moduleId', authenticateToken, async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const { is_required, order_index } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    // Check if course exists and user has permissions
    const { data: course, error: courseError } = await supabaseServiceClient
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError) {
      if (courseError.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Course not found' });
      }
      return res.status(500).json({ success: false, error: courseError.message });
    }

    // Check permissions (author or moderator+)
    const isAuthor = course.author_id === req.user.id;
    const isModerator = hasContentPermissions(req.user.role);

    if (!isAuthor && !isModerator) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions to modify this course' });
    }

    // Check if the relationship exists
    const { data: existingRelation, error: relationError } = await supabaseServiceClient
      .from('course_modules')
      .select('*')
      .eq('course_id', courseId)
      .eq('module_id', moduleId)
      .single();

    if (relationError) {
      if (relationError.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Module not found in this course' });
      }
      return res.status(500).json({ success: false, error: relationError.message });
    }

    // Prepare update data
    const updateData: any = {};
    if (is_required !== undefined) updateData.is_required = is_required;
    if (order_index !== undefined) updateData.order_index = order_index;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields provided for update'
      });
    }

    // Update the course-module relationship
    const { data: updatedRelation, error: updateError } = await supabaseServiceClient
      .from('course_modules')
      .update(updateData)
      .eq('course_id', courseId)
      .eq('module_id', moduleId)
      .select(`
        id,
        order_index,
        is_required,
        learning_modules (
          id,
          title,
          description
        )
      `)
      .single();

    if (updateError) {
      if (updateError.code === '23505') { // Unique constraint violation
        return res.status(400).json({
          success: false,
          error: 'Order index conflict - another module already has this position'
        });
      }
      return res.status(500).json({ success: false, error: updateError.message });
    }

    return res.json({
      success: true,
      data: updatedRelation,
      message: 'Module settings updated successfully'
    });
  } catch (error: any) {
    console.error('Failed to update course module settings:', error);
    return res.status(500).json({ success: false, error: 'Failed to update module settings' });
  }
});

// ================================
// COURSE ENROLLMENT ENDPOINTS
// ================================

// Get user's enrollments (authenticated users only)
router.get('/enrollments', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const {
      status,
      limit = '20',
      offset = '0'
    } = req.query;

    let query = supabaseServiceClient
      .from('course_enrollments')
      .select(`
        id,
        enrolled_at,
        status,
        progress_percentage,
        completed_at,
        certificate_issued,
        last_accessed_at,
        created_at,
        updated_at,
        courses (
          id,
          title,
          description,
          difficulty_level,
          estimated_duration_hours,
          category:module_categories (
            id,
            name,
            color,
            icon
          ),
          author:profiles!courses_author_id_fkey (
            full_name,
            email
          )
        )
      `)
      .eq('user_id', req.user.id);

    // Filter by status if provided
    if (status && ['active', 'completed', 'dropped', 'suspended'].includes(status as string)) {
      query = query.eq('status', status);
    }

    // Apply pagination and ordering
    const limitNum = Math.min(parseInt(limit as string, 10) || 20, 100);
    const offsetNum = parseInt(offset as string, 10) || 0;

    query = query
      .order('last_accessed_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    const { data: enrollments, error, count } = await query;

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      data: enrollments || [],
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: count || enrollments?.length || 0
      }
    });
  } catch (error: any) {
    console.error('Failed to get user enrollments:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve enrollments' });
  }
});

// Get enrollment details for a specific course (authenticated users only)
router.get('/courses/:courseId/enrollment', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    // Get enrollment details
    const { data: enrollment, error: enrollmentError } = await supabaseServiceClient
      .from('course_enrollments')
      .select(`
        id,
        enrolled_at,
        status,
        progress_percentage,
        completed_at,
        certificate_issued,
        last_accessed_at,
        created_at,
        updated_at,
        courses (
          id,
          title,
          description,
          difficulty_level,
          estimated_duration_hours,
          module_count:course_modules(count)
        )
      `)
      .eq('user_id', req.user.id)
      .eq('course_id', courseId)
      .single();

    if (enrollmentError) {
      if (enrollmentError.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Enrollment not found' });
      }
      return res.status(500).json({ success: false, error: enrollmentError.message });
    }

    // Update last accessed time
    await supabaseServiceClient
      .from('course_enrollments')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', enrollment.id);

    return res.json({
      success: true,
      data: enrollment
    });
  } catch (error: any) {
    console.error('Failed to get course enrollment:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve enrollment' });
  }
});

// Enroll in a course (authenticated users only)
router.post('/courses/:courseId/enroll', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    // Check if course exists and is published
    const { data: course, error: courseError } = await supabaseServiceClient
      .from('courses')
      .select('id, title, status, enrollment_count')
      .eq('id', courseId)
      .single();

    if (courseError) {
      if (courseError.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Course not found' });
      }
      return res.status(500).json({ success: false, error: courseError.message });
    }

    if (course.status !== 'published') {
      return res.status(400).json({
        success: false,
        error: 'Course is not available for enrollment'
      });
    }

    // Check if user is already enrolled
    const { data: existingEnrollment, error: checkError } = await supabaseServiceClient
      .from('course_enrollments')
      .select('id, status')
      .eq('user_id', req.user.id)
      .eq('course_id', courseId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return res.status(500).json({ success: false, error: 'Failed to check existing enrollment' });
    }

    if (existingEnrollment) {
      if (existingEnrollment.status === 'active') {
        return res.status(400).json({
          success: false,
          error: 'You are already enrolled in this course'
        });
      } else if (existingEnrollment.status === 'completed') {
        return res.status(400).json({
          success: false,
          error: 'You have already completed this course'
        });
      } else if (existingEnrollment.status === 'suspended') {
        return res.status(400).json({
          success: false,
          error: 'Your enrollment in this course has been suspended'
        });
      } else if (existingEnrollment.status === 'dropped') {
        // Allow re-enrollment if previously dropped
        const { data: updatedEnrollment, error: updateError } = await supabaseServiceClient
          .from('course_enrollments')
          .update({
            status: 'active',
            enrolled_at: new Date().toISOString(),
            last_accessed_at: new Date().toISOString()
          })
          .eq('id', existingEnrollment.id)
          .select()
          .single();

        if (updateError) {
          return res.status(500).json({ success: false, error: updateError.message });
        }

        return res.status(200).json({
          success: true,
          data: updatedEnrollment,
          message: `Successfully re-enrolled in "${course.title}"`
        });
      }
    }

    // Create new enrollment
    const enrollmentData = {
      user_id: req.user.id,
      course_id: courseId,
      enrolled_at: new Date().toISOString(),
      status: 'active' as const,
      progress_percentage: 0,
      certificate_issued: false,
      last_accessed_at: new Date().toISOString()
    };

    const { data: enrollment, error: enrollmentError } = await supabaseServiceClient
      .from('course_enrollments')
      .insert(enrollmentData)
      .select(`
        id,
        enrolled_at,
        status,
        progress_percentage,
        courses (
          id,
          title,
          description
        )
      `)
      .single();

    if (enrollmentError) {
      if (enrollmentError.code === '23505') { // Unique constraint violation
        return res.status(400).json({
          success: false,
          error: 'You are already enrolled in this course'
        });
      }
      return res.status(500).json({ success: false, error: enrollmentError.message });
    }

    // Update course enrollment count
    await supabaseServiceClient
      .from('courses')
      .update({ enrollment_count: (course.enrollment_count || 0) + 1 })
      .eq('id', courseId);

    return res.status(201).json({
      success: true,
      data: enrollment,
      message: `Successfully enrolled in "${course.title}"`
    });
  } catch (error: any) {
    console.error('Failed to enroll in course:', error);
    return res.status(500).json({ success: false, error: 'Failed to enroll in course' });
  }
});

// Update enrollment status (user can drop, moderators can suspend/reactivate)
router.put('/courses/:courseId/enrollment', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { status, progress_percentage } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    // Get existing enrollment
    const { data: enrollment, error: fetchError } = await supabaseServiceClient
      .from('course_enrollments')
      .select(`
        id,
        user_id,
        status,
        progress_percentage,
        courses (
          id,
          title,
          author_id
        )
      `)
      .eq('user_id', req.user.id)
      .eq('course_id', courseId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Enrollment not found' });
      }
      return res.status(500).json({ success: false, error: fetchError.message });
    }

    // Validate status transitions
    const validUserStatuses = ['dropped'];
    const validModeratorStatuses = ['active', 'completed', 'dropped', 'suspended'];
    const isModerator = hasContentPermissions(req.user.role);
    const isCourseAuthor = (enrollment.courses as any)?.author_id === req.user.id;

    if (status) {
      if (!isModerator && !isCourseAuthor && !validUserStatuses.includes(status)) {
        return res.status(403).json({
          success: false,
          error: 'You can only drop your enrollment. Other status changes require moderator permissions.'
        });
      }

      if ((isModerator || isCourseAuthor) && !validModeratorStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status. Valid statuses: active, completed, dropped, suspended'
        });
      }
    }

    // Prepare update data
    const updateData: any = {
      last_accessed_at: new Date().toISOString()
    };

    if (status !== undefined) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.progress_percentage = 100;
      } else if (status === 'dropped') {
        updateData.progress_percentage = enrollment.progress_percentage; // Keep current progress
      }
    }

    if (progress_percentage !== undefined && (isModerator || isCourseAuthor)) {
      updateData.progress_percentage = Math.max(0, Math.min(100, progress_percentage));
    }

    // Update the enrollment
    const { data: updatedEnrollment, error: updateError } = await supabaseServiceClient
      .from('course_enrollments')
      .update(updateData)
      .eq('id', enrollment.id)
      .select(`
        id,
        status,
        progress_percentage,
        completed_at,
        last_accessed_at,
        courses (
          id,
          title
        )
      `)
      .single();

    if (updateError) {
      return res.status(500).json({ success: false, error: updateError.message });
    }

    // Update course enrollment count if status changed to/from active
    if (status && status !== enrollment.status) {
      let countChange = 0;
      if (enrollment.status === 'active' && status !== 'active') {
        countChange = -1; // User left active enrollment
      } else if (enrollment.status !== 'active' && status === 'active') {
        countChange = 1; // User became actively enrolled
      }

      if (countChange !== 0) {
        const { data: course } = await supabaseServiceClient
          .from('courses')
          .select('enrollment_count')
          .eq('id', courseId)
          .single();

        if (course) {
          await supabaseServiceClient
            .from('courses')
            .update({ enrollment_count: Math.max(0, (course.enrollment_count || 0) + countChange) })
            .eq('id', courseId);
        }
      }
    }

    const statusMessages = {
      active: 'Enrollment reactivated',
      completed: 'Course marked as completed',
      dropped: 'Successfully dropped from course',
      suspended: 'Enrollment suspended'
    };

    return res.json({
      success: true,
      data: updatedEnrollment,
      message: status ? statusMessages[status as keyof typeof statusMessages] : 'Enrollment updated'
    });
  } catch (error: any) {
    console.error('Failed to update enrollment:', error);
    return res.status(500).json({ success: false, error: 'Failed to update enrollment' });
  }
});

// Get course enrollment statistics (moderators only)
router.get('/courses/:courseId/enrollment-stats', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    // Check if course exists and user has permissions
    const { data: course, error: courseError } = await supabaseServiceClient
      .from('courses')
      .select('id, title, author_id')
      .eq('id', courseId)
      .single();

    if (courseError) {
      if (courseError.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Course not found' });
      }
      return res.status(500).json({ success: false, error: courseError.message });
    }

    // Check permissions (moderator or course author)
    const isModerator = hasContentPermissions(req.user.role);
    const isCourseAuthor = course.author_id === req.user.id;

    if (!isModerator && !isCourseAuthor) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to view enrollment statistics'
      });
    }

    // Get enrollment statistics
    const { data: enrollmentStats, error: statsError } = await supabaseServiceClient
      .from('course_enrollments')
      .select('status, progress_percentage, enrolled_at, completed_at')
      .eq('course_id', courseId);

    if (statsError) {
      return res.status(500).json({ success: false, error: statsError.message });
    }

    // Calculate statistics
    const stats = {
      total_enrollments: enrollmentStats.length,
      active_enrollments: enrollmentStats.filter(e => e.status === 'active').length,
      completed_enrollments: enrollmentStats.filter(e => e.status === 'completed').length,
      dropped_enrollments: enrollmentStats.filter(e => e.status === 'dropped').length,
      suspended_enrollments: enrollmentStats.filter(e => e.status === 'suspended').length,
      completion_rate: enrollmentStats.length > 0 
        ? Math.round((enrollmentStats.filter(e => e.status === 'completed').length / enrollmentStats.length) * 100)
        : 0,
      average_progress: enrollmentStats.length > 0
        ? Math.round(enrollmentStats.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) / enrollmentStats.length)
        : 0,
      recent_enrollments: enrollmentStats
        .filter(e => new Date(e.enrolled_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .length,
      recent_completions: enrollmentStats
        .filter(e => e.completed_at && new Date(e.completed_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .length
    };

    return res.json({
      success: true,
      data: {
        course: {
          id: course.id,
          title: course.title
        },
        statistics: stats
      }
    });
  } catch (error: any) {
    console.error('Failed to get enrollment statistics:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve enrollment statistics' });
  }
});

// Get all enrollments for a course (moderators only)
router.get('/courses/:courseId/enrollments', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      status,
      limit = '20',
      offset = '0'
    } = req.query;

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    // Check if course exists and user has permissions
    const { data: course, error: courseError } = await supabaseServiceClient
      .from('courses')
      .select('id, title, author_id')
      .eq('id', courseId)
      .single();

    if (courseError) {
      if (courseError.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Course not found' });
      }
      return res.status(500).json({ success: false, error: courseError.message });
    }

    // Check permissions (moderator or course author)
    const isModerator = hasContentPermissions(req.user.role);
    const isCourseAuthor = course.author_id === req.user.id;

    if (!isModerator && !isCourseAuthor) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to view course enrollments'
      });
    }

    let query = supabaseServiceClient
      .from('course_enrollments')
      .select(`
        id,
        enrolled_at,
        status,
        progress_percentage,
        completed_at,
        certificate_issued,
        last_accessed_at,
        users:profiles!course_enrollments_user_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('course_id', courseId);

    // Filter by status if provided
    if (status && ['active', 'completed', 'dropped', 'suspended'].includes(status as string)) {
      query = query.eq('status', status);
    }

    // Apply pagination and ordering
    const limitNum = Math.min(parseInt(limit as string, 10) || 20, 100);
    const offsetNum = parseInt(offset as string, 10) || 0;

    query = query
      .order('enrolled_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    const { data: enrollments, error, count } = await query;

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      data: {
        course: {
          id: course.id,
          title: course.title
        },
        enrollments: enrollments || []
      },
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: count || enrollments?.length || 0
      }
    });
  } catch (error: any) {
    console.error('Failed to get course enrollments:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve course enrollments' });
  }
});

export default router;