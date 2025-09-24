import { NextRequest, NextResponse } from 'next/server';

// Use server-side environment variable (not exposed to client)
const API_BASE = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || 'https://kiongozi-api.onrender.com/api/v1';
const REQUEST_TIMEOUT = 30000; // 30 seconds

export async function POST(req: NextRequest) {
  try {
    // Input validation
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body'
      }, { status: 400 });
    }

    // Validate required fields
    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Message is required and must be a string'
      }, { status: 400 });
    }

    const auth = req.headers.get('authorization') || '';
    if (!auth) {
      return NextResponse.json({
        success: false,
        error: 'Authorization header is required'
      }, { status: 401 });
    }

    const userAgent = req.headers.get('user-agent') || 'Kiongozi-Frontend/1.0';

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const res = await fetch(`${API_BASE}/chat/ai-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': userAgent,
          'Authorization': auth,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        cache: 'no-store'
      });

      clearTimeout(timeoutId);

      // Handle different response types properly
      const contentType = res.headers.get('content-type');
      let data: any;

      if (contentType?.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      return new NextResponse(typeof data === 'string' ? data : JSON.stringify(data), {
        status: res.status,
        headers: {
          'Content-Type': contentType || 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      });

    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          error: 'Request timeout'
        }, { status: 408 });
      }

      throw fetchError;
    }

  } catch (error: any) {
    console.error('API Proxy Error:', error);

    return NextResponse.json({
      success: false,
      error: 'Internal proxy error',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    }, { status: 500 });
  }
}