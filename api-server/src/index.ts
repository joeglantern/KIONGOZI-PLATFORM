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

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { securityMonitor } from './middleware/securityMonitor';
import { apiRateLimit, chatRateLimit, authRateLimit } from './middleware/rateLimiter';

// Import services
import SocketService from './services/socketService';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize Socket.IO service
const socketService = new SocketService(server);

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

// Basic rate limiting as fallback
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '200'),
  message: {
    error: 'Too many requests from this IP, please try again later.'
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

// API routes with specific rate limiting
app.use('/api/v1/auth', authRateLimit.middleware(), authRoutes);
app.use('/api/v1/chat', chatRateLimit.middleware(), chatRoutes);
app.use('/api/v1/user', apiRateLimit.middleware(), userRoutes);
app.use('/api/v1/content', apiRateLimit.middleware(), contentRoutes);
app.use('/api/v1/progress', apiRateLimit.middleware(), progressRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/admin/security', adminSecurityRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/websocket', websocketRoutes);

// General API routes
app.use('/api/v1', apiRateLimit.middleware());

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Kiongozi Platform API Server',
    version: '1.0.0',
    status: 'running',
    documentation: '/api/v1/docs'
  });
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

