import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../config/prisma';

const router = Router();

// Supabase handles sign up / sign in on client/mobile using supabase-js
// Our API validates the JWT and exposes a simple profile endpoint
router.get('/profile', authenticateToken, (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

router.get('/user', authenticateToken, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const profile = await prisma.profiles.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        full_name: true,
        avatar_url: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!profile) {
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }

    return res.json({ success: true, data: profile });
  } catch (error: any) {
    console.error('Failed to get user profile:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve user profile', details: error.message });
  }
});

export default router;
