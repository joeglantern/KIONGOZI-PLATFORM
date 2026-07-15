/**
 * Build a county -> unique-respondent-count breakdown, sorted count-descending.
 *
 * Rows without a `county` are excluded. `keyOf` yields the per-respondent dedupe
 * key (e.g. the user id, optionally falling back to an anonymous session id where
 * anonymous responses should still count once).
 */
export function buildCountyBreakdown(
    responses: any[],
    keyOf: (r: any) => string
): { county: string; count: number }[] {
    const countyMap = new Map<string, Set<string>>();
    for (const r of responses) {
        if (!r.county) continue;
        if (!countyMap.has(r.county)) countyMap.set(r.county, new Set());
        countyMap.get(r.county)!.add(keyOf(r));
    }
    return [...countyMap.entries()]
        .map(([county, keys]) => ({ county, count: keys.size }))
        .sort((a, b) => b.count - a.count);
}
