import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || 'https://kiongozi-api.onrender.com/api/v1';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [LMS Categories GET] Debug Info:', {
      url: `${API_BASE_URL}/content/categories`,
      userAgent: request.headers.get('user-agent'),
      clientIP: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      hasAuth: !!request.headers.get('authorization'),
      authHeader: request.headers.get('authorization') ? 'Bearer ' + request.headers.get('authorization')?.substring(0, 20) + '...' : 'none'
    });

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Forward authorization header if present
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(
      `${API_BASE_URL}/content/categories`,
      {
        method: 'GET',
        headers,
      }
    );

    console.log('📡 [LMS Categories GET] API Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    const data = await response.json();
    console.log('📦 [LMS Categories GET] Response Data:', data);

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ [LMS Categories GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}