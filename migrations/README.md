# Legacy migrations (reference only)

This directory holds **legacy / historical** SQL migrations from before the
project standardised on the Supabase CLI migration flow.

**The canonical, source-of-truth migrations now live in [`supabase/migrations`](../supabase/migrations).**
New schema changes must be added there (timestamped filenames) so they apply in
order via the Supabase CLI/MCP.

Treat the files in this folder as historical context only:

- Do **not** apply them blindly against the shared database.
- Some have been superseded (e.g. the legacy `award_lms_action` /
  gamification RPCs were replaced by the secure reward economy in
  `supabase/migrations/20260622000000_secure_reward_economy.sql`).
- The database is **shared across multiple apps** (see `../DATABASE_MAP.md`) —
  never drop tables based only on LMS usage.

Before relying on anything here, verify current state against
`supabase/migrations` and the live schema.
