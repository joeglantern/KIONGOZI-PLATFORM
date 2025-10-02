import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || 'https://kiongozi-api.onrender.com/api/v1';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    console.log('🔍 [LMS Courses GET] Debug Info:', {
      url: `${API_BASE_URL}/content/courses${queryString ? `?${queryString}` : ''}`,
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
      `${API_BASE_URL}/content/courses${queryString ? `?${queryString}` : ''}`,
      {
        method: 'GET',
        headers,
      }
    );

    console.log('📡 [LMS Courses GET] API Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    const data = await response.json();
    console.log('📦 [LMS Courses GET] Response Data:', data);

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ [LMS Courses GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('📝 [LMS Courses POST] Debug Info:', {
      url: `${API_BASE_URL}/content/courses`,
      hasAuth: !!request.headers.get('authorization'),
      bodyKeys: Object.keys(body)
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
      `${API_BASE_URL}/content/courses`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      }
    );

    console.log('📡 [LMS Courses POST] API Response:', {
      status: response.status,
      statusText: response.statusText
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('❌ [LMS Courses POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create course' },
      { status: 500 }
    );
  }
}
