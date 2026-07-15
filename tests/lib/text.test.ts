import { describe, it, expect } from 'vitest';
import { clampLimit, pick, sanitizeContent } from '../../lib/bot-engagement/text';

describe('clampLimit', () => {
  it('defaults to 5 for missing, NaN, or zero', () => {
    expect(clampLimit(undefined)).toBe(5);
    expect(clampLimit(NaN)).toBe(5);
    expect(clampLimit(0)).toBe(5);
  });

  it('clamps into the [1, 20] range and floors', () => {
    expect(clampLimit(50)).toBe(20);
    expect(clampLimit(3.9)).toBe(3);
    expect(clampLimit(-4)).toBe(1);
  });
});

describe('pick', () => {
  it('indexes with wrap-around modulo and offset', () => {
    const items = ['a', 'b', 'c'];
    expect(pick(items, 0)).toBe('a');
    expect(pick(items, 3)).toBe('a');
    expect(pick(items, 1, 1)).toBe('c');
  });
});

describe('sanitizeContent', () => {
  it('strips code fences and collapses whitespace', () => {
    expect(sanitizeContent('```\nsome text\n```')).toBe('some text');
  });

  it('strips quotes at the string boundary and removes periods', () => {
    expect(sanitizeContent('"Hello there"')).toBe('Hello there');
  });
});
