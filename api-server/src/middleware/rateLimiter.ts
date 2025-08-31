import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
  skipSuccessfulRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
    blocked: boolean;
    suspiciousActivity: number;
  };
}

class AdvancedRateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  private getKey(req: Request): string {
    const userId = (req as any).user?.id;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return userId ? `user:${userId}` : `ip:${ip}`;
  }

  private async logSuspiciousActivity(req: Request, reason: string) {
    try {
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      const userId = (req as any).user?.id;

      await supabase.from('system_logs').insert({
        level: 'warning',
        category: 'security',
        message: `Rate limit violation: ${reason}`,
        details: {
          ip,
          userAgent,
          userId,
          path: req.path,
          method: req.method,
          timestamp: new Date().toISOString()
        },
        user_id: userId || null
      });

      const key = this.getKey(req);
      if (this.store[key]) {
        this.store[key].suspiciousActivity++;
        
        if (this.store[key].suspiciousActivity >= 5) {
          this.store[key].blocked = true;
          await this.logSecurityAlert(req, 'Auto-blocked due to repeated violations');
        }
      }
    } catch (error) {
      console.error('Failed to log suspicious activity:', error);
    }
  }

  private async logSecurityAlert(req: Request, reason: string) {
    try {
      await supabase.from('system_logs').insert({
        level: 'error',
        category: 'security',
        message: `SECURITY ALERT: ${reason}`,
        details: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          userId: (req as any).user?.id,
          path: req.path,
          method: req.method,
          severity: 'HIGH'
        }
      });
    } catch (error) {
      console.error('Failed to log security alert:', error);
    }
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const key = this.getKey(req);
      const now = Date.now();

      if (!this.store[key]) {
        this.store[key] = {
          count: 0,
          resetTime: now + this.config.windowMs,
          blocked: false,
          suspiciousActivity: 0
        };
      }

      const record = this.store[key];

      if (record.blocked) {
        await this.logSuspiciousActivity(req, 'Request from blocked client');
        return res.status(429).json({
          error: 'Access temporarily blocked due to suspicious activity',
          retryAfter: Math.ceil((record.resetTime - now) / 1000)
        });
      }

      if (now > record.resetTime) {
        record.count = 0;
        record.resetTime = now + this.config.windowMs;
        record.suspiciousActivity = Math.max(0, record.suspiciousActivity - 1);
      }

      if (record.count >= this.config.maxRequests) {
        await this.logSuspiciousActivity(req, `Rate limit exceeded: ${record.count} requests in window`);
        
        return res.status(429).json({
          error: this.config.message,
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
          limit: this.config.maxRequests,
          windowMs: this.config.windowMs
        });
      }

      record.count++;

      res.set({
        'X-RateLimit-Limit': this.config.maxRequests.toString(),
        'X-RateLimit-Remaining': (this.config.maxRequests - record.count).toString(),
        'X-RateLimit-Reset': new Date(record.resetTime).toISOString()
      });

      next();
      return;
    };
  }

  async unblock(identifier: string): Promise<boolean> {
    const keys = Object.keys(this.store).filter(key => key.includes(identifier));
    keys.forEach(key => {
      if (this.store[key]) {
        this.store[key].blocked = false;
        this.store[key].suspiciousActivity = 0;
      }
    });
    return keys.length > 0;
  }

  getStats() {
    const stats = {
      totalEntries: Object.keys(this.store).length,
      blockedClients: 0,
      suspiciousClients: 0,
      activeRequests: 0
    };

    Object.values(this.store).forEach(record => {
      if (record.blocked) stats.blockedClients++;
      if (record.suspiciousActivity > 0) stats.suspiciousClients++;
      stats.activeRequests += record.count;
    });

    return stats;
  }
}

export const chatRateLimit = new AdvancedRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  message: 'Too many chat messages. Please slow down and try again.'
});

export const apiRateLimit = new AdvancedRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  message: 'Too many API requests. Please wait before making more requests.'
});

export const authRateLimit = new AdvancedRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many authentication attempts. Please wait 15 minutes.'
});

export const adminRateLimit = new AdvancedRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 50,
  message: 'Admin rate limit exceeded. Please wait.'
});

export { AdvancedRateLimiter };