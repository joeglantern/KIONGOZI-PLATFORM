import { Router } from 'express';
import { supabaseServiceClient } from '../config/supabase';
import { prisma } from '../config/prisma';

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

// Fallback used when no config has been saved yet (or the DB is unreachable) —
// mobile apps check this on every startup, so it must never 500
export const APP_CONFIG_DEFAULTS = {
  android: {
    min_version_code: 11,
    force_update_required: true,
    store_url: 'https://play.google.com/store/apps/details?id=com.kiongozi.mobile',
    current_version: '1.0.0',
  },
  ios: {
    min_build_number: 12,
    force_update_required: false,
    store_url: 'https://apps.apple.com/app/id6789518676',
    current_version: '1.0.0',
  },
  force_update_message: 'A new version of Kiongozi is available with important updates. Please update to continue.',
};

// GET /api/v1/health/app-config — minimum version requirements, checked on app startup.
// Values live in system_settings (category 'app_config') and are managed from the
// admin panel via PATCH /api/v1/admin/app-config.
router.get('/app-config', async (_req, res) => {
  try {
    const row = await prisma.system_settings.findFirst({
      where: { category: 'app_config', setting_key: 'config' },
    });
    const stored = (row?.setting_value as any) ?? {};
    res.json({
      success: true,
      data: {
        ...APP_CONFIG_DEFAULTS,
        ...stored,
        android: { ...APP_CONFIG_DEFAULTS.android, ...(stored.android ?? {}) },
        ios: { ...APP_CONFIG_DEFAULTS.ios, ...(stored.ios ?? {}) },
      },
    });
  } catch (error) {
    console.error('app-config fetch failed, serving defaults:', error);
    res.json({ success: true, data: APP_CONFIG_DEFAULTS });
  }
});

export default router;
