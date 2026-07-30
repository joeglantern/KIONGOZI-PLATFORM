// Startup environment validation. The server still boots with missing vars
// (so one bad key can't take down unrelated features), but the gaps are
// impossible to miss: a loud banner in the logs and a `config` section in
// /api/v1/health/detailed.

const REQUIRED = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'JWT_SECRET',
] as const;

// Missing these degrades specific features rather than the whole API
const RECOMMENDED = [
  'OPENAI_API_KEY',   // chatbot
  'ALLOWED_ORIGINS',  // browser clients (admin panel)
] as const;

export const missingRequired: string[] = REQUIRED.filter(k => !process.env[k]);
export const missingRecommended: string[] = RECOMMENDED.filter(k => !process.env[k]);

export function validateEnvOnBoot(): void {
  if (missingRequired.length === 0 && missingRecommended.length === 0) {
    console.log('✅ Environment: all required and recommended variables present');
    return;
  }

  if (missingRequired.length > 0) {
    console.error('');
    console.error('╔══════════════════════════════════════════════════════════════╗');
    console.error('║  ⛔ MISSING REQUIRED ENVIRONMENT VARIABLES                   ║');
    console.error('║  Most API routes WILL FAIL until these are set in .env:      ║');
    for (const k of missingRequired) {
      console.error(`║    - ${k.padEnd(56)}║`);
    }
    console.error('║  After editing .env: docker compose up -d --force-recreate   ║');
    console.error('╚══════════════════════════════════════════════════════════════╝');
    console.error('');
  }

  if (missingRecommended.length > 0) {
    console.warn(`⚠️  Missing recommended env vars (some features degraded): ${missingRecommended.join(', ')}`);
  }
}
