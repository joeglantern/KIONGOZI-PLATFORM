import { describe, it, expect } from 'vitest';
import { getSafeNext, getPostAuthPath } from '../../lib/auth/redirects';

describe('getSafeNext', () => {
  it('accepts same-origin absolute paths', () => {
    expect(getSafeNext('/dashboard')).toBe('/dashboard');
  });

  it('rejects protocol-relative, off-site, and empty inputs', () => {
    expect(getSafeNext('//evil.com')).toBeNull();
    expect(getSafeNext('https://evil.com')).toBeNull();
    expect(getSafeNext('relative')).toBeNull();
    expect(getSafeNext(null)).toBeNull();
    expect(getSafeNext(undefined)).toBeNull();
    expect(getSafeNext('')).toBeNull();
  });
});

describe('getPostAuthPath', () => {
  it('routes incomplete profiles to /complete-profile (preserving next)', () => {
    expect(getPostAuthPath(null, 'user', true, '/dashboard')).toBe('/complete-profile');
    expect(getPostAuthPath('/x', 'user', true, '/dashboard')).toBe('/complete-profile?next=%2Fx');
  });

  it('honors an explicit next before role fallbacks', () => {
    expect(getPostAuthPath('/notes', 'admin', false, '/dashboard')).toBe('/notes');
  });

  it('falls back per role, then to the provided default', () => {
    expect(getPostAuthPath(null, 'admin', false, '/dashboard')).toBe('/admin/dashboard');
    expect(getPostAuthPath(null, 'instructor', false, '/dashboard')).toBe('/instructor/dashboard');
    expect(getPostAuthPath(null, 'user', false, '/dashboard')).toBe('/dashboard');
    expect(getPostAuthPath(null, 'user', false, '/onboarding')).toBe('/onboarding');
  });
});
