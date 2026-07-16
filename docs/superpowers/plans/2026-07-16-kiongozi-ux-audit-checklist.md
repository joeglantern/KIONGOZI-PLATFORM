# Kiongozi LMS Audit — Fix & Test Tracking Checklist

Source: 2026-07-16 UX/UI audit (178 findings) + implementation plan at `docs/superpowers/plans/2026-07-16-kiongozi-ux-audit-fixes.md`.

**How to use this file:** mark **Fixed** (☑) the moment the commit lands, mark **Tested** (☑) only after you've personally run the manual-verification steps (or the automated test, where one exists) and confirmed the expected result. A row with Fixed checked but Tested empty means "implemented, not yet verified" — don't consider it closed.

Legend: 🔴 Critical · 🟠 High · 🔵 Medium · ⚪ Low

---

## Phase 1 — Critical (12)

| Fixed | Tested | # | Finding | Ref |
|---|---|---|---|---|
| ☑ | ☑ live | 1 | 🔴 Onboarding `finish()` can hang forever with no error feedback | `app/onboarding/page.tsx:127-163` |
| ☑ | ◐ code+review | 2 | 🔴 Instructor shell has no vertical scroll — content clipped below first viewport | `app/instructor/components/InstructorShell.tsx` |
| ☑ | ◐ code+review | 3 | 🔴 Lesson notes can silently fail to save while showing "Saved" | `ModuleViewerClient.tsx:468-497, 1039-1061` |
| ☑ | ◐ code+review | 4 | 🔴 Any lesson slide with an HTML tag crashes on server render (DOMPurify SSR) | `components/learning/MarkdownRenderer.tsx:44-63` |
| ☑ | ◐ code+review | 5 | 🔴 `/reset-password` is unreachable for accounts with incomplete onboarding | `app/contexts/UserContext.tsx:60-83` |
| ☑ | ☑ live | 6 | 🔴 Dashboard charts fabricate random data instead of an honest empty state | `CategoryBarChart.tsx`, `XPLineChart.tsx` |
| ☑ | ☑ live | 7 | 🔴 Mobile Enroll button clipped off-screen on course detail page | `app/courses/[id]/page.tsx:412-456` |
| ☑ | ◐ code+review | 8 | 🔴 Quiz countdown timer never actually starts (stale dependency array) | `components/quiz/QuizPlayer.tsx:168-178` |
| ☑ | ☑ live | 9 | 🔴 Two unrelated "Step 1 of 5" onboarding systems can both fire | `components/dashboard/DashboardTour.tsx` |
| ☑ | ☑ live | 10 | 🔴 `/messages` nav item is a 404 for every student | `app/messages/page.tsx` (new) |
| ⚠ BLOCKED | ☐ | 11 | 🔴 SCORM content can hijack a logged-in session (same-origin + cookie scope) | `ScormPlayer.tsx`, scorm serve route |
| ⚠ BLOCKED | ☐ | 12 | 🔴 `chat_participants` RLS may allow joining any room (needs live-DB verification) | Supabase RLS policies |

> **⚠ Tasks 11 & 12 are NOT fixed — deliberately not applied blind.** Both are security changes that (a) can't be verified in an automated session and (b) would break a working feature if applied wrong.
> - **#11 (SCORM):** in-code security-tracking comments + precise fix guidance committed (`6488420`). Functional fix (cookieless subdomain + postMessage runtime bridge) NOT applied: correctness is SCORM-package-dependent and needs a real test package + infra + security review. Requires a dedicated session.
> - **#12 (chat RLS):** repo investigation CONFIRMED the permissive `FOR ALL` policy is still latest and the course-room join has no enrollment gate. Corrective migration prepared in `docs/…-task12-chat-rls-PROPOSED-migration.sql` (`90e9580`) — NOT applied: the only connected Supabase MCP points at a different project, so live state couldn't be read/tested. Needs someone with real Kiongozi DB access to verify + apply.

**Tested column legend:** ☑ live = exercised end-to-end against the running app in the final re-audit · ◐ code+review = verified by typecheck/lint/build + the whole-branch code review, but not individually live-driven (needs a specific state — instructor account, offline mid-lesson save, HTML-containing slide + hard refresh, reset-email flow, or a timed quiz — not reachable in the automated re-audit). Recommended to spot-check these five manually before final sign-off.

**Phase 1 exit gate:** ☑ typecheck/lint/build pass (0/0/0, 67/67 pages) · ☑ signup→onboarding→dashboard succeeds live (re-audit 7/7, incl. the previously-2/2-reproduced hang now gone) · ◐ instructor 390px (code+review, no instructor account to live-drive) · ☑ `/messages` resolves (live, 200) · ☑ Tasks 11 & 12 have an explicit documented decision (both prepared + blocked, see above)

