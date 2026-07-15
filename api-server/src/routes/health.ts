import { Router } from 'express';
import { supabaseServiceClient } from '../config/supabase';

const router = Router();

// Basic health check
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Detailed health check with database connectivity
router.get('/detailed', async (_req, res) => {
  const healthCheck: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    pid: process.pid,
    nodeVersion: process.version,
    platform: process.platform,
    services: {
      database: 'checking...'
    }
  };

  // Test database connectivity
  try {
    if (supabaseServiceClient) {
      const { error } = await supabaseServiceClient
        .from('profiles')
        .select('count(*)', { count: 'exact', head: true });
      
      if (error) {
        healthCheck.services.database = 'unhealthy';
        healthCheck.status = 'degraded';
        healthCheck.errors = healthCheck.errors || [];
        healthCheck.errors.push(`Database error: ${error.message}`);
      } else {
        healthCheck.services.database = 'healthy';
      }
    } else {
      healthCheck.services.database = 'not configured';
      healthCheck.status = 'degraded';
    }
  } catch (error: any) {
    healthCheck.services.database = 'error';
    healthCheck.status = 'unhealthy';
    healthCheck.errors = healthCheck.errors || [];
    healthCheck.errors.push(`Database connection failed: ${error.message}`);
  }

  const statusCode = healthCheck.status === 'healthy' ? 200 : 
                    healthCheck.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(healthCheck);
});

// GET /api/v1/health/app-config — minimum version requirements, checked on app startup
// To force an update: bump android.min_version_code or ios.min_build_number, then restart PM2
router.get('/app-config', (_req, res) => {
  res.json({
    success: true,
    data: {
      android: {
        min_version_code: 11,
        store_url: 'https://play.google.com/store/apps/details?id=com.kiongozi.chat',
      },
      ios: {
        min_build_number: 9,
        store_url: 'https://apps.apple.com/app/id6789518676',
      },
      force_update_message: 'A new version of Kiongozi is available with important updates. Please update to continue.',
    },
  });
});

export default router;

