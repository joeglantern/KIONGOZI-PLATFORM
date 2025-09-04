import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Simple approach: Check for auth session cookie
  const sessionCookie = req.cookies.get('sb-access-token') || 
                       req.cookies.get('supabase-auth-token') ||
                       req.cookies.get('sb-auth-token');
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login'];
  const isPublicRoute = publicRoutes.some(route => req.nextUrl.pathname.startsWith(route));

  // If no session cookie and trying to access protected route, redirect to login
  if (!sessionCookie && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Allow all other requests to proceed
  // The individual pages will handle admin role verification
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};