---

## Phase 2 — High severity (47)

### Auth & recovery
| Fixed | Tested | Finding | Ref |
|---|---|---|---|
| ☐ | ☐ | Existing-email signup shows fake "check your email" success forever | `app/signup/SignupContent.tsx:124-126` |
| ☐ | ☐ | No way to resend a confirmation email anywhere in the app | `app/login/LoginContent.tsx:72-74` |
| ☐ | ☐ | No `emailRedirectTo` on signup — path/mission/XP context lost if confirmation required | `app/signup/SignupContent.tsx:73-83` |

### Onboarding funnel
| Fixed | Tested | Finding | Ref |
|---|---|---|---|
| ☐ | ☐ | Onboarding is a hard, unskippable gate with no backfill for legacy accounts | `app/contexts/UserContext.tsx:74-81` |
| ☐ | ☐ | Onboarding redirect drops the student's original deep link (`?next=`) | `app/contexts/UserContext.tsx:80` |
| ☐ | ☐ | Email signups pass through 3 forms (~8 screens) due to missing username step | `app/complete-profile/page.tsx:214-257` |

### Course discovery & enrollment
| Fixed | Tested | Finding | Ref |
|---|---|---|---|
| ☐ | ☐ | `/courses` wrapped in `ProtectedRoute`, contradicting middleware's public-access comment | `app/courses/page.tsx:191` |
| ☐ | ☐ | Catalog fetch failure silently shows "no matching courses" with no retry | `app/courses/page.tsx:119-123` |
| ☐ | ☐ | My Learning enrollment query failure shows "zero courses" instead of an error | `app/my-learning/page.tsx:35` |

### Course player
| Fixed | Tested | Finding | Ref |
|---|---|---|---|
| ☐ | ☐ | Mixing inline HTML into a Markdown slide disables Markdown for the whole slide | `MarkdownRenderer.tsx` |
| ☐ | ☐ | Slide/checkpoint position never persists — refresh drops student to slide 1 | `ModuleViewerClient.tsx:197` |
| ☐ | ☐ | Generic checkpoint question force-gates every text lesson regardless of relevance | `ModuleViewerClient.tsx:228` |
| ☐ | ☐ | Mark-complete fails silently on error, no retry, no toast | `ModuleViewerClient.tsx:461` |
| ☐ | ☐ | Video lessons have no captions/transcript despite the data being stored | `ModuleViewerClient.tsx:1250` |
| ☐ | ☐ | Mobile viewport height pushes Previous/Next controls below the fold | `ModuleViewerClient.tsx:644` |

### Quizzes
| Fixed | Tested | Finding | Ref |
|---|---|---|---|
| ☐ | ☐ | Submit shows false "0% — Failed" while the network request is still in flight | `QuizPlayer.tsx:114-116` |
| ☐ | ☐ | A failed submit request always renders a fabricated 0% verdict, even on server-side passes | `QuizPlayer.tsx:162-165` |
| ☐ | ☐ | Answers exist only in React state — refresh/back silently discards the whole attempt | `QuizPlayer.tsx:61` |
| ☐ | ☐ | Answer options have no `radiogroup`/`aria-checked` — inaccessible to screen readers | `QuizPlayer.tsx:380-404` |

### Navigation & route integrity
| Fixed | Tested | Finding | Ref |
|---|---|---|---|
| ☐ | ☐ | Every community post author link 404s — `/community/profile/[id]` doesn't exist | `components/social/PostCard.tsx:113` |
| ☐ | ☐ | Service worker is built but never registered — `/offline` fallback unreachable | `app/layout.tsx`, `app/sw.ts` |

### Visual consistency
| Fixed | Tested | Finding | Ref |
|---|---|---|---|
| ☐ | ☐ | At least 3 unreconciled design systems live simultaneously across auth/dashboard/courses/landing | app-wide |

### Certificates & completion
| Fixed | Tested | Finding | Ref |
|---|---|---|---|
| ☐ | ☐ | `/verify/[code]` 404s to the generic not-found page with auth-gated CTAs, dead-ending third-party verifiers | `app/verify/[code]/page.tsx` |

### Chat & discussions
| Fixed | Tested | Finding | Ref |
|---|---|---|---|
| ☐ | ☐ | Your own sent chat messages never reconcile — permanent single-checkmark | `components/chat/ChatWindow.tsx:106-124` |
| ☐ | ☐ | No reconnect/catch-up logic — messages sent during a dropped connection are lost | `components/chat/ChatWindow.tsx:48-70` |
| ☐ | ☐ | Poll vote handler has no double-submit guard — rapid clicks produce wrong counts | `components/social/PollComments.tsx:95-165` |
| ☐ | ☐ | No edit affordance on comments; no moderation/report action anywhere | `components/social/CommentItem.tsx` |
| ☐ | ☐ | Discussion UX fragmented across 3 unrelated component patterns (chat/thread/poll) | `app/courses/[id]/page.tsx:655-660`, community post/[id] |

