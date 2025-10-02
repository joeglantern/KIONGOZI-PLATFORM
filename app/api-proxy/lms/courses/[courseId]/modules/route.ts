import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || 'https://kiongozi-api.onrender.com/api/v1';

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params;

    console.log('🔍 [Course Modules GET] Debug Info:', {
      url: `${API_BASE_URL}/content/courses/${courseId}/modules`,
      courseId,
      hasAuth: !!request.headers.get('authorization')
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
      `${API_BASE_URL}/content/courses/${courseId}/modules`,
      {
        method: 'GET',
        headers,
      }
    );

    console.log('📡 [Course Modules GET] API Response:', {
      status: response.status,
      statusText: response.statusText
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ [Course Modules GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch course modules' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params;
    const body = await request.json();

    console.log('📝 [Course Modules POST] Debug Info:', {
      url: `${API_BASE_URL}/content/courses/${courseId}/modules`,
      courseId,
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
      `${API_BASE_URL}/content/courses/${courseId}/modules`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      }
    );

    console.log('📡 [Course Modules POST] API Response:', {
      status: response.status,
      statusText: response.statusText
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('❌ [Course Modules POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add module to course' },
      { status: 500 }
    );
  }
}
