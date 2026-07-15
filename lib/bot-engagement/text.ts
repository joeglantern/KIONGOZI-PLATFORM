const TYPO_PAIRS: Array<[RegExp, string]> = [
    [/\binformation\b/i, 'infomation'],
    [/\bprocess\b/i, 'proccess'],
    [/\bactually\b/i, 'actully'],
    [/\bsupport\b/i, 'suport'],
    [/\btimeline\b/i, 'timline'],
    [/\bclearer\b/i, 'cleaer'],
    [/\bcommunity\b/i, 'commuity'],
    [/\bimplementation\b/i, 'implemetation'],
    [/\bbecause\b/i, 'becuase'],
    [/\bpeople\b/i, 'ppl'],
];

export function clampLimit(limit?: number) {
    if (!limit || Number.isNaN(limit)) return 5;
    return Math.max(1, Math.min(Math.floor(limit), 20));
}

export function pick<T>(items: T[], index: number, offset = 0): T {
    return items[(index + offset) % items.length];
}

export function randomishOffset() {
    return new Date().getUTCMinutes() + new Date().getUTCHours() * 7;
}

export function sanitizeContent(content: string) {
    const cleaned = content
        .replace(/^```(?:json)?/i, '')
        .replace(/```$/g, '')
        .replace(/^["']|["']$/g, '')
        .replace(/\./g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 600);

    if (cleaned.length % 3 !== 1) return cleaned;
    const typoPair = TYPO_PAIRS.find(([pattern]) => pattern.test(cleaned));
    return typoPair ? cleaned.replace(typoPair[0], typoPair[1]) : `${cleaned} bana`;
}
