import { Router, Request, Response } from 'express';

const router = Router();

const LEGAL = {
  privacy_policy: {
    title: 'Privacy Policy',
    url: 'https://chat.kiongozi.org/privacy-policy',
    version: '1.0',
    updated: '2026-03-13',
  },
  terms_of_service: {
    title: 'Terms of Service',
    url: 'https://chat.kiongozi.org/terms',
    version: '1.0',
    updated: '2026-03-13',
  },
};

// GET /api/v1/legal
router.get('/', (req: Request, res: Response) => {
  res.json({ success: true, data: LEGAL });
});

export default router;
