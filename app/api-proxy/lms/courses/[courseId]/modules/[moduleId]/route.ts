import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || 'https://kiongozi-api.onrender.com/api/v1';

export async function PUT(
  request: NextRequest,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  try {
    const { courseId, moduleId } = params;
    const body = await request.json();

    console.log('📝 [Course Module PUT] Debug Info:', {
      url: `${API_BASE_URL}/content/courses/${courseId}/modules/${moduleId}`,
      courseId,
      moduleId,
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
      `${API_BASE_URL}/content/courses/${courseId}/modules/${moduleId}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      }
    );

    console.log('📡 [Course Module PUT] API Response:', {
      status: response.status,
      statusText: response.statusText
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ [Course Module PUT] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update course module' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  try {
    const { courseId, moduleId } = params;

    console.log('🗑️ [Course Module DELETE] Debug Info:', {
      url: `${API_BASE_URL}/content/courses/${courseId}/modules/${moduleId}`,
      courseId,
      moduleId,
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
      `${API_BASE_URL}/content/courses/${courseId}/modules/${moduleId}`,
      {
        method: 'DELETE',
        headers,
      }
    );

    console.log('📡 [Course Module DELETE] API Response:', {
      status: response.status,
      statusText: response.statusText
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ [Course Module DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove module from course' },
      { status: 500 }
    );
  }
}