### Community
| Fixed | Tested | Finding | Ref |
|---|---|---|---|
| ☐ | ☐ | All 6 create flows (petitions/events/funds/projects/polls) only check auth on submit — full data loss for logged-out users | `app/community/petitions/create/page.tsx:41` (+5 siblings) |
| ☐ | ☐ | Bot-generated content has zero visible marker anywhere in the UI | `lib/bot-engagement/engine.ts:315` |
| ☐ | ☐ | Post detail page doesn't hydrate like/comment-count state — shows unliked + throws on re-like | `app/community/post/[id]/page.tsx:19` |

### Instructor & admin
| Fixed | Tested | Finding | Ref |
|---|---|---|---|
| ☐ | ☐ | Instructor-to-student messaging is a one-way dead end — "Message All" and row actions unwired | `app/instructor/students/page.tsx:116-119, 236-238` |
| ☐ | ☐ | 3 instructor settings controls look live but do nothing (notifications, change password, discard) | `app/instructor/settings/page.tsx:229, 250-254, 321` |
| ☐ | ☐ | Deleting a lesson runs 2 untransacted deletes, orphaning shared modules and attached quizzes | `EditCourseClient.tsx:542-560` |

### Accessibility
| Fixed | Tested | Finding | Ref |
|---|---|---|---|
| ☐ | ☐ | Login/signup error banners have no `role="alert"`/`aria-live` | `LoginContent.tsx:115-123`, `SignupContent.tsx:189-197` |
| ☐ | ☐ | No skip-to-content link anywhere in the app | `app/layout.tsx` |

### Landing page
| Fixed | Tested | Finding | Ref |
|---|---|---|---|
| ☐ | ☐ | Hero makes contradictory trust claims ("500K+ missions" vs. "sample preview") in one scroll | `app/page.tsx:493, 891` |
| ☐ | ☐ | ~4MB of decorative hero imagery, 3 pieces marked `priority`, one 474KB unoptimized SVG | `components/landing/HeroPhoneMockup.tsx:70` |

*(Remaining High items not itemized individually above are covered by the grouped Phase 2 task clusters in the implementation plan — check them off there and mirror the checkbox back here as clusters close.)*

**Phase 2 exit gate:** ☐ every row above Fixed + Tested · ☐ regression pass on Phase 1 items (nothing reopened)

---

## Phase 3 & 4 — Medium (78) + Low (39) backlog

These are tracked as **workstreams**, not individual rows — see the implementation plan's "Phase 3 & 4" section for why. Check off each workstream once its own follow-up plan is fully executed and its findings verified against the original audit artifact.

| Fixed | Tested | Workstream | Approx. findings covered |
|---|---|---|---|
| ☐ | ☐ | Visual design-system reconciliation (landing/onboarding vs. auth/dashboard/courses) | ~8 |
| ☐ | ☐ | Discussion/comment component consolidation | ~5 |
| ☐ | ☐ | Bot-engagement disclosure badge, app-wide | ~2 |
| ☐ | ☐ | Community sub-navigation (13 areas, only 6 linked) | ~6 |
| ☐ | ☐ | Dark-mode parity sweep (dashboard, instructor/courses, landing) | ~6 |
| ☐ | ☐ | Pagination sweep (community feed/topic/impact, admin tabs, catalog, chat/comment history) | ~10 |
| ☐ | ☐ | Accessibility sweep (quiz/chat a11y beyond Phase 2, captions, focus management) | ~8 |
| ☐ | ☐ | Dashboard widget cleanup (duplicate stats, loading-state consistency, timezone bucketing) | ~10 |
| ☐ | ☐ | My Learning / course browse polish (empty-state precision, pagination windowing, resume deep-linking) | ~10 |
| ☐ | ☐ | Instructor/admin polish (empty states, dark mode, review-status honesty, pagination) | ~8 |
| ☐ | ☐ | SCORM/chat/quiz remaining Medium items (ordering, resume, unread indicators, retake UX) | ~10 |
| ☐ | ☐ | Remaining Low-severity copy/link/icon/dead-code cleanup | ~34 |

---

## Sign-off

- [ ] All Phase 1 rows Fixed + Tested
- [ ] All Phase 2 rows Fixed + Tested
- [ ] All Phase 3/4 workstreams closed (or explicitly deferred with the user's sign-off)
- [ ] Full re-run of the live student journey (signup → onboarding → dashboard → enroll → learn → quiz → complete) on both desktop and a real/emulated 390px mobile viewport, with no console errors
- [ ] `npm run typecheck && npm run lint && npm run build` clean on the final branch state
