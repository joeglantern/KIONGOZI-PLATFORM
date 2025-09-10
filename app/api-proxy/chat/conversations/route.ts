import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3002/api/v1';

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || '';
    const { searchParams } = new URL(req.url);
    const qp = searchParams.toString();
    const userAgent = req.headers.get('user-agent') || 'Kiongozi-Frontend/1.0';
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    console.log('🔍 [CONVERSATIONS GET] Debug Info:', {
      url: `${API_BASE}/chat/conversations${qp ? `?${qp}` : ''}`,
      userAgent,
      clientIP,
      hasAuth: !!auth,
      authHeader: auth ? auth.substring(0, 20) + '...' : 'none',
      allHeaders: Object.fromEntries(req.headers.entries())
    });
    
    const res = await fetch(`${API_BASE}/chat/conversations${qp ? `?${qp}` : ''}`, {
      headers: { 
        'User-Agent': userAgent,
        'X-Forwarded-For': clientIP,
        'X-Real-IP': clientIP,
        ...(auth ? { Authorization: auth } : {}) 
      },
      cache: 'no-store'
    });
    
    console.log('📡 [CONVERSATIONS GET] API Response:', {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries())
    });
    
    const data = await res.text();
    console.log('📦 [CONVERSATIONS GET] Response Data:', data.substring(0, 200) + '...');
    
    return new NextResponse(data, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } });
  } catch (e: any) {
    console.error('❌ [CONVERSATIONS GET] Error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Proxy error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  return NextResponse.json({ error: 'Use /api-proxy/chat/conversations/[id]' }, { status: 400 });
}

