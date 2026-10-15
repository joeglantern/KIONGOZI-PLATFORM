/**
 * Pure helpers for the SCORM runtime: status normalization and session-time
 * accumulation. Shared by the commit route and covered by unit tests.
 */

export const LESSON_STATUSES = ['passed', 'failed', 'completed', 'incomplete', 'not attempted', 'browsed'] as const;
export type LessonStatus = typeof LESSON_STATUSES[number];

const COMPLETE_STATUSES: ReadonlySet<string> = new Set(['passed', 'completed']);

export function isCompleteStatus(status: string | null | undefined): boolean {
    return !!status && COMPLETE_STATUSES.has(status);
}

/**
 * Derive a lesson status that satisfies the scorm_registrations check
 * constraint from SCORM 1.2 or 2004 CMI data.
 */
export function deriveLessonStatus(cmiData: Record<string, string>): LessonStatus {
    const raw = (cmiData['cmi.core.lesson_status'] || '').trim().toLowerCase();
    if ((LESSON_STATUSES as readonly string[]).includes(raw)) return raw as LessonStatus;

    const successStatus = (cmiData['cmi.success_status'] || '').toLowerCase();
    if (successStatus === 'passed' || successStatus === 'failed') return successStatus;

    const completionStatus = (cmiData['cmi.completion_status'] || '').toLowerCase();
    if (completionStatus === 'completed') return 'completed';
    if (completionStatus === 'browsed') return 'browsed';
    if (completionStatus === 'not attempted') return 'not attempted';

    return 'incomplete';
}

/**
 * Never move a learner backwards: once a package is passed/completed, a later
 * review session that reports "incomplete" must not undo course progress.
 */
export function mergeLessonStatus(previous: string | null | undefined, next: LessonStatus): LessonStatus {
    if (isCompleteStatus(previous) && !isCompleteStatus(next) && next !== 'failed') {
        return previous as LessonStatus;
    }
    return next;
}

/** Parse SCORM 1.2 (HHHH:MM:SS.SS) or SCORM 2004 (ISO 8601, PT1H2M3.4S) durations to seconds. */
export function parseScormDuration(value: string | null | undefined): number {
    if (!value) return 0;
    const v = value.trim();

    const timespan = /^(\d{1,4}):(\d{1,2}):(\d{1,2}(?:\.\d{1,2})?)$/.exec(v);
    if (timespan) {
        return Number(timespan[1]) * 3600 + Number(timespan[2]) * 60 + Number(timespan[3]);
    }

    const iso = /^P(?:(\d+(?:\.\d+)?)Y)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i.exec(v);
    if (iso && v.length > 1) {
        const [, y, mo, d, h, mi, s] = iso;
        return (
            Number(y || 0) * 365 * 86400 +
            Number(mo || 0) * 30 * 86400 +
            Number(d || 0) * 86400 +
            Number(h || 0) * 3600 +
            Number(mi || 0) * 60 +
            Number(s || 0)
        );
    }

    return 0;
}

/** Format seconds in the version's own format, as SCOs read it back. */
export function formatScormDuration(totalSeconds: number, version: string): string {
    const secs = Math.max(0, totalSeconds);
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = Math.round((secs % 60) * 100) / 100;

    if (version === '2004') {
        return `PT${hours}H${minutes}M${seconds}S`;
    }

    const pad = (n: number, len = 2) => String(n).padStart(len, '0');
    const [whole, frac = '0'] = seconds.toFixed(2).split('.');
    return `${pad(Math.min(hours, 9999), 4)}:${pad(minutes)}:${pad(Number(whole))}.${frac}`;
}

/** Read the session time the SCO reported for this attempt. */
export function getSessionTime(cmiData: Record<string, string>): string | null {
    return cmiData['cmi.core.session_time'] || cmiData['cmi.session_time'] || null;
}

export function parseScore(value: string | null | undefined, fallback: number | null): number | null {
    if (value === null || value === undefined || value === '') return fallback;
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
}
