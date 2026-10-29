// Crash reports first, so Sentry can see every request
import { Sentry } from './instrument';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

// Validate env immediately — missing vars produce a loud startup banner
import { validateEnvOnBoot } from './config/validateEnv';
validateEnvOnBoot();

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
import devBridgeRoutes from './routes/devBridge';
import uploadRoutes from './routes/upload';
import reportsRoutes from './routes/reports';
import blocksRoutes from './routes/blocks';
import storiesRoutes from './routes/stories';
import growthRoutes from './routes/growth';
import adsRoutes, { adsAdminRoutes } from './routes/ads';
import assistRoutes from './routes/assist';
import barazaRoutes from './routes/baraza';
import sessionsRoutes from './routes/sessions';
import funnelRoutes from './routes/funnel';
import { startWeeklyRecapJob } from './jobs/weeklyRecapPush';
import { startStoryCountdownJob } from './jobs/storyCountdownReminders';
import legalRoutes from './routes/legal';
import exportRoutes from './routes/export';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import shareRoutes from './routes/share';
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
const DEV_ORIGINS = ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:5174'];
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()) || DEV_ORIGINS,
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
app.use('/api/v1/user', sessionsRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/content', contentRoutes);
app.use('/api/v1/progress', progressRoutes);
app.use('/api/v1/admin/ads', adsAdminRoutes);
app.use('/api/v1/admin/funnel', funnelRoutes);
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
app.use('/api/v1/social', storiesRoutes);
app.use('/api/v1/social', growthRoutes);
app.use('/api/v1/ads', adsRoutes);
app.use('/api/v1/assist', assistRoutes);
app.use('/api/v1/baraza', barazaRoutes);
// Ad creatives (immutable files, cached hard)
app.use('/ads-media', express.static(require('path').join(process.cwd(), 'assets', 'ads'), { maxAge: '30d', immutable: true }));
app.use('/api/v1/dm', dmRoutes);
app.use('/api/v1/dev-bridge', devBridgeRoutes);
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
          components: [{ '/': '/posts/*' }, { '/': '/u/*' }],
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

// Shared links: post/profile landing pages + link-preview images (routes/share.ts)
app.use('/', shareRoutes);

// Error handling middleware
app.use(notFoundHandler);
// Send server errors (5xx) to Sentry, then answer as before
if (process.env.SENTRY_DSN) Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);

// Start server
startWeeklyRecapJob();
startStoryCountdownJob();

server.listen(PORT, () => {
  console.log(`🚀 Kiongozi API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/v1/health`);
  console.log(`🔌 WebSocket server ready for real-time connections`);
});

export default app;

