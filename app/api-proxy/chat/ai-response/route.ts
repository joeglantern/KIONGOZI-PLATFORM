import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3002/api/v1';

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || '';
    const body = await req.json();
    const userAgent = req.headers.get('user-agent') || 'Kiongozi-Frontend/1.0';

    const res = await fetch(`${API_BASE}/chat/ai-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify(body),
      cache: 'no-store'
    });

    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json'
      }
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e?.message || 'Proxy error'
    }, { status: 500 });
  }
}