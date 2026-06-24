import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://kiongozi-api.onrender.com/api/v1';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const auth = req.headers.get('authorization') || '';

    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {})
      },
      body,
      cache: 'no-store'
    });

    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' }
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Proxy error' }, { status: 500 });
  }
}
