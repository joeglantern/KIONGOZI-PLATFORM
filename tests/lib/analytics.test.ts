import { describe, it, expect } from 'vitest';
import { buildCountyBreakdown } from '../../lib/community/analytics';

describe('buildCountyBreakdown', () => {
  it('counts unique respondents per county, sorted count-descending', () => {
    const rows = [
      { county: 'Nairobi', user_id: 'a' },
      { county: 'Nairobi', user_id: 'a' }, // duplicate respondent -> counted once
      { county: 'Nairobi', user_id: 'b' },
      { county: 'Kisumu', user_id: 'c' },
      { county: null, user_id: 'd' }, // no county -> excluded
    ];
    expect(buildCountyBreakdown(rows, (r) => r.user_id)).toEqual([
      { county: 'Nairobi', count: 2 },
      { county: 'Kisumu', count: 1 },
    ]);
  });

  it('uses the keyOf callback for the dedupe key (anonymous fallback)', () => {
    const rows = [
      { county: 'X', user_id: null, anon_session_id: 's1' },
      { county: 'X', user_id: null, anon_session_id: 's1' },
      { county: 'X', user_id: null, anon_session_id: 's2' },
    ];
    expect(buildCountyBreakdown(rows, (r) => r.user_id ?? r.anon_session_id)).toEqual([
      { county: 'X', count: 2 },
    ]);
  });

  it('returns an empty array when nothing has a county', () => {
    expect(buildCountyBreakdown([{ county: null, user_id: 'a' }], (r) => r.user_id)).toEqual([]);
  });
});
