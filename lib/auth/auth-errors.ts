/**
 * Map a Supabase auth error to a human, non-technical message. In particular it
 * detects GoTrue's per-IP rate limit ("Request rate limit reached", HTTP 429) so
 * the UI can show a calm "wait and retry" instead of a raw server string, and
 * can start a short cooldown so rapid re-clicks do not burn more of the window.
 */
export interface FriendlyAuthError {
  message: string;
  isRateLimited: boolean;
  retryAfterSeconds: number;
}

export function friendlyAuthError(err: unknown): FriendlyAuthError {
  const e = err as { status?: number; code?: string; message?: string } | null;
  const status = typeof e?.status === 'number' ? e.status : undefined;
  const code = typeof e?.code === 'string' ? e.code : '';
  const raw = typeof e?.message === 'string' ? e.message : '';
  const lower = raw.toLowerCase();

  const isRateLimited =
    status === 429 || code.includes('rate_limit') || lower.includes('rate limit');
  if (isRateLimited) {
    const m = lower.match(/after (\d+) seconds?/);
    const retryAfterSeconds = m ? parseInt(m[1], 10) : 45;
    return {
      message:
        'Too many sign-in attempts from your network. Please wait a moment and try again.',
      isRateLimited: true,
      retryAfterSeconds,
    };
  }
  if (code === 'invalid_credentials' || lower.includes('invalid login credentials')) {
    return { message: 'Incorrect email or password. Please try again.', isRateLimited: false, retryAfterSeconds: 0 };
  }
  if (code === 'email_not_confirmed' || lower.includes('email not confirmed')) {
    return {
      message: 'Please confirm your email address before signing in. Check your inbox for the link.',
      isRateLimited: false,
      retryAfterSeconds: 0,
    };
  }
  return { message: raw || 'Something went wrong signing in. Please try again.', isRateLimited: false, retryAfterSeconds: 0 };
}
