import { NextRequest, NextResponse } from 'next/server';
import { authorizeScormPackageAccess } from '@/lib/scorm/access';

// GET, return existing registration (or create one) for the current user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ packageId: string }> }
) {
  try {
    const { packageId } = await params;
    const access = await authorizeScormPackageAccess(request, packageId);
    if ('error' in access) {
      return access.error;
    }

    const { serviceClient, user, pkg, isPrivileged } = access;

    // SCORM 1.2 cmi.core.student_name is "Last, First"; packages show it.
    const { data: learner } = await serviceClient
      .from('profiles')
      .select('first_name, last_name, username')
      .eq('id', user.id)
      .maybeSingle();
    const learnerName =
      [learner?.last_name, learner?.first_name].filter(Boolean).join(', ') ||
      learner?.username ||
      user.email ||
      'Learner';

    // Preview mode: privileged users (author/admin) get a mock registration, 
    // no DB record created, no progress tracked.
    if (request.headers.get('X-SCORM-Preview') === '1') {
      if (!isPrivileged) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.json({
        registration: {
          id: 'preview',
          package_id: packageId,
          user_id: user.id,
          course_id: pkg.course_id,
          lesson_status: 'not attempted',
          cmi_data: {},
          score_raw: null,
          score_min: 0,
          score_max: 100,
          total_time: 'PT0S',
          suspend_data: null,
          lesson_location: null,
        },
        package: pkg,
        learnerName,
        serveBase: `/api/scorm/${packageId}/serve`,
      });
    }

    // Upsert registration
    const { data: reg } = await serviceClient
      .from('scorm_registrations')
      .upsert(
        {
          package_id: packageId,
          user_id: user.id,
          course_id: pkg.course_id,
          started_at: new Date().toISOString(),
        },
        { onConflict: 'package_id,user_id', ignoreDuplicates: true }
      )
      .select()
      .single();

    // If upsert returned nothing (duplicate ignored), fetch existing
    const { data: existing } = reg
      ? { data: reg }
      : await serviceClient
          .from('scorm_registrations')
          .select('*')
          .eq('package_id', packageId)
          .eq('user_id', user.id)
          .single();

    if (!existing) {
      return NextResponse.json({ error: 'Could not start a SCORM session' }, { status: 500 });
    }

    return NextResponse.json({
      registration: existing,
      package: pkg,
      learnerName,
      serveBase: `/api/scorm/${packageId}/serve`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
