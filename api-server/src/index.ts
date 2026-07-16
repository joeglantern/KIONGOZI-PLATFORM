import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import healthRoutes from './routes/health';
import adminRoutes from './routes/admin';
import adminSecurityRoutes from './routes/admin-security';
import notificationRoutes from './routes/notifications';
import analyticsRoutes from './routes/analytics';
import websocketRoutes from './routes/websocket';
import userRoutes from './routes/user';
import contentRoutes from './routes/content';
import progressRoutes from './routes/progress';
import socialRoutes from './routes/social';
import followsRoutes from './routes/follows';
import profilesSocialRoutes from './routes/profiles-social';
import dmRoutes from './routes/dm';
import uploadRoutes from './routes/upload';
import reportsRoutes from './routes/reports';
import blocksRoutes from './routes/blocks';
import legalRoutes from './routes/legal';
import exportRoutes from './routes/export';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { securityMonitor } from './middleware/securityMonitor';
import { apiRateLimit, chatRateLimit, authRateLimit } from './middleware/rateLimiter';

// Import services
import SocketService from './services/socketService';
import NotificationService from './services/NotificationService';

const app = express();
app.set('trust proxy', 1); // 1 = trust first proxy (nginx)
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize Socket.IO service
const socketService = new SocketService(server);

// Give NotificationService a reference to io so it can emit real-time events
// without needing io threaded through every call site
NotificationService.setIo(socketService.getSocketServer());

// Make socket service available to routes
app.use((req: any, res, next) => {
  req.io = socketService.getSocketServer();
  req.socketService = socketService;
  next();
});

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Advanced security monitoring
app.use(securityMonitor.middleware());

// Global IP-based fallback limiter — generous limit, per-route limiters handle fine-grained control
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check route
app.use('/api/v1/health', healthRoutes);

// API routes — only chat and auth have strict per-route limits; everything else relies on the global limiter
app.use('/api/v1/auth', authRateLimit.middleware(), authRoutes);
app.use('/api/v1/chat', chatRateLimit.middleware(), chatRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/content', contentRoutes);
app.use('/api/v1/progress', progressRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/admin/security', adminSecurityRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/websocket', websocketRoutes);

// Social platform routes
app.use('/api/v1/social', socialRoutes);
app.use('/api/v1/social', followsRoutes);
app.use('/api/v1/social', profilesSocialRoutes);
app.use('/api/v1/social', reportsRoutes);
app.use('/api/v1/social', blocksRoutes);
app.use('/api/v1/dm', dmRoutes);
app.use('/api/v1/legal', legalRoutes);
app.use('/api/v1/user', exportRoutes);

// Upload routes (10 req/min is intentionally strict — prevents storage abuse)
const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Upload rate limit exceeded. Try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/v1/upload', uploadRateLimit, uploadRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Kiongozi Platform API Server',
    version: '1.0.0',
    status: 'running',
    documentation: '/api/v1/docs'
  });
});

// ─── Deep link support ───────────────────────────────────────────────────────

// Apple Universal Links verification file
app.get('/.well-known/apple-app-site-association', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    applinks: {
      details: [
        {
          appIDs: ['365BL78M2N.com.kiongozi.chat'],
          components: [{ '/': '/posts/*' }],
        },
      ],
    },
  });
});

// Android App Links verification file
app.get('/.well-known/assetlinks.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.kiongozi.mobile',
        // Get fingerprint from: eas credentials --platform android
        // or Play Console → App Integrity → App signing certificate
        sha256_cert_fingerprints: [
          process.env.ANDROID_SHA256_FINGERPRINT || 'REPLACE_WITH_SHA256_FINGERPRINT',
        ],
      },
    },
  ]);
});

// Web fallback for shared post links — tries to open app, falls back to stores
app.get('/posts/:id', (req, res) => {
  const postId = req.params.id;
  const ua = req.headers['user-agent'] || '';
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);

  const appStoreUrl = 'https://apps.apple.com/app/id6789518676';
  const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.kiongozi.mobile';
  const deepLink = `kiongozi://posts/${postId}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kiongozi — View Post</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #fff; min-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; }
  .logo { width: 72px; height: 72px; border-radius: 20px; background: #1a1a1a; border: 1px solid #2a2a2a; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; font-size: 36px; }
  h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
  p { color: #888; font-size: 15px; text-align: center; max-width: 280px; margin-bottom: 32px; line-height: 1.5; }
  .btn { display: block; width: 100%; max-width: 300px; padding: 15px 24px; border-radius: 14px; text-decoration: none; font-size: 16px; font-weight: 600; text-align: center; margin-bottom: 12px; transition: opacity 0.15s; }
  .btn:active { opacity: 0.75; }
  .btn-primary { background: #5CB85C; color: #fff; }
  .btn-secondary { background: #1a1a1a; color: #fff; border: 1px solid #333; }
  .divider { color: #444; font-size: 13px; margin: 8px 0 20px; }
</style>
</head>
<body>
<div class="logo">🇰🇪</div>
<h1>Open in Kiongozi</h1>
<p>Kenya's civic social network. Download the app to view and join the conversation.</p>
${isIOS ? `
<a href="${deepLink}" class="btn btn-primary" id="openBtn">Open in App</a>
<div class="divider">— or download —</div>
<a href="${appStoreUrl}" class="btn btn-secondary">Download on App Store</a>
` : isAndroid ? `
<a href="${deepLink}" class="btn btn-primary" id="openBtn">Open in App</a>
<div class="divider">— or download —</div>
<a href="${playStoreUrl}" class="btn btn-secondary">Get it on Play Store</a>
` : `
<a href="${appStoreUrl}" class="btn btn-primary">Download on App Store</a>
<a href="${playStoreUrl}" class="btn btn-secondary">Get it on Play Store</a>
`}
<script>
  var btn = document.getElementById('openBtn');
  if (btn) {
    // After 1.5s with no app response, the button is already clicked; page stays visible
    setTimeout(function() {
      btn.textContent = 'App not installed?';
    }, 2000);
  }
</script>
</body>
</html>`);
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Kiongozi API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/v1/health`);
  console.log(`🔌 WebSocket server ready for real-time connections`);
});

export default app;

