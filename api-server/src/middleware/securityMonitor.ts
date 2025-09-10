import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SecurityThresholds {
  suspiciousPatterns: RegExp[];
  blockedUserAgents: RegExp[];
  maxRequestSize: number;
  suspiciousIPs: Set<string>;
}

class SecurityMonitor {
  private thresholds: SecurityThresholds;
  private recentAttacks: Map<string, number> = new Map();

  constructor() {
    this.thresholds = {
      suspiciousPatterns: [
        /\b(SELECT.*FROM|INSERT.*INTO|DELETE.*FROM|DROP.*TABLE|UNION.*SELECT)\b/i,
        /<script|javascript:|onload=|onerror=/i,
        /\.\.\/|\.\.\\/, 
        /\b(eval|setTimeout|setInterval)\s*\(/i,
        /\b(cmd|exec|system|shell_exec)\b/i
      ],
      blockedUserAgents: [
        /bot|crawler|spider|scraper/i,
        /python-requests|php|java/i
      ],
      maxRequestSize: 10 * 1024 * 1024,
      suspiciousIPs: new Set()
    };

    setInterval(() => this.cleanupAttackRecords(), 60 * 60 * 1000);
  }

  private cleanupAttackRecords() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [key, timestamp] of this.recentAttacks.entries()) {
      if (timestamp < oneHourAgo) {
        this.recentAttacks.delete(key);
      }
    }
  }

  private async logSecurityEvent(
    level: 'info' | 'warning' | 'error',
    category: string,
    message: string,
    req: Request,
    details?: any
  ) {
    try {
      await supabase.from('system_logs').insert({
        level,
        category: 'security',
        message: `[${category}] ${message}`,
        details: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          method: req.method,
          path: req.path,
          userId: (req as any).user?.id,
          timestamp: new Date().toISOString(),
          ...details
        },
        user_id: (req as any).user?.id || null
      });

      // Send real-time security alerts for high-severity events
      if (level === 'error' && (req as any).socketService) {
        const socketService = (req as any).socketService;
        socketService.sendSecurityAlert({
          category,
          message,
          level,
          ip: req.ip,
          timestamp: new Date().toISOString(),
          details
        });
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  private checkSuspiciousContent(content: string): string[] {
    const violations = [];
    
    for (const pattern of this.thresholds.suspiciousPatterns) {
      if (pattern.test(content)) {
        violations.push(`Suspicious pattern detected: ${pattern.source}`);
      }
    }
    
    return violations;
  }

  private isBlockedUserAgent(userAgent: string): boolean {
    if (!userAgent) return true;
    
    // Allow our official frontend user agent
    if (userAgent === 'Kiongozi-Frontend/1.0') return false;
    
    return this.thresholds.blockedUserAgents.some(pattern => 
      pattern.test(userAgent)
    );
  }

  private trackAttackPattern(identifier: string): number {
    const key = `attack:${identifier}`;
    const count = (this.recentAttacks.get(key) || 0) + 1;
    this.recentAttacks.set(key, Date.now());
    return count;
  }

  async checkRequest(req: Request): Promise<{
    allowed: boolean;
    reason?: string;
    severity: 'low' | 'medium' | 'high';
  }> {
    const ip = req.ip || 'unknown';
    const userAgent = req.get('User-Agent') || '';
    
    // Allow localhost/development requests
    const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.includes('localhost');
    if (isLocalhost && process.env.NODE_ENV === 'development') {
      return { allowed: true, severity: 'low' };
    }
    
    // Skip IP blocking for production to allow all users
    // Only block IPs in development or if explicitly enabled
    if (process.env.ENABLE_IP_BLOCKING === 'true') {
      if (this.thresholds.suspiciousIPs.has(ip)) {
        await this.logSecurityEvent('error', 'BLOCKED_IP', `Request from blacklisted IP: ${ip}`, req);
        return { allowed: false, reason: 'IP address blocked', severity: 'high' };
      }
    }

    if (this.isBlockedUserAgent(userAgent)) {
      await this.logSecurityEvent('warning', 'SUSPICIOUS_UA', `Blocked suspicious user agent: ${userAgent}`, req);
      return { allowed: false, reason: 'Suspicious user agent', severity: 'medium' };
    }

    const contentLength = parseInt(req.get('Content-Length') || '0');
    if (contentLength > this.thresholds.maxRequestSize) {
      await this.logSecurityEvent('warning', 'LARGE_REQUEST', `Request too large: ${contentLength} bytes`, req, { size: contentLength });
      return { allowed: false, reason: 'Request too large', severity: 'medium' };
    }

    let requestContent = '';
    if (req.body) {
      requestContent = JSON.stringify(req.body);
    }
    if (req.query) {
      requestContent += JSON.stringify(req.query);
    }

    const violations = this.checkSuspiciousContent(requestContent + req.path);
    if (violations.length > 0) {
      await this.logSecurityEvent('warning', 'SUSPICIOUS_CONTENT', 'Suspicious content detected', req, { violations });
      
      const attackCount = this.trackAttackPattern(ip);
      if (attackCount > 3) {
        this.thresholds.suspiciousIPs.add(ip);
        await this.logSecurityEvent('error', 'AUTO_BLOCK', `IP auto-blocked after ${attackCount} suspicious requests`, req);
      }
      
      return { allowed: false, reason: 'Suspicious content detected', severity: 'high' };
    }

    const recentRequestKey = `requests:${ip}`;
    const recentRequests = this.recentAttacks.get(recentRequestKey) || 0;
    if (recentRequests > 50) {
      await this.logSecurityEvent('warning', 'RAPID_REQUESTS', `Rapid requests from IP: ${ip}`, req, { count: recentRequests });
      return { allowed: false, reason: 'Too many rapid requests', severity: 'medium' };
    }

    return { allowed: true, severity: 'low' };
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const securityCheck = await this.checkRequest(req);
        
        if (!securityCheck.allowed) {
          return res.status(403).json({
            error: 'Request blocked for security reasons',
            reason: securityCheck.reason,
            timestamp: new Date().toISOString()
          });
        }

        if (req.path.includes('/admin') || req.path.includes('/api/v1/chat')) {
          await this.logSecurityEvent('info', 'ACCESS_GRANTED', `Access granted to ${req.path}`, req);
        }

        next();
        return;
      } catch (error) {
        console.error('Security middleware error:', error);
        await this.logSecurityEvent('error', 'MIDDLEWARE_ERROR', 'Security middleware failed', req, { error: (error as Error).message });
        next();
        return;
      }
    };
  }

  async blockIP(ip: string, reason: string): Promise<void> {
    this.thresholds.suspiciousIPs.add(ip);
    await supabase.from('system_logs').insert({
      level: 'warning',
      category: 'security',
      message: `IP manually blocked: ${ip}`,
      details: { ip, reason, blockedBy: 'admin', timestamp: new Date().toISOString() }
    });
  }

  async unblockIP(ip: string): Promise<void> {
    this.thresholds.suspiciousIPs.delete(ip);
    await supabase.from('system_logs').insert({
      level: 'info',
      category: 'security', 
      message: `IP manually unblocked: ${ip}`,
      details: { ip, unblockedBy: 'admin', timestamp: new Date().toISOString() }
    });
  }

  getSecurityStats() {
    return {
      blockedIPs: Array.from(this.thresholds.suspiciousIPs),
      recentAttacks: this.recentAttacks.size,
      suspiciousPatterns: this.thresholds.suspiciousPatterns.length,
      blockedUserAgents: this.thresholds.blockedUserAgents.length
    };
  }
}

export const securityMonitor = new SecurityMonitor();
export default securityMonitor;