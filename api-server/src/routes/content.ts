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

    if (!hasContentPermissions(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions to create modules' });
    }

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
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

    const { data: module, error: moduleError } = await supabaseServiceClient
      .from('learning_modules')
      .insert(moduleData)
      .select()
      .single();

    if (moduleError) {
      return res.status(500).json({ success: false, error: moduleError.message });
    }

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

export default router;