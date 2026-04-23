import { NextRequest, NextResponse } from 'next/server';
import { authorizeModuleContentAccess } from '@/lib/learning/access';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ courseId: string; moduleId: string }> }
) {
    try {
        const { courseId, moduleId } = await params;
        const access = await authorizeModuleContentAccess(request, courseId, moduleId);
        if ('error' in access) {
            return access.error;
        }

        return NextResponse.json({
            course: access.course,
            module: access.module,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to load module' }, { status: 500 });
    }
}
