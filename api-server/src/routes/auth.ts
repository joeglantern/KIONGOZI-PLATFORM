import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Supabase handles sign up / sign in on client/mobile using supabase-js
// Our API validates the JWT and exposes a simple profile endpoint
router.get('/profile', authenticateToken, (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

export default router;
