import { describe, expect, it } from 'vitest';
import {
    deriveLessonStatus,
    formatScormDuration,
    mergeLessonStatus,
    parseScore,
    parseScormDuration,
} from '@/lib/scorm/runtime';

describe('deriveLessonStatus', () => {
    it('uses a valid SCORM 1.2 lesson_status', () => {
        expect(deriveLessonStatus({ 'cmi.core.lesson_status': 'passed' })).toBe('passed');
    });

    it('ignores invalid 1.2 values that would break the DB check constraint', () => {
        expect(deriveLessonStatus({ 'cmi.core.lesson_status': 'unknown' })).toBe('incomplete');
    });

    it('prefers SCORM 2004 success_status over completion_status', () => {
        expect(deriveLessonStatus({ 'cmi.completion_status': 'completed', 'cmi.success_status': 'failed' })).toBe('failed');
        expect(deriveLessonStatus({ 'cmi.completion_status': 'completed', 'cmi.success_status': 'unknown' })).toBe('completed');
    });
});

describe('mergeLessonStatus', () => {
    it('does not downgrade a completed package on a later review session', () => {
        expect(mergeLessonStatus('completed', 'incomplete')).toBe('completed');
        expect(mergeLessonStatus('passed', 'browsed')).toBe('passed');
    });

    it('allows progress forward and an explicit failure', () => {
        expect(mergeLessonStatus('incomplete', 'completed')).toBe('completed');
        expect(mergeLessonStatus('passed', 'failed')).toBe('failed');
    });
});

describe('SCORM durations', () => {
    it('parses SCORM 1.2 timespans', () => {
        expect(parseScormDuration('0001:02:03.5')).toBeCloseTo(3723.5);
    });

    it('parses SCORM 2004 ISO 8601 durations', () => {
        expect(parseScormDuration('PT1H2M3.5S')).toBeCloseTo(3723.5);
        expect(parseScormDuration('PT45S')).toBe(45);
        expect(parseScormDuration('PT0S')).toBe(0);
    });

    it('treats garbage as zero', () => {
        expect(parseScormDuration('soon')).toBe(0);
        expect(parseScormDuration('P')).toBe(0);
        expect(parseScormDuration(null)).toBe(0);
    });

    it('round-trips through each version format', () => {
        expect(formatScormDuration(3723.5, '1.2')).toBe('0001:02:03.50');
        expect(formatScormDuration(3723.5, '2004')).toBe('PT1H2M3.5S');
        expect(parseScormDuration(formatScormDuration(98765.25, '1.2'))).toBeCloseTo(98765.25);
    });
});

describe('parseScore', () => {
    it('keeps zero scores and rejects NaN', () => {
        expect(parseScore('0', null)).toBe(0);
        expect(parseScore('abc', null)).toBeNull();
        expect(parseScore('', 100)).toBe(100);
    });
});
