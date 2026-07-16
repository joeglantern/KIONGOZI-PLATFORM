# Kiongozi LMS — UX Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 178 findings from the 2026-07-16 UX/UI audit (14 Critical, 47 High, 78 Medium, 39 Low) so the student journey (landing → signup → onboarding → dashboard → discover → enroll → learn → assess → complete) and the instructor tools work end to end with no dead ends, silent failures, or fabricated data.

**Architecture:** No redesign, no new frameworks. Every fix is scoped to existing files using the existing stack (Next.js 15 App Router, Supabase, TailwindCSS, shadcn/ui, React Query). Phase 1 tasks below are fully specified with verified current code. Phase 2 is organized into concrete task clusters by subsystem. Phases 3–4 are a prioritized backlog — generate follow-up plans for those with this same skill once Phase 1–2 land, since the codebase will have moved.

**Tech Stack:** Next.js 15, TypeScript, TailwindCSS, shadcn/ui, Supabase (`@supabase/ssr`), React Query, Vitest.

## Global Constraints

- Branch: `kiongozi-web-platform-v2` (disconnected history from `main` — no PR-to-main; push the branch directly when ready).
- Before editing any file listed below, **re-read its current content first** — line numbers may have drifted since the audit.
- Verification gate before every commit: `npm run typecheck && npm run lint && npm run build` (add `npm test` for any task touching `lib/*`).
- This codebase has a Vitest harness covering pure `lib/` helpers only — **no component/page test harness yet**. Tasks that fix React component/page behavior use manual verification steps (exact repro + expected result) instead of fabricated component tests. Tasks that touch `lib/` logic use real Vitest TDD.
- One task = one commit. Do not bundle unrelated fixes into the same commit.
- Never weaken auth, RLS, or role gating while fixing a bug — a fix must not reduce the current security posture.
- Preserve the existing visual language of whatever file you're touching (don't redesign a page while fixing a bug in it — visual consistency is its own Phase 3 workstream).
- No new dependencies without checking `package.json` first and confirming with the user.

---

## Phase 1 — Stop the Bleeding (Critical, do first)

These are the issues that strand a student or instructor completely, or represent a real security exposure. Each task below was verified against the actual current source during planning.

### Task 1: Onboarding `finish()` can hang forever with no error feedback

**Files:**
- Modify: `app/onboarding/page.tsx:127-163`

**Interfaces:**
- No new exports. Internal to `OnboardingContent`.

**Problem:** `finish()` chains four sequential Supabase calls with zero `try/catch`. If any call throws (not just returns `{error}`), `setSaving(false)` is never reached and the "Start my path" button spins forever. Live-reproduced on 2/2 fresh signups during the audit.

- [ ] **Step 1: Read the current file**

Read `app/onboarding/page.tsx` in full to confirm lines 127-163 still match:

```typescript
const finish = async () => {
    if (!user || !goal || !county || selectedInterests.length < 2) return;
    setSaving(true);
    setError("");
    const { error: updateError } = await supabase.from("profiles").update({
      onboarding_goal: goal,
      learning_interests: selectedInterests,
      county,
      institution_name: institution.trim() || null,
      daily_goal_minutes: dailyGoal,
      focus_path: focusPath,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);

    if (updateError) {
      setError(updateError.message || "We could not save your learning path.");
      setSaving(false);
      return;
    }

    // Keep enrollment aligned with the final path choice. Existing enrollment is preserved.
    const startingCourseId = await findStartingCourseIdForPath(supabase, focusPath);
    if (startingCourseId) {
      const { error: enrollmentError } = await supabase.from("course_enrollments").upsert({
        user_id: user.id,
        course_id: startingCourseId,
        status: "active",
        progress_percentage: 0,
        enrolled_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
      }, { onConflict: "user_id,course_id", ignoreDuplicates: true });
      if (enrollmentError) console.error("Path enrollment failed:", enrollmentError);
    }
    await refreshProfile();
    router.replace("/dashboard?welcome=1");
  };
```

- [ ] **Step 2: Replace with a version that can't hang**

```typescript
const finish = async () => {
    if (!user || !goal || !county || selectedInterests.length < 2) return;
    setSaving(true);
    setError("");
    try {
      const { error: updateError } = await supabase.from("profiles").update({
        onboarding_goal: goal,
        learning_interests: selectedInterests,
        county,
        institution_name: institution.trim() || null,
        daily_goal_minutes: dailyGoal,
        focus_path: focusPath,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);

      if (updateError) {
        setError(updateError.message || "We could not save your learning path.");
        setSaving(false);
        return;
      }

      // Keep enrollment aligned with the final path choice. Existing enrollment is preserved.
      const startingCourseId = await findStartingCourseIdForPath(supabase, focusPath);
      if (startingCourseId) {
        const { error: enrollmentError } = await supabase.from("course_enrollments").upsert({
          user_id: user.id,
          course_id: startingCourseId,
          status: "active",
          progress_percentage: 0,
          enrolled_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
        }, { onConflict: "user_id,course_id", ignoreDuplicates: true });
        if (enrollmentError) console.error("Path enrollment failed:", enrollmentError);
      }
      await refreshProfile();
      router.replace("/dashboard?welcome=1");
    } catch (err) {
      console.error("Onboarding finish failed:", err);
      setError("Something went wrong saving your path. Please try again.");
      setSaving(false);
    }
  };
```

This closes the hang for every step in the chain (`profiles.update`, `findStartingCourseIdForPath`, `course_enrollments.upsert`, `refreshProfile`) with one wrapper — any thrown exception now lands in `catch`, resets `saving`, and shows a recoverable error instead of a permanent spinner.

- [ ] **Step 3: Manual verification**

Run `npm run dev`, sign up a new test account, and complete all 5 onboarding steps. Click "Start my path" and confirm it either navigates to `/dashboard?welcome=1` or (to prove the fix) temporarily throw inside the try block (`throw new Error('test')` right after `setSaving(true)`) and confirm the button stops spinning and shows the error message instead of hanging. Remove the temporary throw before committing.

- [ ] **Step 4: Commit**

```bash
git add app/onboarding/page.tsx
git commit -m "fix(onboarding): prevent finish() from hanging forever on network/db errors"
```

---

### Task 2: Instructor area cannot scroll on mobile or small laptops

**Files:**
- Modify: `app/instructor/components/InstructorShell.tsx`

**Problem:** The shell is `fixed inset-0 overflow-hidden`; its `<main>` has no `overflow-y-auto` and its flex column has no `min-h-0`. Content taller than one viewport is clipped and unreachable.

- [ ] **Step 1: Confirm current code** (verified during planning, lines 13-54):

```tsx
export function InstructorShell({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        // This shell covers the root layout's <main pt-16> and <Footer> completely.
        <div className="fixed inset-0 flex bg-gray-50 dark:bg-gray-950 transition-colors overflow-hidden z-50">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block w-64 fixed inset-y-0">
                <ErrorBoundary fallbackMessage="Sidebar Error">
                    <InstructorSidebar />
                </ErrorBoundary>
            </div>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 transform transition-transform duration-200 ease-in-out lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <ErrorBoundary fallbackMessage="Sidebar Error">
                    <InstructorSidebar />
                </ErrorBoundary>
            </div>

            {/* Main Content */}
            <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
                <ErrorBoundary fallbackMessage="Navbar Error">
                    <InstructorNavbar onMenuClick={() => setSidebarOpen(true)} />
                </ErrorBoundary>
                <main className="flex-1 p-4 lg:p-8">
                    <ErrorBoundary>
                        {children}
                    </ErrorBoundary>
                </main>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Make the content column actually scroll**

Change line 42's wrapper and line 46's `<main>`:

```tsx
            {/* Main Content */}
            <div className="flex-1 lg:ml-64 flex flex-col h-screen min-h-0">
                <ErrorBoundary fallbackMessage="Navbar Error">
                    <InstructorNavbar onMenuClick={() => setSidebarOpen(true)} />
                </ErrorBoundary>
                <main className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-8">
                    <ErrorBoundary>
                        {children}
                    </ErrorBoundary>
                </main>
            </div>
