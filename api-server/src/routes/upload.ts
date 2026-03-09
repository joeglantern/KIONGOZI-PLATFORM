import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import UploadService from '../services/UploadService';
import multer from 'multer';

const router = Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'));
    }
  }
});

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files allowed'));
    }
  }
});

// POST /api/v1/upload/image
router.post('/image', authenticateToken, imageUpload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No image file provided' });
      return;
    }

    const userId = req.user!.id;
    const storagePath = `posts/${userId}/${Date.now()}_${req.file.originalname.replace(/\s/g, '_')}`;

    const result = await UploadService.uploadFile(req.file.buffer, req.file.mimetype, storagePath);

    res.status(201).json({
      success: true,
      data: {
        url: result.url,
        storage_path: result.storagePath,
        media_type: 'image',
        size: req.file.size
      }
    });
  } catch (err: any) {
    console.error('Image upload error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to upload image' });
  }
});

// POST /api/v1/upload/video
router.post('/video', authenticateToken, videoUpload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No video file provided' });
      return;
    }

    const userId = req.user!.id;
    const storagePath = `posts/videos/${userId}/${Date.now()}_${req.file.originalname.replace(/\s/g, '_')}`;

    const result = await UploadService.uploadFile(req.file.buffer, req.file.mimetype, storagePath);

    res.status(201).json({
      success: true,
      data: {
        url: result.url,
        storage_path: result.storagePath,
        media_type: 'video',
        size: req.file.size
      }
    });
  } catch (err: any) {
    console.error('Video upload error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to upload video' });
  }
});

// DELETE /api/v1/upload/:path
router.delete('/:storagePath(*)', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { storagePath } = req.params;
    const userId = req.user!.id;

    // Only allow deleting own files (path must start with posts/{userId}/ or avatars/{userId}_)
    if (!storagePath.includes(userId)) {
      res.status(403).json({ success: false, error: 'Unauthorized to delete this file' });
      return;
    }

    await UploadService.deleteFile(storagePath);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to delete file' });
  }
});

export default router;
