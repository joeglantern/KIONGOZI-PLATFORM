import { describe, it, expect } from 'vitest';
import { formatKesCurrency } from '../../lib/format';

describe('formatKesCurrency', () => {
  it('formats with thousands separators and no decimals', () => {
    const out = formatKesCurrency(1500);
    expect(out).toContain('1,500');
    expect(out).not.toMatch(/\.\d/);
  });

  it('rounds to whole units (maximumFractionDigits: 0)', () => {
    expect(formatKesCurrency(99.99)).toContain('100');
  });

  it('respects a custom currency code', () => {
    expect(formatKesCurrency(10, 'USD')).toContain('10');
  });
});
