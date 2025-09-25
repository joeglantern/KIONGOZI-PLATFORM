import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { supabaseUserClient, supabaseServiceClient } from '../config/supabase';

const supabaseProjectRef = process.env.SUPABASE_URL?.split('https://')[1]?.split('.')[0];
const JWKS_URL = supabaseProjectRef
  ? `https://${supabaseProjectRef}.supabase.co/auth/v1/keys`
  : undefined;

let JWKS: ReturnType<typeof createRemoteJWKSet> | undefined;
if (JWKS_URL) {
  JWKS = createRemoteJWKSet(new URL(JWKS_URL));
}

export interface AuthUser {
  id: string;
  email?: string;
  role?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

async function verifySupabaseToken(token: string): Promise<AuthUser | null> {
  // 1) Try JWKS-based verification (RS256 projects)
  if (JWKS) {
    try {
      const { payload } = await jwtVerify(token, JWKS);
      const sub = (payload.sub as string) || '';
      const email = (payload as any).email || (payload as any)?.user_metadata?.email;
      const role = (payload as any).role || (payload as any)?.app_metadata?.role;
      if (sub) return { id: sub, email, role };
    } catch {
      // fallthrough to SDK verification
    }
  }

  // 2) Fallback: use Supabase auth.getUser(token) (works for HS256 and any setup)
  if (supabaseUserClient) {
    try {
      const { data, error } = await supabaseUserClient.auth.getUser(token);
      if (!error && data?.user) {
        const u = data.user;
        const email = u.email || (u.user_metadata as any)?.email;
        const role = (u.app_metadata as any)?.role;
        return { id: u.id, email, role };
      }
    } catch {
      // ignore
    }
  }

  return null;
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Token authentication middleware
  
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  
  if (!token) {
    res.status(401).json({ success: false, error: 'Access token required' });
    return;
  }

  const user = await verifySupabaseToken(token);

  if (!user) {
    res.status(401).json({ success: false, error: 'Invalid token' });
    return;
  }
  req.user = user;
  next();
  return;
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  if (token) {
    const user = await verifySupabaseToken(token);
    if (user) req.user = user;
  }
  next();
  return;
};

export const requireRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Role-based access control
    
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    // TEMPORARY FIX: Allow this specific admin user ID to bypass role check
    if (req.user.id === '7f732087-672f-49f0-ac48-2214cd8b890b') {
      req.user.role = 'admin';
      next();
      return;
    }

    // Get user's role from database since JWT might not have latest role
    if (supabaseServiceClient) {
      try {
        // Query user profile for role
        
        const { data: profiles, error } = await supabaseServiceClient
          .from('profiles')
          .select('role')
          .eq('id', req.user.id);

        const profile = profiles?.[0];

        if (error || !profile) {
          res.status(403).json({ success: false, error: 'User profile not found' });
          return;
        }

        const userRole = profile.role || 'user';

        if (!allowedRoles.includes(userRole)) {
          res.status(403).json({
            success: false,
            error: 'Insufficient permissions',
            required: allowedRoles,
            current: userRole
          });
          return;
        }
        // Update req.user with latest role
        req.user.role = userRole;
        next();
        return;
      } catch (error) {
        console.error('Role verification error:', error);
        res.status(500).json({ success: false, error: 'Role verification failed' });
        return;
      }
    }

    res.status(500).json({ success: false, error: 'Authentication service unavailable' });
    return;
  };
};
