import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3002/api/v1';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = req.headers.get('authorization') || '';
    const { searchParams } = new URL(req.url);
    const qp = searchParams.toString();
    const res = await fetch(`${API_BASE}/chat/conversations/${params.id}/messages${qp ? `?${qp}` : ''}`, {
      headers: { ...(auth ? { Authorization: auth } : {}) },
      cache: 'no-store'
    });
    const data = await res.text();
    return new NextResponse(data, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Proxy error' }, { status: 500 });
  }
}

