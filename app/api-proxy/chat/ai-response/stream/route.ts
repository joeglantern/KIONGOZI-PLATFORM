import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || 'https://kiongozi-api.onrender.com/api/v1';

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

    // Make streaming request to API server
    const response = await fetch(`${API_BASE}/chat/ai-response/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
        'Authorization': auth,
      },
      body: JSON.stringify(body),
      cache: 'no-store'
    });

    // Check if the response is an error (non-streaming)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json(errorData, { status: response.status });
    }

    // Forward the SSE stream to the client
    const stream = response.body;
    if (!stream) {
      return NextResponse.json({
        success: false,
        error: 'No response stream available'
      }, { status: 500 });
    }

    // Return the stream with proper SSE headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });

  } catch (error: any) {
    console.error('Streaming API Proxy Error:', error);

    return NextResponse.json({
      success: false,
      error: 'Internal proxy error',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    }, { status: 500 });
  }
}
