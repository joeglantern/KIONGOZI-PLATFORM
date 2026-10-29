// Crash reports for the API (Sentry). Loaded first in index.ts so it can watch everything.
// Off unless SENTRY_DSN is set in the server's .env.
import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';

dotenv.config();

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    release: process.env.GIT_SHA ? `kchat-api@${process.env.GIT_SHA}` : undefined,
    tracesSampleRate: 0, // errors only
    sendDefaultPii: false,
  });
}

export { Sentry };
