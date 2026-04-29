import { NextRequest, NextResponse } from 'next/server';
import { authorizeScormPackageAccess } from '@/lib/scorm/access';

function getScormValue(cmiData: Record<string, string>, scorm12Key: string, scorm2004Key: string) {
  return cmiData[scorm12Key] ?? cmiData[scorm2004Key] ?? null;
}

function deriveLessonStatus(cmiData: Record<string, string>) {
  const lessonStatus = cmiData['cmi.core.lesson_status'];
  if (lessonStatus) return lessonStatus;

  const successStatus = cmiData['cmi.success_status'];
  if (successStatus === 'passed' || successStatus === 'failed') return successStatus;

  const completionStatus = cmiData['cmi.completion_status'];
  if (completionStatus === 'completed') return 'completed';
  if (completionStatus === 'incomplete') return 'incomplete';
  if (completionStatus === 'browsed') return 'browsed';

  return 'incomplete';
}

// POST — save CMI data from SCORM LMSCommit / LMSFinish
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ packageId: string }> }
) {
  try {
    const { packageId } = await params;
    const access = await authorizeScormPackageAccess(request, packageId);
    if ('error' in access) {
      return access.error;
    }

    const { serviceClient, user, isPrivileged } = access;

    // Preview mode: skip all writes
    if (request.headers.get('X-SCORM-Preview') === '1') {
      if (!isPrivileged) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      return NextResponse.json({ success: true, preview: true });
    }

    const body = await request.json();
    const { cmiData, isFinish = false } = body as {
      cmiData: Record<string, string>;
      isFinish?: boolean;
    };

    if (!cmiData) return NextResponse.json({ error: 'No CMI data provided' }, { status: 400 });

    // Extract fields across SCORM 1.2 and 2004.
    const lessonStatus = deriveLessonStatus(cmiData);
    const scoreRawValue = getScormValue(cmiData, 'cmi.core.score.raw', 'cmi.score.raw');
    const scoreMinValue = getScormValue(cmiData, 'cmi.core.score.min', 'cmi.score.min');
    const scoreMaxValue = getScormValue(cmiData, 'cmi.core.score.max', 'cmi.score.max');
    const totalTimeValue = getScormValue(cmiData, 'cmi.core.total_time', 'cmi.total_time');
    const lessonLocationValue = getScormValue(cmiData, 'cmi.core.lesson_location', 'cmi.location');

    const scoreRaw = scoreRawValue
      ? parseFloat(scoreRawValue)
      : null;
    const scoreMin = scoreMinValue
      ? parseFloat(scoreMinValue)
      : 0;
    const scoreMax = scoreMaxValue
      ? parseFloat(scoreMaxValue)
      : 100;
    const totalTime = totalTimeValue || '0000:00:00.00';
    const suspendData = cmiData['cmi.suspend_data'] || null;
    const lessonLocation = lessonLocationValue || null;

    const isComplete = ['passed', 'completed'].includes(lessonStatus);

    const updatePayload: Record<string, any> = {
      cmi_data: cmiData,
      lesson_status: lessonStatus,
      score_raw: scoreRaw,
      score_min: scoreMin,
      score_max: scoreMax,
      total_time: totalTime,
      suspend_data: suspendData,
      lesson_location: lessonLocation,
      updated_at: new Date().toISOString(),
    };

    if (isComplete && !updatePayload.completed_at) {
      updatePayload.completed_at = new Date().toISOString();
    }

    const { data, error } = await serviceClient
      .from('scorm_registrations')
      .update(updatePayload)
      .eq('package_id', packageId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Emit xAPI statement if finishing
    if (isFinish) {
      const verb = isComplete
        ? { id: 'http://adlnet.gov/expapi/verbs/completed', display: { 'en-US': 'completed' } }
        : { id: 'http://adlnet.gov/expapi/verbs/suspended', display: { 'en-US': 'suspended' } };

      await serviceClient.from('xapi_statements').insert({
        actor: { mbox: `mailto:${user.email}`, objectType: 'Agent' },
        verb,
        object: {
          id: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/scorm/${packageId}`,
          objectType: 'Activity',
          definition: { type: 'http://adlnet.gov/expapi/activities/course' },
        },
        result: scoreRaw !== null
          ? {
              score: { raw: scoreRaw, min: scoreMin, max: scoreMax },
              success: lessonStatus === 'passed',
              completion: isComplete,
            }
          : { success: lessonStatus === 'passed', completion: isComplete },
        context: {
          platform: 'Kiongozi LMS',
          language: 'en-US',
        },
        user_id: user.id,
        scorm_package_id: packageId,
        course_id: data?.course_id || null,
      });
    }

    return NextResponse.json({ success: true, registration: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
