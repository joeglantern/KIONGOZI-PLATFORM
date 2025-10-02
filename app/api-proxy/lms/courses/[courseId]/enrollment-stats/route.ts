import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || 'https://kiongozi-api.onrender.com/api/v1';

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params;

    console.log('🔍 [Course Enrollment Stats GET] Debug Info:', {
      url: `${API_BASE_URL}/content/courses/${courseId}/enrollment-stats`,
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
      `${API_BASE_URL}/content/courses/${courseId}/enrollment-stats`,
      {
        method: 'GET',
        headers,
      }
    );

    console.log('📡 [Course Enrollment Stats GET] API Response:', {
      status: response.status,
      statusText: response.statusText
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ [Course Enrollment Stats GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch course enrollment statistics' },
      { status: 500 }
    );
  }
}
