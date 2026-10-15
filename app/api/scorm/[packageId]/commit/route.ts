import { NextRequest, NextResponse } from 'next/server';
import { authorizeScormPackageAccess } from '@/lib/scorm/access';
import { syncCourseEnrollmentProgress } from '@/lib/lms/course-progress';
import {
  deriveLessonStatus,
  formatScormDuration,
  getSessionTime,
  isCompleteStatus,
  mergeLessonStatus,
  parseScore,
  parseScormDuration,
} from '@/lib/scorm/runtime';

function getScormValue(cmiData: Record<string, string>, scorm12Key: string, scorm2004Key: string) {
  return cmiData[scorm12Key] ?? cmiData[scorm2004Key] ?? null;
}

// SCORM 1.2 caps suspend_data at 4096 chars and 2004 at 64000; cap generously
// so a runaway package can't bloat the row.
const MAX_SUSPEND_DATA = 64000;

// POST, save CMI data from SCORM LMSCommit / LMSFinish (also used by sendBeacon on unload)
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

    const { serviceClient, user, isPrivileged, pkg } = access;

    // Preview mode: skip all writes
    if (request.headers.get('X-SCORM-Preview') === '1') {
      if (!isPrivileged) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      return NextResponse.json({ success: true, preview: true });
    }

    // sendBeacon posts text/plain, so parse the raw body ourselves.
    const rawBody = await request.text();
    let body: { cmiData?: Record<string, string>; isFinish?: boolean };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { cmiData, isFinish = false } = body;
    if (!cmiData || typeof cmiData !== 'object') {
      return NextResponse.json({ error: 'No CMI data provided' }, { status: 400 });
    }

    const { data: existing } = await serviceClient
      .from('scorm_registrations')
      .select('lesson_status, completed_at, total_time')
      .eq('package_id', packageId)
      .eq('user_id', user.id)
      .maybeSingle();

    // Extract fields across SCORM 1.2 and 2004.
    const lessonStatus = mergeLessonStatus(existing?.lesson_status, deriveLessonStatus(cmiData));
    const scoreRaw = parseScore(getScormValue(cmiData, 'cmi.core.score.raw', 'cmi.score.raw'), null);
    const scoreMin = parseScore(getScormValue(cmiData, 'cmi.core.score.min', 'cmi.score.min'), 0);
    const scoreMax = parseScore(getScormValue(cmiData, 'cmi.core.score.max', 'cmi.score.max'), 100);
    const suspendData = (cmiData['cmi.suspend_data'] || '').slice(0, MAX_SUSPEND_DATA) || null;
    const lessonLocation = getScormValue(cmiData, 'cmi.core.lesson_location', 'cmi.location') || null;

    // SCOs report only this attempt's session_time; the LMS owns total_time.
    // Accumulate once per attempt, when the SCO finishes.
    const previousTotal = existing?.total_time ?? getScormValue(cmiData, 'cmi.core.total_time', 'cmi.total_time');
    const sessionSeconds = isFinish ? parseScormDuration(getSessionTime(cmiData)) : 0;
    const totalTime = formatScormDuration(parseScormDuration(previousTotal) + sessionSeconds, pkg.version);

    const isComplete = isCompleteStatus(lessonStatus);
    const nextCmiData = {
      ...cmiData,
      [pkg.version === '2004' ? 'cmi.total_time' : 'cmi.core.total_time']: totalTime,
    };

    const updatePayload: Record<string, any> = {
      cmi_data: nextCmiData,
      lesson_status: lessonStatus,
      score_raw: scoreRaw,
      score_min: scoreMin,
      score_max: scoreMax,
      total_time: totalTime,
      suspend_data: suspendData,
      lesson_location: lessonLocation,
      updated_at: new Date().toISOString(),
    };

    if (isComplete && !existing?.completed_at) {
      updatePayload.completed_at = new Date().toISOString();
    }

    // Upsert so a commit still lands if the registration row is missing
    // (e.g. init raced the first commit or the row was cleaned up).
    const { data, error } = await serviceClient
      .from('scorm_registrations')
      .upsert(
        {
          ...updatePayload,
          package_id: packageId,
          user_id: user.id,
          course_id: pkg.course_id,
          ...(existing ? {} : { started_at: new Date().toISOString() }),
        },
        { onConflict: 'package_id,user_id' }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const courseId = data?.course_id || pkg.course_id;
    const progressSnapshot = isComplete && courseId
      ? await syncCourseEnrollmentProgress(serviceClient, user.id, courseId)
      : null;

    // Emit xAPI statement if finishing
    if (isFinish) {
      const verb = isComplete
        ? { id: 'http://adlnet.gov/expapi/verbs/completed', display: { 'en-US': 'completed' } }
        : { id: 'http://adlnet.gov/expapi/verbs/suspended', display: { 'en-US': 'suspended' } };

      const { error: xapiError } = await serviceClient.from('xapi_statements').insert({
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
        course_id: courseId || null,
      });
      // Progress is already saved; a statement failure must not fail the commit.
      if (xapiError) console.error('[scorm/commit] xAPI insert failed:', xapiError.message);
    }

    return NextResponse.json({
      success: true,
      registration: data,
      progress_percentage: progressSnapshot?.progressPercentage ?? null,
    });
  } catch (err: any) {
    console.error('[scorm/commit] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
