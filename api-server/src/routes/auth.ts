import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { supabaseServiceClient } from '../config/supabase';

const router = Router();

// Supabase handles sign up / sign in on client/mobile using supabase-js
// Our API validates the JWT and exposes a simple profile endpoint
router.get('/profile', authenticateToken, (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

// Get current authenticated user with full profile data from database
router.get('/user', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!supabaseServiceClient) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const userId = req.user.id;

    // Get user's full profile from database
    const { data: profile, error: profileError } = await supabaseServiceClient
      .from('profiles')
      .select('id, email, first_name, last_name, full_name, avatar_url, role, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Failed to fetch user profile:', profileError);
      return res.status(404).json({
        success: false,
        error: 'User profile not found',
        details: profileError.message
      });
    }

    return res.json({
      success: true,
      data: profile
    });

  } catch (error: any) {
    console.error('Failed to get user profile:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve user profile',
      details: error.message
    });
  }
});

export default router;
