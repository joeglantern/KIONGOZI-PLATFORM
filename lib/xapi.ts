/**
 * xAPI (Tin Can) statement emitter for Kiongozi LMS
 * Emits statements for module, quiz, and course lifecycle events.
 */

import { createClient } from '@/app/utils/supabaseClient';

// Standard xAPI verb IRIs
const VERBS = {
  initialized:  { id: 'http://adlnet.gov/expapi/verbs/initialized',  display: { 'en-US': 'initialized' } },
  completed:    { id: 'http://adlnet.gov/expapi/verbs/completed',    display: { 'en-US': 'completed' } },
  passed:       { id: 'http://adlnet.gov/expapi/verbs/passed',       display: { 'en-US': 'passed' } },
  failed:       { id: 'http://adlnet.gov/expapi/verbs/failed',       display: { 'en-US': 'failed' } },
  enrolled:     { id: 'http://adlnet.gov/expapi/verbs/registered',   display: { 'en-US': 'enrolled' } },
  experienced:  { id: 'http://adlnet.gov/expapi/verbs/experienced',  display: { 'en-US': 'experienced' } },
} as const;

// Standard xAPI activity type IRIs
const ACTIVITY_TYPES = {
  module:   'http://adlnet.gov/expapi/activities/lesson',
  quiz:     'http://adlnet.gov/expapi/activities/assessment',
  course:   'http://adlnet.gov/expapi/activities/course',
} as const;

interface EmitOptions {
  userId: string;
  userEmail: string;
  verb: keyof typeof VERBS;
  activityType: keyof typeof ACTIVITY_TYPES;
  activityId: string;
  activityName: string;
  courseId?: string;
  result?: {
    score?: { raw: number; min?: number; max?: number };
    success?: boolean;
    completion?: boolean;
    duration?: string; // ISO 8601 duration e.g. "PT5M30S"
  };
}

/**
 * Emit a single xAPI statement to the `xapi_statements` table.
 * This is a fire-and-forget utility — errors are logged but not re-thrown.
 */
export async function emitXapi(opts: EmitOptions): Promise<void> {
  try {
    const supabase = createClient();
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kiongozi.app';

    const statement = {
      actor: {
        mbox: `mailto:${opts.userEmail}`,
        objectType: 'Agent',
      },
      verb: VERBS[opts.verb],
      object: {
        id: `${baseUrl}/activities/${opts.activityType}/${opts.activityId}`,
        objectType: 'Activity',
        definition: {
          type: ACTIVITY_TYPES[opts.activityType],
          name: { 'en-US': opts.activityName },
        },
      },
      ...(opts.result ? { result: opts.result } : {}),
      context: {
        platform: 'Kiongozi LMS',
        language: 'en-US',
        ...(opts.courseId
          ? {
              contextActivities: {
                parent: [{
                  id: `${baseUrl}/activities/course/${opts.courseId}`,
                  objectType: 'Activity',
                }],
              },
            }
          : {}),
      },
      user_id: opts.userId,
      course_id: opts.courseId || null,
    };

    const { error } = await supabase.from('xapi_statements').insert(statement);
    if (error) console.error('[xAPI] insert failed:', error.message);
  } catch (err) {
    console.error('[xAPI] unexpected error:', err);
  }
}

// ─── Convenience wrappers ────────────────────────────────────────────────────

export const xapi = {
  moduleStarted(userId: string, userEmail: string, moduleId: string, moduleName: string, courseId: string) {
    return emitXapi({
      userId, userEmail,
      verb: 'initialized',
      activityType: 'module',
      activityId: moduleId,
      activityName: moduleName,
      courseId,
    });
  },

  moduleCompleted(userId: string, userEmail: string, moduleId: string, moduleName: string, courseId: string) {
    return emitXapi({
      userId, userEmail,
      verb: 'completed',
      activityType: 'module',
      activityId: moduleId,
      activityName: moduleName,
      courseId,
      result: { completion: true },
    });
  },

  quizPassed(
    userId: string, userEmail: string,
    quizId: string, quizName: string,
    courseId: string,
    score: { raw: number; min?: number; max?: number }
  ) {
    return emitXapi({
      userId, userEmail,
      verb: 'passed',
      activityType: 'quiz',
      activityId: quizId,
      activityName: quizName,
      courseId,
      result: { score, success: true, completion: true },
    });
  },

  quizFailed(
    userId: string, userEmail: string,
    quizId: string, quizName: string,
    courseId: string,
    score: { raw: number; min?: number; max?: number }
  ) {
    return emitXapi({
      userId, userEmail,
      verb: 'failed',
      activityType: 'quiz',
      activityId: quizId,
      activityName: quizName,
      courseId,
      result: { score, success: false, completion: true },
    });
  },

  courseEnrolled(userId: string, userEmail: string, courseId: string, courseName: string) {
    return emitXapi({
      userId, userEmail,
      verb: 'enrolled',
      activityType: 'course',
      activityId: courseId,
      activityName: courseName,
      courseId,
    });
  },

  courseCompleted(userId: string, userEmail: string, courseId: string, courseName: string) {
    return emitXapi({
      userId, userEmail,
      verb: 'completed',
      activityType: 'course',
      activityId: courseId,
      activityName: courseName,
      courseId,
      result: { completion: true, success: true },
    });
  },
};
