import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { CATEGORY_COVERS, LOCAL_THUMBNAILS, getCourseThumbnail } from '@/lib/course-thumbnail';
import { toPlainText } from '@/lib/plain-text';

describe('getCourseThumbnail', () => {
    it('prefers the course thumbnail', () => {
        expect(getCourseThumbnail({ thumbnailUrl: 'https://x/y.png', categoryName: 'Business' })).toBe('https://x/y.png');
    });

    it('uses a title-specific cover before the category cover', () => {
        expect(getCourseThumbnail({ title: 'Funding and Pitching 101', categoryName: 'Digital Entrepreneurship' }))
            .toBe(LOCAL_THUMBNAILS.fundingPitching);
    });

    it('falls back to the category cover', () => {
        expect(getCourseThumbnail({ title: 'Know Your Rights', categoryName: 'Sexual and Reproductive Health & Rights' }))
            .toBe(LOCAL_THUMBNAILS.leadership);
        expect(getCourseThumbnail({ title: 'Your County Budget', categoryName: 'Civic Participation' }))
            .toBe(LOCAL_THUMBNAILS.civicData);
    });

    it('every cover file exists in public/', () => {
        for (const src of new Set([...Object.values(LOCAL_THUMBNAILS), ...Object.values(CATEGORY_COVERS)])) {
            expect(existsSync(path.join(process.cwd(), 'public', src)), src).toBe(true);
        }
    });
});

describe('toPlainText', () => {
    it('strips Markdown and HTML for previews', () => {
        expect(toPlainText('## Welcome\n\nLearn **budgets** and [rights](https://x.org).\n- one\n- two'))
            .toBe('Welcome Learn budgets and rights. one two');
        expect(toPlainText('<p>Hello&nbsp;<em>there</em></p>')).toBe('Hello there');
        expect(toPlainText(null)).toBe('');
    });
});
