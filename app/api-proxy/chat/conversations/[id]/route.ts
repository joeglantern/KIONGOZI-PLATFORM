import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || 'https://kiongozi-api.onrender.com/api/v1';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = req.headers.get('authorization') || '';
    const userAgent = req.headers.get('user-agent') || 'Kiongozi-Frontend/1.0';
    const body = await req.json();
    const res = await fetch(`${API_BASE}/chat/conversations/${params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
        ...(auth ? { Authorization: auth } : {})
      },
      body: JSON.stringify(body),
      cache: 'no-store'
    });
    const data = await res.text();
    return new NextResponse(data, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Proxy error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = req.headers.get('authorization') || '';
    const userAgent = req.headers.get('user-agent') || 'Kiongozi-Frontend/1.0';
    const res = await fetch(`${API_BASE}/chat/conversations/${params.id}`, {
      method: 'DELETE',
      headers: {
        'User-Agent': userAgent,
        ...(auth ? { Authorization: auth } : {})
      },
      cache: 'no-store'
    });
    const data = await res.text();
    return new NextResponse(data, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Proxy error' }, { status: 500 });
  }
}