```

(`h-screen min-h-0` on the column lets the flex child actually shrink instead of growing with content; `min-h-0 overflow-y-auto` on `<main>` gives that column its own scrollbar.)

- [ ] **Step 3: Verify the course editor still works**

`app/instructor/courses/[id]/edit/EditCourseClient.tsx` compensates for today's non-scrolling shell with negative margins and a fixed height (per the audit: `-m-4 lg:-m-8` + `calc(100vh - 64px)`). Open that page after the change and confirm it doesn't now have double scrollbars or clipped content — if it does, remove its compensating negative-margin/height overrides so it inherits the shell's new scroll behavior instead of fighting it.

- [ ] **Step 4: Manual verification**

At 390×844 viewport (or real phone), open `/instructor/dashboard`, `/instructor/courses`, `/instructor/students`, `/instructor/settings` — confirm you can scroll to and interact with the last element on each page (e.g. the Settings save button).

- [ ] **Step 5: Commit**

```bash
git add app/instructor/components/InstructorShell.tsx
git commit -m "fix(instructor): make shell content scrollable on mobile and small laptops"
```

---

### Task 3: Lesson notes can silently fail to save while showing "Saved"

**Files:**
- Modify: `app/courses/[id]/modules/[moduleId]/ModuleViewerClient.tsx:468-497` (autosave effect) and `:1039-1061` (indicator + textarea)

**Problem:** The autosave catch-block only logs to console; the indicator is a binary `isSavingNotes ? "Saving…" : "Saved"` with no success check — a failed write still shows "Saved."

- [ ] **Step 1: Confirm current code** (verified during planning):

```tsx
    // Auto-save notes
    const initialNotesRef = useRef<string | null>(null);
    useEffect(() => {
        initialNotesRef.current = notes;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [moduleId]);

    useEffect(() => {
        if (isPreviewMode) return;
        if (initialNotesRef.current === null || notes === initialNotesRef.current) return;
        const timer = setTimeout(async () => {
            try {
                setIsSavingNotes(true);
                await supabase
                    .from('user_progress')
                    .upsert({
                        user_id: userId,
                        module_id: moduleId,
                        course_id: courseId,
                        notes,
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'user_id, module_id' });
            } catch (error) {
                console.error('Error saving notes:', error);
            } finally {
                setIsSavingNotes(false);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [notes, userId, moduleId, courseId, isPreviewMode, supabase]);
```

and the indicator/textarea:

```tsx
                                                                {isSavingNotes ? (
                                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                                                                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                                                        <span className="uppercase tracking-wider">Saving...</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-500">
                                                                        <Save className="w-2.5 h-2.5" />
                                                                        <span className="uppercase tracking-wider">Saved</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <textarea
                                                                value={notes}
                                                                onChange={(e) => setNotes(e.target.value)}
                                                                disabled={isPreviewMode}
                                                                placeholder={
                                                                    isPreviewMode
                                                                        ? 'Preview mode does not save personal notes.'
                                                                        : 'Type your notes here... Your insights, questions, or key takeaways. They are saved automatically for your future reference.'
                                                                }
                                                                className="w-full h-32 p-4 rounded-xl bg-gray-55 border-gray-100 focus:border-orange-500 focus:ring-orange-500 transition-all resize-none font-medium text-sm placeholder:text-gray-300 disabled:opacity-60"
                                                            />
```

- [ ] **Step 2: Find the `isSavingNotes` state declaration**

Search the file for `const [isSavingNotes` and note its location — you'll add a sibling state next to it.

- [ ] **Step 3: Add a real save-status enum next to `isSavingNotes`**

Replace the boolean with a status union (find the existing `useState` line and change it):

```tsx
    const [notesSaveStatus, setNotesSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
```

Remove the old `isSavingNotes` state declaration and every other reference to `isSavingNotes`/`setIsSavingNotes` in this file (grep the file for both identifiers first — there should be exactly the two spots shown above).

- [ ] **Step 4: Rewrite the autosave effect to only claim success on success**

```tsx
    useEffect(() => {
        if (isPreviewMode) return;
        if (initialNotesRef.current === null || notes === initialNotesRef.current) return;
        const timer = setTimeout(async () => {
            setNotesSaveStatus('saving');
            try {
                const { error } = await supabase
                    .from('user_progress')
                    .upsert({
                        user_id: userId,
                        module_id: moduleId,
                        course_id: courseId,
                        notes,
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'user_id, module_id' });
                if (error) throw error;
                setNotesSaveStatus('saved');
            } catch (error) {
                console.error('Error saving notes:', error);
                setNotesSaveStatus('error');
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [notes, userId, moduleId, courseId, isPreviewMode, supabase]);

    const retryNotesSave = useCallback(async () => {
        setNotesSaveStatus('saving');
        try {
            const { error } = await supabase
                .from('user_progress')
                .upsert({
                    user_id: userId,
                    module_id: moduleId,
                    course_id: courseId,
                    notes,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id, module_id' });
            if (error) throw error;
            setNotesSaveStatus('saved');
        } catch (error) {
            console.error('Error saving notes (retry):', error);
            setNotesSaveStatus('error');
        }
    }, [notes, userId, moduleId, courseId, supabase]);
```

- [ ] **Step 5: Rewrite the indicator to show all three real states, and fix the invisible textarea**

```tsx
                                                                {notesSaveStatus === 'saving' && (
                                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                                                                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                                                        <span className="uppercase tracking-wider">Saving...</span>
                                                                    </div>
                                                                )}
                                                                {notesSaveStatus === 'saved' && (
                                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-500">
                                                                        <Save className="w-2.5 h-2.5" />
                                                                        <span className="uppercase tracking-wider">Saved</span>
                                                                    </div>
                                                                )}
                                                                {notesSaveStatus === 'error' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={retryNotesSave}
                                                                        className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 hover:text-red-600"
                                                                    >
                                                                        <span className="uppercase tracking-wider">Not saved — retry</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <textarea
                                                                value={notes}
                                                                onChange={(e) => setNotes(e.target.value)}
                                                                disabled={isPreviewMode}
                                                                placeholder={
                                                                    isPreviewMode
                                                                        ? 'Preview mode does not save personal notes.'
                                                                        : 'Type your notes here... Your insights, questions, or key takeaways. They are saved automatically for your future reference.'
                                                                }
                                                                className="w-full h-32 p-4 rounded-xl bg-gray-50 border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 transition-all resize-none font-medium text-sm placeholder:text-gray-300 disabled:opacity-60"
                                                            />
```

(Also fixes the invisible-textarea bug from the same finding: `bg-gray-55` → `bg-gray-50`, added `border` + `border-gray-200`, added `focus:ring-2` — the old classes emitted no background/border/ring because those Tailwind shades/utilities don't exist.)

- [ ] **Step 6: Retry automatically when connectivity returns**

Add next to the other effects in the component:

```tsx
    useEffect(() => {
        const handleOnline = () => {
            if (notesSaveStatus === 'error') retryNotesSave();
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [notesSaveStatus, retryNotesSave]);
```

- [ ] **Step 7: Manual verification**

Open a lesson's summary slide, type in the notes field, and confirm "Saving…" → "Saved" appears normally. Then open browser devtools, go offline (Network tab → Offline), type again, and confirm the indicator shows "Not saved — retry" instead of "Saved." Go back online and click "Not saved — retry"; confirm it flips to "Saved."

- [ ] **Step 8: Commit**

```bash
git add app/courses/[id]/modules/[moduleId]/ModuleViewerClient.tsx
git commit -m "fix(learning): stop showing false 'Saved' on failed notes autosave; fix invisible textarea styling"
```

---

### Task 4: Any lesson slide with an HTML tag crashes on server render

**Files:**
- Modify: `components/learning/MarkdownRenderer.tsx:44-63`

**Problem:** `DOMPurify.sanitize()` is called unconditionally in a component that is server-rendered on hard navigation/refresh; `DOMPurify` has no `sanitize` method without a `window`, so the call throws.

- [ ] **Step 1: Confirm current code** (verified during planning):

```tsx
export const MarkdownRenderer = memo(function MarkdownRenderer({ content }: MarkdownRendererProps) {
    const hasHtml = looksLikeHtml(content);
    const sanitizedHtml = useMemo(() => {
        if (!hasHtml) {
            return '';
        }

        return DOMPurify.sanitize(content, {
            USE_PROFILES: { html: true },
        });
    }, [content, hasHtml]);

    if (hasHtml) {
        return (
            <div
                className={proseClassName}
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
        );
    }
```

- [ ] **Step 2: Check `package.json` for `isomorphic-dompurify`**

```bash
node -e "console.log(require('./package.json').dependencies['isomorphic-dompurify'] || 'NOT INSTALLED')"
```

If not installed, do not add a new dependency without checking with the user first — use the window-guard approach in Step 3 instead (no new dependency).

- [ ] **Step 3: Guard the sanitize call so SSR never calls into DOMPurify**

```tsx
export const MarkdownRenderer = memo(function MarkdownRenderer({ content }: MarkdownRendererProps) {
    const hasHtml = looksLikeHtml(content);
    const sanitizedHtml = useMemo(() => {
        if (!hasHtml) {
            return '';
        }
        if (typeof window === 'undefined') {
            // DOMPurify has no sanitize() without a window (SSR/hard navigation).
            // Render nothing server-side; the client render below will sanitize
            // and hydrate correctly once window exists.
            return '';
        }

        return DOMPurify.sanitize(content, {
            USE_PROFILES: { html: true },
        });
    }, [content, hasHtml]);

    if (hasHtml) {
        return (
            <div
                className={proseClassName}
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                suppressHydrationWarning
            />
        );
    }
```

`suppressHydrationWarning` is required here because the server output (empty string) and first client render (real sanitized HTML) intentionally differ for this one node — without it React logs a hydration mismatch warning even though the behavior is correct.

- [ ] **Step 4: Manual verification**

Find or create a lesson slide containing a raw HTML tag (e.g. `<br>` or `<strong>test</strong>` mixed into the content). Load the module page with a **hard refresh** (not client navigation) and confirm the page renders instead of crashing to `app/courses/error.tsx`. Confirm the HTML content appears correctly once the client hydrates (may show blank for a frame, then populate — that's expected and correct).

- [ ] **Step 5: Commit**

```bash
git add components/learning/MarkdownRenderer.tsx
git commit -m "fix(learning): guard DOMPurify against server-side rendering crash"
```

---

### Task 5: Password recovery is unreachable for anyone with incomplete onboarding

**Files:**
- Modify: `app/contexts/UserContext.tsx:60-83`

**Problem:** The global profile-completion interceptor redirects any signed-in "user" account without `onboarding_completed_at` away from every route except `/complete-profile` and `/onboarding`. `/reset-password` is not exempt, so opening a recovery link gets the student bounced into onboarding before they can type a new password — consuming the single-use link.

- [ ] **Step 1: Confirm current code** (verified during planning, lines 60-83):

```tsx
  // Profile completion interceptor
  useEffect(() => {
    if (!loading && user && profile) {
      const hasDisplayName = Boolean(profile.first_name?.trim() || profile.full_name?.trim());
      const isMissingInfo = !profile.username || !hasDisplayName;
      const isCurrentlyCompleting = pathname === '/complete-profile';
      const isCurrentlyOnboarding = pathname === '/onboarding';

      // Prevent routing loops
      if (isMissingInfo && !isCurrentlyCompleting) {
        const nextParam = pathname && pathname !== '/complete-profile'
          ? `?next=${encodeURIComponent(pathname)}`
          : '';
        router.replace(`/complete-profile${nextParam}`);
      } else if (
        profile.role === 'user' &&
        !profile.onboarding_completed_at &&
        !isCurrentlyCompleting &&
        !isCurrentlyOnboarding
      ) {
        router.replace('/onboarding');
      }
    }
  }, [loading, user, profile, pathname, router]);
```

- [ ] **Step 2: Add an exempt-paths check before either redirect**

```tsx
  // Routes where the profile-completion/onboarding gate must never fire —
  // primarily auth flows the user may reach mid-recovery with an incomplete profile.
  const AUTH_EXEMPT_PATHS = ['/reset-password', '/forgot-password', '/auth/callback', '/auth/auth-code-error'];

  // Profile completion interceptor
  useEffect(() => {
    if (!loading && user && profile) {
      const isAuthExempt = AUTH_EXEMPT_PATHS.some(
        (p) => pathname === p || pathname?.startsWith(`${p}/`)
      );
      if (isAuthExempt) return;

      const hasDisplayName = Boolean(profile.first_name?.trim() || profile.full_name?.trim());
      const isMissingInfo = !profile.username || !hasDisplayName;
      const isCurrentlyCompleting = pathname === '/complete-profile';
      const isCurrentlyOnboarding = pathname === '/onboarding';

      // Prevent routing loops
      if (isMissingInfo && !isCurrentlyCompleting) {
        const nextParam = pathname && pathname !== '/complete-profile'
          ? `?next=${encodeURIComponent(pathname)}`
          : '';
        router.replace(`/complete-profile${nextParam}`);
      } else if (
        profile.role === 'user' &&
        !profile.onboarding_completed_at &&
        !isCurrentlyCompleting &&
        !isCurrentlyOnboarding
      ) {
        router.replace('/onboarding');
      }
    }
  }, [loading, user, profile, pathname, router]);
```

Place the `AUTH_EXEMPT_PATHS` constant at module scope (outside `UserProvider`), not inside the component, since it's a static list — put it near the top of the file next to the other module-level constants/types.

- [ ] **Step 3: Manual verification**

Create a test account and stop right after email confirmation, before doing onboarding (so `onboarding_completed_at` is null). Trigger a password-reset email for that account, open the reset link, and confirm you land on and stay on `/reset-password` — not redirected to `/onboarding`. Complete the reset and confirm normal onboarding still triggers on the *next* page you visit that isn't exempt (e.g. `/dashboard`).

- [ ] **Step 4: Commit**

```bash
git add app/contexts/UserContext.tsx
git commit -m "fix(auth): exempt password-recovery routes from the onboarding interceptor"
```

---

### Task 6: Dashboard charts fabricate random data instead of showing an honest empty state

**Files:**
- Modify: `components/dashboard/CategoryBarChart.tsx:22-32`
- Modify: `components/dashboard/XPLineChart.tsx:22-33`
- Modify: `app/dashboard/page.tsx` (wherever these two components are rendered — grep for `<CategoryBarChart` and `<XPLineChart`)

**Problem:** Both charts fall back to `Math.random()`-generated values whenever their `data` prop is empty — which is every time for a brand-new student. The category chart even invents category names ("Ops," "Tech") that don't exist in the platform's taxonomy.

- [ ] **Step 1: Confirm current code — `CategoryBarChart.tsx`** (verified during planning, lines 22-32):

```tsx
export function CategoryBarChart({ data, loading }: CategoryBarChartProps) {
    // Generate mock data if none provided
    const chartData = useMemo(() => {
        if (data && data.length > 0) return data;

        const categories = ['Leadership', 'Strategy', 'Communication', 'Ops', 'Tech'];
        return categories.map((cat, i) => ({
            category: cat,
            progress: Math.floor(Math.random() * 60) + 20,
        }));
    }, [data]);
```

- [ ] **Step 2: Remove the mock fallback and add a real empty state**

```tsx
export function CategoryBarChart({ data, loading }: CategoryBarChartProps) {
    const chartData = data ?? [];
    const isEmpty = !loading && chartData.length === 0;

    if (loading) {
        return (
            <div className="h-[300px] w-full bg-white rounded-3xl animate-pulse flex items-center justify-center border border-gray-100">
                <div className="text-gray-300 font-bold uppercase tracking-widest text-xs">Loading Progress...</div>
            </div>
        );
    }

    if (isEmpty) {
        return (
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-none h-[350px] flex flex-col">
                <h3 className="text-lg font-bold text-gray-900 tracking-tight mb-6">Category Breakdown</h3>
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
                    <p className="text-sm font-semibold text-gray-500">No category data yet</p>
                    <p className="text-xs text-gray-400 max-w-[220px]">Enroll in a course to see your progress by category here.</p>
                </div>
            </div>
        );
    }

    return (
```

(delete the old `if (loading) { ... }` block further down in the file since it's now handled above the empty-state check — search for the duplicate and remove it, keeping only the JSX return that renders the actual `<ResponsiveContainer>` chart.)

- [ ] **Step 3: Confirm current code — `XPLineChart.tsx`** (verified during planning, lines 22-33):

```tsx
export function XPLineChart({ data, loading }: XPLineChartProps) {
    // Generate mock data if none provided
    const chartData = useMemo(() => {
        if (data && data.length > 0) return data;

        // Mock data for the last 7 days
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return days.map((day, i) => ({
            date: day,
            xp: Math.floor(Math.random() * 500) + 100 * (i + 1),
        }));
    }, [data]);
```

- [ ] **Step 4: Apply the same fix to `XPLineChart.tsx`**

```tsx
export function XPLineChart({ data, loading }: XPLineChartProps) {
    const chartData = data ?? [];
    const isEmpty = !loading && chartData.length === 0;

    if (loading) {
        return (
            <div className="h-[300px] w-full bg-white rounded-3xl animate-pulse flex items-center justify-center border border-gray-100">
                <div className="text-gray-300 font-bold uppercase tracking-widest text-xs">Loading Activity...</div>
            </div>
        );
    }

    if (isEmpty) {
        return (
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm h-[350px] flex flex-col">
                <h3 className="text-lg font-bold text-gray-900 tracking-tight mb-6">Learning Activity</h3>
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
                    <p className="text-sm font-semibold text-gray-500">No activity yet</p>
                    <p className="text-xs text-gray-400 max-w-[220px]">Earn XP by completing lessons to see your activity here.</p>
                </div>
            </div>
        );
    }

    return (
```

Again, remove the now-duplicated `if (loading)` block later in the file.

- [ ] **Step 5: Make sure the dashboard actually passes `loading` through**

Open `app/dashboard/page.tsx`, find where `<CategoryBarChart` and `<XPLineChart` are rendered, and confirm each receives a `loading={...}` prop tied to the page's real fetch-loading state (per the audit, the page's `loading` flag was not being passed through — check and add `loading={loading}`, matching whatever the page's existing loading-state variable is named, if it's missing).

- [ ] **Step 6: Manual verification**

Sign in as a brand-new student with zero enrollments and zero XP. Confirm both dashboard charts show the new empty-state copy — not a chart with invented numbers. Then, as a student with real enrollment/XP history, confirm both charts render their real data as before.

- [ ] **Step 7: Commit**

```bash
git add components/dashboard/CategoryBarChart.tsx components/dashboard/XPLineChart.tsx app/dashboard/page.tsx
git commit -m "fix(dashboard): remove fabricated random chart data, add honest empty states"
```

---

### Task 7: Enroll button is clipped off-screen on real phone widths

**Files:**
- Modify: `app/courses/[id]/page.tsx:412-456`

**Problem:** The course header never stacks vertically; the enrollment card is fixed at `min-w-[280px]` next to a flexible title column with no `min-w-0`. On a 360px viewport the card overflows and is clipped by the app's global horizontal-overflow guard.

- [ ] **Step 1: Confirm current code** (verified during planning):

```tsx
                    {/* Course Header */}
                    <div className="bg-white rounded-xl shadow-lg p-8 mb-6 border border-gray-100">
                        <div className="flex items-start justify-between gap-6 mb-6">
                            <div className="flex-1">
```

...and further down:

```tsx
                            {/* Enrollment Card */}
                            <div className="bg-gray-50 rounded-lg p-6 border-2 border-orange-200 min-w-[280px]">
```

- [ ] **Step 2: Stack on mobile, row on desktop**

Change the header row's className:

```tsx
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
                            <div className="flex-1 min-w-0">
```

And the enrollment card's className:

```tsx
                            {/* Enrollment Card */}
                            <div className="w-full lg:w-auto bg-gray-50 rounded-lg p-6 border-2 border-orange-200 lg:min-w-[280px]">
```

- [ ] **Step 3: Manual verification**

At a 360×800 viewport, open any course detail page and confirm the "Enroll Now" / "Continue Learning" card renders full-width below the title/description block with no horizontal clipping, and confirm the desktop layout (≥1024px) is visually unchanged from before — enrollment card still sits to the right of the title.

- [ ] **Step 4: Commit**

```bash
git add "app/courses/[id]/page.tsx"
git commit -m "fix(courses): stack course header on mobile so Enroll card isn't clipped"
```

---

### Task 8: Quiz countdown timer never actually starts

**Files:**
- Modify: `components/quiz/QuizPlayer.tsx:168-178`

**Problem:** The timer effect's dependency array is `[submitted, timeLeft === 0]`. On mount `timeLeft` is `null`, so the effect returns early without creating an interval. When `fetchQuizData` later calls `setTimeLeft(minutes * 60)`, the dependency value `timeLeft === 0` is still `false` before and after, so the effect never re-runs and no interval is ever created — the countdown is purely decorative and the badge shows a permanently frozen time.

- [ ] **Step 1: Confirm current code** (verified during planning, lines 168-178):

```tsx
    useEffect(() => {
        if (timeLeft === null || submitted) return;
        if (timeLeft === 0) { handleSubmit(); return; }
        const timer = setInterval(() => {
            setTimeLeft(prev => (prev !== null ? prev - 1 : null));
        }, 1000);
        return () => clearInterval(timer);
    // Only restart the interval when submitted changes or timeLeft hits 0 —
    // not on every tick, which was causing the whole page to re-render each second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [submitted, timeLeft === 0]);
```

- [ ] **Step 2: Depend on whether a timer is armed at all, not on the never-changing boolean**

```tsx
    const hasTimer = timeLeft !== null;
    useEffect(() => {
        if (timeLeft === null || submitted) return;
        if (timeLeft === 0) { handleSubmit(); return; }
        const timer = setInterval(() => {
            setTimeLeft(prev => (prev !== null ? prev - 1 : null));
        }, 1000);
        return () => clearInterval(timer);
    // Restart when the timer arms (null -> number), on each submitted change,
    // and when timeLeft hits exactly 0 — not on every tick (which caused a
    // whole-page re-render every second).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasTimer, submitted, timeLeft === 0]);
```

`hasTimer` flips from `false` to `true` exactly once, the moment `fetchQuizData` sets a real `timeLeft` value — that transition now correctly re-runs the effect and creates the interval. Subsequent per-second ticks still don't re-run it, preserving the original performance fix's intent.

- [ ] **Step 3: Manual verification**

Open a quiz whose `time_limit_minutes` is set to a small nonzero value (e.g. 1 minute) in the seed/test data. Confirm the countdown badge visibly ticks down once per second after the quiz loads, and confirm it auto-submits when it reaches 0. Then open a quiz with no time limit and confirm no timer UI appears and nothing auto-submits.

- [ ] **Step 4: Commit**

```bash
git add components/quiz/QuizPlayer.tsx
git commit -m "fix(quiz): countdown timer now actually starts (stale dependency array)"
```

---

### Task 9: Two unrelated "Step 1 of 5" onboarding systems can both fire

**Files:**
- Modify: `components/dashboard/DashboardTour.tsx`

**Problem:** `DashboardTour` gates itself purely on a `localStorage` flag (`kiongozi_dashboard_tour_completed`) with zero awareness of the `/onboarding` wizard or `profile.onboarding_completed_at`. A student who lands on `/dashboard` before or without finishing the real onboarding wizard sees this second, unrelated "welcome tour" — live-reproduced during the audit.

- [ ] **Step 1: Confirm current code** (verified during planning, lines 60-70):

```tsx
export function DashboardTour() {
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    // Check if user has completed the tour already
    const completed = localStorage.getItem('kiongozi_dashboard_tour_completed');
    if (!completed) {
      setCurrentStep(0);
    }
  }, []);
```

- [ ] **Step 2: Find where `<DashboardTour />` is rendered**

```bash
grep -rn "DashboardTour" app/dashboard
```

Read that usage site (likely `app/dashboard/page.tsx`) to see whether `profile.onboarding_completed_at` is already in scope there.

- [ ] **Step 3: Gate the tour on onboarding completion**

Add a prop instead of reading global state inside the tour component (keeps it a presentational component, consistent with its current design):

```tsx
export function DashboardTour({ onboardingCompleted }: { onboardingCompleted: boolean }) {
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!onboardingCompleted) return;
    // Check if user has completed the tour already
    const completed = localStorage.getItem('kiongozi_dashboard_tour_completed');
    if (!completed) {
      setCurrentStep(0);
    }
  }, [onboardingCompleted]);
```

- [ ] **Step 4: Pass the prop from the render site**

In `app/dashboard/page.tsx` (or wherever Step 2 found the usage), change:

```tsx
<DashboardTour />
```

to:

```tsx
<DashboardTour onboardingCompleted={Boolean(profile?.onboarding_completed_at)} />
```

using whatever the page's existing `profile` variable is named (it already fetches the profile elsewhere on this page per the audit — reuse that, don't add a new fetch).

- [ ] **Step 5: Manual verification**

Sign up a new account and, without completing the 5-step `/onboarding` wizard, navigate directly to `/dashboard` via URL. Confirm the "Habari! Welcome to Kiongozi!" tour does **not** appear. Then complete onboarding normally and confirm arriving at `/dashboard?welcome=1` afterward **does** show the tour (first time only — verify it doesn't reappear on a second visit).

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/DashboardTour.tsx app/dashboard/page.tsx
git commit -m "fix(dashboard): don't show the dashboard welcome tour before onboarding is complete"
```

---

### Task 10: "Messages" nav item is a 404 for every student

**Files:**
- Create: `app/messages/page.tsx`
- Modify: `middleware.ts` (add `/messages` to the matcher if not already present — it is already listed, confirm) and `app/utils/supabase/middleware.ts` `PROTECTED_PREFIXES` (add `/messages` if missing)

**Problem:** The student sidebar's `Messages` link and the course page's "Message Instructor" button both point at `/messages`. No page exists there — only the instructor-only inbox at `/instructor/messages` does.

- [ ] **Step 1: Confirm the instructor inbox pattern to mirror** (verified during planning — `app/instructor/messages/page.tsx` in full):

```tsx
"use client";

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoomList } from '@/components/chat/RoomList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import {
    MessageSquare,
    ArrowLeft,
    Inbox
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstructorMessagesPage() {
    const [selectedRoom, setSelectedRoom] = useState<{
        id: string;
        name: string;
        role: string;
    } | null>(null);

    return (
        <ProtectedRoute allowedRoles={['instructor', 'admin']}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <MessageSquare className="w-8 h-8 text-orange-500" />
                        Messages
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Communicate with your students
                    </p>
                    <div className="mt-4">
                        <Breadcrumb
                            items={[
                                { label: 'Dashboard', href: '/instructor/dashboard' },
                                { label: 'Messages' }
                            ]}
                        />
                    </div>
                </div>

                {/* Chat Layout */}
                <div className="grid lg:grid-cols-12 gap-6 h-[calc(100vh-12rem)] min-h-[600px]">
                    {/* Sidebar - Conversation List */}
                    <div className={`lg:col-span-4 h-full ${selectedRoom ? 'hidden lg:block' : 'block'}`}>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm h-full overflow-hidden">
                            <RoomList
                                currentRoomId={selectedRoom?.id}
                                onSelectRoom={(id, name, role) => setSelectedRoom({ id, name, role })}
                            />
                        </div>
                    </div>

                    {/* Main - Chat Window */}
                    <div className={`lg:col-span-8 h-full ${!selectedRoom ? 'hidden lg:block' : 'block'}`}>
                        <AnimatePresence mode="wait">
                            {selectedRoom ? (
                                <motion.div
                                    key={selectedRoom.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
                                >
                                    <div className="lg:hidden p-4 border-b border-gray-200 dark:border-gray-700">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setSelectedRoom(null)}
                                            className="text-gray-500 hover:text-orange-600 font-bold"
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Back to Inbox
                                        </Button>
                                    </div>
                                    <ChatWindow
                                        roomId={selectedRoom.id}
                                        recipientName={selectedRoom.name}
                                        recipientRole={selectedRoom.role}
                                    />
                                </motion.div>
                            ) : (
                                <div className="h-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center text-center p-12">
                                    <div className="w-24 h-24 bg-orange-50 dark:bg-orange-900/20 rounded-[2rem] flex items-center justify-center text-orange-200 dark:text-orange-700 mb-6">
                                        <Inbox className="w-12 h-12" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Select a Conversation</h3>
                                    <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                                        Choose a student from the list to start messaging.
                                    </p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
```

- [ ] **Step 2: Create `app/messages/page.tsx` as the student-facing equivalent**

```tsx
"use client";

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoomList } from '@/components/chat/RoomList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import {
    MessageSquare,
    ArrowLeft,
    Inbox
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function MessagesPage() {
    const [selectedRoom, setSelectedRoom] = useState<{
        id: string;
        name: string;
        role: string;
    } | null>(null);

    return (
        <ProtectedRoute allowedRoles={['user', 'instructor', 'admin']}>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
                <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <MessageSquare className="w-8 h-8 text-orange-500" />
                            Messages
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Conversations with your instructors
                        </p>
                        <div className="mt-4">
                            <Breadcrumb
                                items={[
                                    { label: 'Dashboard', href: '/dashboard' },
                                    { label: 'Messages' }
                                ]}
                            />
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-12 gap-6 h-[calc(100vh-16rem)] min-h-[600px]">
                        <div className={`lg:col-span-4 h-full ${selectedRoom ? 'hidden lg:block' : 'block'}`}>
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm h-full overflow-hidden">
                                <RoomList
                                    currentRoomId={selectedRoom?.id}
                                    onSelectRoom={(id, name, role) => setSelectedRoom({ id, name, role })}
                                />
                            </div>
                        </div>

                        <div className={`lg:col-span-8 h-full ${!selectedRoom ? 'hidden lg:block' : 'block'}`}>
                            <AnimatePresence mode="wait">
                                {selectedRoom ? (
                                    <motion.div
                                        key={selectedRoom.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
                                    >
                                        <div className="lg:hidden p-4 border-b border-gray-200 dark:border-gray-700">
                                            <Button
                                                variant="ghost"
                                                onClick={() => setSelectedRoom(null)}
                                                className="text-gray-500 hover:text-orange-600 font-bold"
                                            >
                                                <ArrowLeft className="w-4 h-4 mr-2" />
                                                Back to Inbox
                                            </Button>
                                        </div>
                                        <ChatWindow
                                            roomId={selectedRoom.id}
                                            recipientName={selectedRoom.name}
                                            recipientRole={selectedRoom.role}
                                        />
                                    </motion.div>
                                ) : (
                                    <div className="h-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center text-center p-12">
                                        <div className="w-24 h-24 bg-orange-50 dark:bg-orange-900/20 rounded-[2rem] flex items-center justify-center text-orange-200 dark:text-orange-700 mb-6">
                                            <Inbox className="w-12 h-12" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Select a Conversation</h3>
                                        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                                            {"You'll see conversations here once you or an instructor sends the first message from a course page."}
                                        </p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
```

Note the empty-state copy is changed from "Choose a student from the list" (instructor framing) to explain how a student's first conversation gets created, since — per the audit — `RoomList` has no "start a new conversation" compose entry point yet; a student can only see rooms that already exist (created via "Message Instructor" on a course page). That gap is tracked as a Phase 2 follow-up (see Task cluster G below), not solved here — this task's scope is closing the 404.

- [ ] **Step 3: Confirm middleware protects the new route**

Read `middleware.ts` and confirm `/messages/:path*` is already in the `matcher` array (it is, per the audit). Read `app/utils/supabase/middleware.ts` and confirm `/messages` is in `PROTECTED_PREFIXES` (it is). No changes needed here if both already list it — just verify, don't skip this step.

- [ ] **Step 4: Manual verification**

As a logged-in student, click "Messages" in the dashboard sidebar and confirm it loads the new page instead of 404ing. From a course page, use "Message Instructor" and confirm it lands here with a room created/selected (if that flow already creates a room server-side per the audit's chat findings — if it doesn't, note that as a separate bug for Task cluster G, don't try to fix room-creation logic in this task).

- [ ] **Step 5: Commit**

```bash
git add app/messages/page.tsx
git commit -m "feat(messages): add student-facing /messages page (was a 404)"
```

---

### Task 11: SCORM content can hijack a logged-in session (security)

**Files:**
- Investigate: `components/scorm/ScormPlayer.tsx`
- Investigate: `app/api/scorm/[packageId]/serve/[...path]/route.ts`
- Investigate: `app/utils/supabase/cookie-domain.ts`

**Problem:** SCORM packages are served same-origin with sandbox `allow-scripts allow-same-origin` together, and the session cookie is scoped to `.kiongozi.org` (not host-only). Untrusted HTML/JS inside an uploaded SCORM zip can read `document.cookie` and call any same-origin API route with the logged-in user's credentials.

This is a real security exposure, not a simple prop change — treat it as a scoped spike-then-fix, and **get a second pair of eyes (or the `/security-review` skill) on the diff before merging**, since sandbox/cookie changes are easy to get subtly wrong.

- [ ] **Step 1: Read the three files above in full** to confirm the current sandbox string, the serve route's headers, and the cookie domain logic exactly as they exist today (do not assume the audit's quoted lines are still current).

- [ ] **Step 2: Confirm the SCORM runtime API bridge mechanism**

Read how `window.parent.API` / `window.parent.API_1484_11` are wired in `ScormPlayer.tsx` — the serve route's own comment says same-origin is used specifically "so `window.parent.API` is accessible." Understand this dependency before changing origin, since removing `allow-same-origin` naively will break the SCORM runtime shim unless the API bridge is reworked.

- [ ] **Step 3: Choose one of these two fixes and implement it**

**Option A (preferred, larger): Cookieless subdomain.** Serve SCORM content from a separate origin (e.g. `scorm-content.<domain>`) that never receives the session cookie, and replace the direct `window.parent.API` access with a `postMessage`-based bridge (the SCORM shim posts LMSGetValue/LMSSetValue calls to the parent frame, which listens via `window.addEventListener('message', ...)` with an origin check, instead of reading `window.parent.API` directly). This requires DNS/hosting changes — confirm with the user before implementing, since it may need infrastructure outside this repo.

**Option B (smaller, interim mitigation): Drop `allow-same-origin`, keep `allow-scripts`.** This alone breaks direct `window.parent.API` access from inside the iframe (cross-origin-like isolation even though it's still same-origin URL-wise, sandboxed content without `allow-same-origin` is treated as opaque-origin). You would then need the `postMessage` bridge from Option A regardless for the SCORM shim to keep functioning — so Option B is really "Option A's bridge, without the subdomain migration." Discuss with the user which to do given timeline; Option A is the complete fix, Option B is not shippable alone without the same bridge work.

Given both viable options require the same `postMessage` bridge work, recommend defaulting to implementing the bridge first (which fixes the vulnerability regardless of origin), and treating the subdomain move as a fast-follow infrastructure task.

- [ ] **Step 4: Security verification**

After the fix, manually craft a test SCORM package whose `imsmanifest.xml` entry point is a page containing `<script>fetch('/api/whoami',{credentials:'include'}).then(r=>r.text()).then(t=>document.title=t)</script>` (or similar) and confirm it can no longer read `document.cookie` or successfully make an authenticated same-origin fetch from inside the iframe.

- [ ] **Step 5: Commit**

```bash
git add components/scorm/ScormPlayer.tsx "app/api/scorm/[packageId]/serve/[...path]/route.ts"
git commit -m "fix(scorm): close session-hijack vector — postMessage bridge replaces direct window.parent.API access"
```

---

### Task 12: Verify (and if needed, fix) the chat-room RLS policy

**Files:**
- Investigate: current Supabase RLS policies on `chat_participants`, `chat_rooms`, `chat_messages`
- Modify (if confirmed vulnerable): a new migration file under `supabase/migrations/`

**Problem:** A legacy migration (`migrations/fix_all_issues.sql:164-165`, not the canonical `supabase/migrations/` folder) defines `CREATE POLICY "Participants management" ON chat_participants FOR ALL USING (auth.role() = 'authenticated')`, which — combined with `SECURITY DEFINER` room-lookup RPCs — may let any authenticated user self-insert into any room's participants, bypassing UI-level enrollment gating. This was **not** live-verified against the actual current database; do that first.

- [ ] **Step 1: List current migrations and policies**

Use the Supabase MCP tools already configured for this project:

```
mcp__supabase-takasmart__list_migrations
mcp__supabase-takasmart__execute_sql
```

Run:

```sql
select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where tablename in ('chat_participants', 'chat_rooms', 'chat_messages')
order by tablename, policyname;
```

- [ ] **Step 2: Determine if the vulnerable policy is actually live**

Compare the output against the legacy migration text. If the canonical `supabase/migrations/` folder has since superseded it with a tighter policy, mark this finding as resolved/stale in the audit tracking checklist and stop here — no code change needed, just document the verification.

- [ ] **Step 3: If confirmed vulnerable, write a migration that scopes the policy**

If `chat_participants` inserts are not restricted to `auth.uid() = user_id` plus a server-side enrollment/invite check, write a new migration:

```sql
-- supabase/migrations/<timestamp>_fix_chat_participants_rls.sql
drop policy if exists "Participants management" on chat_participants;

create policy "Users can view their own chat participation"
  on chat_participants for select
  using (auth.uid() = user_id);

create policy "Users can join rooms via the enrollment-gated RPC only"
  on chat_participants for insert
  with check (auth.uid() = user_id);
```

(Exact policy shape depends on Step 1's real output — this is a starting point, not a copy-paste-final answer. Cross-check against `get_course_chat_room`/`get_private_chat_room` RPC definitions from the same migration file to make sure the RPCs' own enrollment checks are preserved as the actual gate, and that this policy doesn't block legitimate inserts those RPCs perform.)

- [ ] **Step 4: Apply and verify**

Apply via `mcp__supabase-takasmart__apply_migration`, then attempt to manually insert a `chat_participants` row for a room the test user is not enrolled in (via the Supabase client, not the RPC) and confirm it's now rejected, while the normal course-chat join flow (enrolled student opening a course's discussion tab) still works.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "fix(chat): restrict chat_participants RLS to enrollment-gated joins"
```

---

## Phase 1 Exit Criteria

Before moving to Phase 2, confirm all of:
- [ ] `npm run typecheck && npm run lint && npm run build` pass cleanly
- [ ] A fresh signup can complete onboarding and reach the dashboard reliably (repeat 3x, not just once — Task 1's bug was intermittent-looking until reproduced twice)
- [ ] `/instructor/*` pages are usable end-to-end on a 390px viewport
- [ ] `/messages` no longer 404s for a student account
- [ ] Task 11 (SCORM) and Task 12 (RLS) each have either a merged fix or an explicit written decision with the user on timeline/scope

---

## Phase 2 — Close the Dead Ends (High severity)

Organize as task clusters by subsystem. Each cluster below lists the specific audit findings it covers with file targets and the required fix — **read the current file before editing every one; exact lines were not re-verified for Phase 2 the way Phase 1 was.** Use the manual-verification pattern from Phase 1 (repro steps + expected result) unless the fix is inside `lib/*`, in which case write a real Vitest test first.

### Cluster A: Auth & recovery gaps
**Files:** `app/signup/SignupContent.tsx`, `app/login/LoginContent.tsx`
- [ ] Detect `data.user.identities?.length === 0` after `signUp()` on an existing email; show "an account may already exist" with links to `/login` and `/forgot-password` instead of a fake "check your email" success screen.
- [ ] Add a "Resend confirmation email" action on the `LoginContent` "Email not confirmed" error path, calling `supabase.auth.resend({ type: 'signup', email })`.
- [ ] Pass `options.emailRedirectTo` on `signUp()` pointing at `/auth/callback` carrying `next`/`path`/`mission`/`answer` params, so context isn't lost when email confirmation is required.
- [ ] Verify: create an account, confirm both new states render correctly (existing-email attempt, and unconfirmed-email login attempt with working resend).

### Cluster B: Onboarding funnel friction
**Files:** `app/onboarding/page.tsx`, `app/contexts/UserContext.tsx`, `app/complete-profile/page.tsx`, `app/signup/SignupContent.tsx`
- [ ] Add a "Skip for now" action on `/onboarding` that sets `onboarding_completed_at` with sensible defaults and routes to `/dashboard`.
- [ ] Carry `?next=` through the onboarding redirect in `UserContext.tsx` (mirror the existing `/complete-profile` branch) and honor it in `finish()` instead of hardcoding `/dashboard?welcome=1`.
- [ ] Collect a username at signup time (or auto-generate one server-side, matching what the OAuth callback already does via `ensureUniqueUsername`) so email signups skip `/complete-profile` entirely.
- [ ] Verify: a new email signup should require at most one intermediate screen (onboarding), not signup → complete-profile → onboarding.

### Cluster C: Dashboard & My Learning fetch-error handling
**Files:** `app/dashboard/page.tsx`, `app/my-learning/page.tsx`, `app/courses/page.tsx`, `components/dashboard/ContinueLearningBanner.tsx`
- [ ] Add a real `fetchError`/`isError` state to each page's data-fetch, rendering the existing error-card pattern (dashboard already has one built in `app/dashboard/error.tsx` — reuse its copy/design inline rather than only relying on the route-level boundary) with a Retry action.
- [ ] Distinguish "no results" from "fetch failed" in every empty-state branch touched (`/courses`, `/my-learning`) — different copy, and only the fetch-failed case gets a Retry button.
- [ ] Verify: throw a forced error in each fetch (temporarily) and confirm the new error UI appears instead of a misleading empty/zero state; remove the forced throw before committing.

### Cluster D: Course player resilience
**Files:** `app/courses/[id]/modules/[moduleId]/ModuleViewerClient.tsx`, `hooks/useKeyboardNav.ts`, `components/learning/MarkdownRenderer.tsx`
- [ ] Persist `currentSlideIndex` and `answersHistory` to `localStorage` keyed by `moduleId`, restore on mount.
- [ ] Compose Markdown + inline HTML via `remark`/`rehype-raw` instead of the current either/or branch in `MarkdownRenderer`, so bold/lists still render inside slides that also contain HTML.
- [ ] Only insert the "Scenario Checkpoint" fallback question when a genuinely module-specific question exists; never hard-gate `Next` when `isCompleted` is already true (student reviewing a finished lesson).
- [ ] Surface `handleMarkComplete` failures via the existing `completionNotice` banner instead of a silent console-only catch.
- [ ] Exclude `<video>`/`<audio>` elements from the global arrow-key navigation handler in `useKeyboardNav.ts`.
- [ ] Change the content pane height from a plain viewport unit to `h-[calc(100dvh-4rem)]` so the Previous/Next controls aren't pushed below the fold on mobile.
- [ ] Verify each with the exact repro from the audit (refresh mid-lesson, mix HTML+markdown in a slide, mark-complete on airplane mode, arrow-key while a video is focused, load on a 390px viewport).

### Cluster E: Quiz integrity & resilience
**Files:** `components/quiz/QuizPlayer.tsx`, `app/api/courses/[courseId]/quizzes/[quizId]/route.ts`
- [ ] Add a distinct "grading" interstitial between submit-click and the response resolving; only render pass/fail after the response returns (currently `setSubmitted(true)` fires before the network call, showing a false "0% — Failed" during the request).
- [ ] Persist `userAnswers` to `sessionStorage` keyed by quiz id; rehydrate on mount; clear on successful submit. Add a `beforeunload` guard while an attempt is in progress and unsubmitted.
- [ ] Add `role="radiogroup"`/`role="radio"`/`aria-checked` to the answer option buttons.
- [ ] Add a pre-quiz intro screen showing question count, time limit, and attempt policy before the timer arms; render the quiz's `description` field (currently fetched, never shown).
- [ ] On a failed attempt, withhold `correct_option_id` from the API response (`route.ts`) until a pass or a configured attempt count — currently every failed attempt reveals the full answer key.
- [ ] Verify: submit a quiz on throttled network (Chrome devtools "Slow 3G") and confirm no false-failure flash; refresh mid-quiz and confirm answers survive; inspect a failed-attempt API response and confirm no `correct_option_id` leaks.

### Cluster F: Community dead ends
**Files:** `components/social/PostCard.tsx`, `app/community/petitions/create/page.tsx` (+ the 5 sibling `create` pages), `app/community/events/create/page.tsx`, `app/community/town-halls/page.tsx`
- [ ] Build `app/community/profile/[id]/page.tsx` (or repoint every author link to the existing `/profile/[id]` route if it already supports viewing other users — check first) so author taps stop 404ing.
- [ ] In all six `community/*/create` pages, check auth on page load (server-wrapped redirect to `/login?next=<path>`) instead of only inside the submit handler, so a logged-out visitor never fills out a form that then discards itself.
- [ ] Wire the four "TODO: redirect to login" engagement handlers (post like, petition sign, event RSVP, poll vote) to `router.push('/login?next=' + pathname)` instead of a dead-end toast.
- [ ] Read the `type` query param in `events/create/page.tsx` via `useSearchParams` and pre-select the event type so "Host Town Hall" events actually appear back on `/community/town-halls`.
- [ ] Verify: log out, attempt each of the six create flows and each of the four engagement taps, and confirm every one now redirects to `/login?next=...` instead of dead-ending.

### Cluster G: Chat reliability
**Files:** `components/chat/ChatWindow.tsx`, `components/chat/RoomList.tsx`
- [ ] Change the message insert to `.insert(...).select().single()` and reconcile the optimistic temp message with the returned row (fixes the permanent single-checkmark-on-your-own-messages bug).
- [ ] Add a refetch on `visibilitychange`/`online` (or handle the realtime channel's reconnect status) so messages sent during a dropped connection aren't silently lost.
- [ ] Add a minimal "start a new conversation" entry point to `RoomList` (a button that lets a student pick an instructor from their enrolled courses and creates/opens a private room) — this closes the gap noted in Phase 1 Task 10 where students could only reply, never initiate.
- [ ] Verify: send a message and confirm the checkmark updates from "sent" to "delivered/read" appropriately; toggle network off/on mid-conversation and confirm no messages are lost; as a student, start a new conversation from `/messages` without going through a course page first.

### Cluster H: Certificates & completion moment
**Files:** `app/verify/[code]/page.tsx` (add `not-found.tsx` sibling), `app/courses/[id]/modules/[moduleId]/ModuleViewerClient.tsx`, `middleware.ts` / `app/utils/supabase/middleware.ts`
- [ ] Add `app/verify/[code]/not-found.tsx` with certificate-specific copy and a "try another code" input, instead of falling back to the global not-found page whose only CTAs are auth-gated.
- [ ] Add `/certificates` and `/notes` to `PROTECTED_PREFIXES` in `app/utils/supabase/middleware.ts` as defense-in-depth (they're already correctly guarded client-side via `ProtectedRoute`; this just backstops it at the server layer).
- [ ] On reaching 100% course completion, show a completion modal (certificate-ready + link to `/certificates`, plus a next-course suggestion) instead of only firing confetti.
- [ ] Verify: visit `/verify/INVALID-CODE` and confirm the new scoped not-found state; complete a course end-to-end and confirm the new completion modal appears once.

### Cluster I: Instructor tooling dead controls
**Files:** `app/instructor/students/page.tsx`, `app/instructor/settings/page.tsx`, `app/instructor/courses/[id]/edit/EditCourseClient.tsx`
- [ ] Wire "Message All" and the per-row action menu on `/instructor/students` to create/open a chat room with the selected student(s) (reuses the chat infra from Cluster G).
- [ ] Wire or remove the three dead `/instructor/settings` controls (notification toggles, "Change Password," "Discard") — persist toggles to a real column, wire password-change to `supabase.auth.updateUser`/existing reset flow, wire Discard to reset the form from `profile`.
- [ ] Make `handleDeleteModule` a single transaction (or sequential-with-rollback) that also deletes/reassigns the attached quiz and warns about shared-module or existing-student-progress consequences before confirming.
- [ ] Verify: each control now does what its label says, or is removed; deleting a lesson with an attached quiz no longer leaves an invisible orphan blocking publish.

---

## Phase 3 & 4 — Backlog (Medium/Low, consistency & polish)

These 117 remaining findings (78 Medium, 39 Low) are lower urgency — none of them strand a user completely. Rather than pre-specify exact diffs now (the codebase will have shifted after Phases 1–2 land, and several of these are genuine design decisions, not mechanical fixes), generate a fresh follow-up plan per group below using this same `superpowers:writing-plans` skill once Phase 1–2 are merged. Suggested grouping, in priority order:

1. **Visual design-system reconciliation** — landing/onboarding "cream + sticker" system vs. plain-gray auth/dashboard/courses vs. course-detail's own fourth style. Needs a design decision first (which system wins, or do sections stay intentionally distinct) — brainstorm before planning.
2. **Discussion/comment component consolidation** — three divergent patterns (threaded comments, real-time chat, poll voting/mentions) for "discussion." Needs a product decision on whether course discussion should be chat-shaped or thread-shaped.
3. **Bot-engagement disclosure** — decide and implement a visible "Community Guide" badge on `is_bot` content across every surface that renders authors.
4. **Community sub-navigation** — 13 sub-areas, only 6 linked from the sidebar; needs an IA pass, not just a fix.
5. **Dark-mode parity sweep** — dashboard, `/instructor/courses`, and the landing page all lack `dark:` variants despite the app fully supporting the toggle elsewhere.
6. **Pagination sweep** — unbounded queries across community feed/topic/impact pages, admin dashboard tabs, catalog, chat/comment history.
7. **Accessibility sweep** — `role="alert"` on auth error banners, skip-to-content link, captions/transcript rendering for video lessons.
8. **Remaining Low-severity copy/link/icon polish** — dead social links, invalid Tailwind classes elsewhere, duplicate stat tiles, OG image, etc. — can be done as a single low-risk cleanup PR once someone greps the full audit checklist for remaining unchecked Low items.

For each, open with `superpowers:brainstorming` if a product/design decision is implied (items 1–4), or go straight to `superpowers:writing-plans` if it's mechanical (items 5–8).
