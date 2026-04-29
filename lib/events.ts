export const INTERNAL_LIVE_STAGE = 'INTERNAL_LIVE_STAGE';

export const VALID_EVENT_TYPES = ['meetup', 'townhall', 'protest', 'cleanup', 'workshop'] as const;
export type EventType = typeof VALID_EVENT_TYPES[number];

/** Returns true only for http/https URLs — rejects javascript:, data:, etc. */
export function isSafeUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
        return false;
    }
}
