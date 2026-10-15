'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { Loader2, AlertCircle, CheckCircle2, Clock, Maximize2, Minimize2, RotateCcw, CloudOff, Cloud } from 'lucide-react';

interface ScormPlayerProps {
  packageId: string;
  preview?: boolean;
  /** Called after a successful commit that completed the package. */
  onCompleted?: () => void;
}

type LessonStatus = 'not attempted' | 'incomplete' | 'completed' | 'passed' | 'failed' | 'browsed';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const FRIENDLY_ERRORS: Record<number, string> = {
  401: 'Your session has expired. Sign in again to continue this lesson.',
  403: 'Enroll in this course to open this interactive lesson.',
  404: 'This interactive lesson could not be found. It may have been removed.',
  410: 'This interactive lesson has been archived by the instructor.',
};

export default function ScormPlayer({ packageId, preview = false, onCompleted }: ScormPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cmiRef = useRef<Record<string, string>>({});
  const initializedRef = useRef(false);
  const dirtyRef = useRef(false);
  const [entryPoint, setEntryPoint] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<LessonStatus>('not attempted');
  const [scorePercent, setScorePercent] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [packageTitle, setPackageTitle] = useState<string>('');
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [focusMode, setFocusMode] = useState(false);
  const [frameLoading, setFrameLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  }, [supabase]);

  const refreshScore = useCallback(() => {
    const cmi = cmiRef.current;
    const raw = cmi['cmi.core.score.raw'] ?? cmi['cmi.score.raw'];
    const scaled = cmi['cmi.score.scaled'];
    if (scaled !== undefined && scaled !== '' && Number.isFinite(parseFloat(scaled))) {
      setScorePercent(Math.round(parseFloat(scaled) * 100));
      return;
    }
    if (raw === undefined || raw === '' || !Number.isFinite(parseFloat(raw))) {
      setScorePercent(null);
      return;
    }
    const min = parseFloat(cmi['cmi.core.score.min'] ?? cmi['cmi.score.min'] ?? '0') || 0;
    const max = parseFloat(cmi['cmi.core.score.max'] ?? cmi['cmi.score.max'] ?? '100') || 100;
    const pct = max > min ? ((parseFloat(raw) - min) / (max - min)) * 100 : parseFloat(raw);
    setScorePercent(Math.max(0, Math.min(100, Math.round(pct))));
  }, []);

  // Commit CMI data to server (no-op in preview mode)
  const commit = useCallback(async (isFinish = false) => {
    if (preview) return;
    setSaveState('saving');
    try {
      const token = await getToken();
      const body = JSON.stringify({ cmiData: cmiRef.current, isFinish });
      const response = await fetch(`/api/scorm/${packageId}/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body,
        // keepalive lets a Terminate/LMSFinish commit survive navigation, but
        // browsers reject keepalive bodies over 64KB (large suspend_data).
        keepalive: body.length < 60_000,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'SCORM progress could not be saved.');
      }
      dirtyRef.current = false;
      setSaveState('saved');
      const savedStatus = payload?.registration?.lesson_status;
      if (savedStatus === 'completed' || savedStatus === 'passed') onCompleted?.();
    } catch (err) {
      console.error('SCORM commit failed:', err);
      setSaveState('error');
    }
  }, [packageId, preview, getToken, onCompleted]);

  // Initialize registration and seed the CMI data model
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const token = await getToken();
        const res = await fetch(`/api/scorm/${packageId}/init`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(preview && { 'X-SCORM-Preview': '1' }),
          },
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(FRIENDLY_ERRORS[res.status] || payload?.error || 'Failed to start this lesson.');
        }

        const data = await res.json();
        if (!mounted) return;

        const reg = data.registration;
        const pkg = data.package;
        const learnerName: string = data.learnerName || '';

        const isResuming = !!reg.suspend_data && reg.lesson_status !== 'not attempted';
        setStatus(reg.lesson_status || 'not attempted');
        setPackageTitle(pkg.title || '');
        setShowResumeBanner(isResuming && !preview);

        const isScorm2004 = pkg.version === '2004';
        const wasComplete = reg.lesson_status === 'completed' || reg.lesson_status === 'passed';
        const scoreRaw = reg.score_raw !== null && reg.score_raw !== undefined ? String(reg.score_raw) : '';

        // Seed local CMI store from the saved registration. Read-only fields
        // (entry, credit, mode, learner id/name) are what packages check on
        // launch; cmi.core.entry = "resume" is what makes Storyline/Captivate
        // offer to resume instead of starting over.
        cmiRef.current = {
          ...(reg.cmi_data || {}),
          ...(!isScorm2004 && {
            'cmi._version': '3.4',
            'cmi.core._children': 'student_id,student_name,lesson_location,credit,lesson_status,entry,score,total_time,lesson_mode,exit,session_time',
            'cmi.core.score._children': 'raw,min,max',
            'cmi.core.lesson_status': reg.lesson_status || 'not attempted',
            'cmi.core.student_id': reg.user_id || '',
            'cmi.core.student_name': learnerName,
            'cmi.core.entry': isResuming ? 'resume' : 'ab-initio',
            'cmi.core.credit': preview ? 'no-credit' : 'credit',
            'cmi.core.lesson_mode': preview ? 'browse' : wasComplete ? 'review' : 'normal',
            'cmi.suspend_data': reg.suspend_data || '',
            'cmi.launch_data': reg.cmi_data?.['cmi.launch_data'] || '',
            'cmi.core.lesson_location': reg.lesson_location || '',
            'cmi.core.score.raw': scoreRaw,
            'cmi.core.score.min': String(reg.score_min ?? 0),
            'cmi.core.score.max': String(reg.score_max ?? 100),
            'cmi.core.total_time': reg.total_time || '0000:00:00.00',
            'cmi.core.exit': '',
            'cmi.core.session_time': '',
          }),
          ...(isScorm2004 && {
            'cmi._version': '1.0',
            'cmi.completion_status': wasComplete ? 'completed' : reg.lesson_status === 'not attempted' ? 'not attempted' : 'incomplete',
            'cmi.success_status': reg.lesson_status === 'passed' ? 'passed' : reg.lesson_status === 'failed' ? 'failed' : 'unknown',
            'cmi.learner_id': reg.user_id || '',
            'cmi.learner_name': learnerName,
            'cmi.entry': isResuming ? 'resume' : 'ab-initio',
            'cmi.credit': preview ? 'no-credit' : 'credit',
            'cmi.mode': preview ? 'browse' : wasComplete ? 'review' : 'normal',
            'cmi.suspend_data': reg.suspend_data || '',
            'cmi.location': reg.lesson_location || '',
            'cmi.score.raw': scoreRaw,
            'cmi.score.min': String(reg.score_min ?? 0),
            'cmi.score.max': String(reg.score_max ?? 100),
            'cmi.total_time': reg.total_time || 'PT0S',
            'cmi.exit': '',
            'cmi.session_time': '',
          }),
        };
        refreshScore();

        // Entry points can carry their own query string (e.g. index.html?lms=1).
        const launchUrl = `${data.serveBase}/${String(pkg.entry_point).replace(/^\/+/, '')}`;
        setEntryPoint(launchUrl);
        setLoading(false);
      } catch (err: any) {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    init();
    return () => { mounted = false; };
  }, [packageId, getToken, preview, refreshScore]);

  // Inject window.API (SCORM 1.2) and window.API_1484_11 (SCORM 2004)
  useEffect(() => {
    if (!entryPoint) return;

    const markInitialized = (value: boolean) => {
      initializedRef.current = value;
      setInitialized(value);
    };

    // ── SCORM 1.2 ──────────────────────────────────────────────────────────
    const api12 = {
      LMSInitialize: (_param: string): string => {
        markInitialized(true);
        if (cmiRef.current['cmi.core.lesson_status'] === 'not attempted') {
          cmiRef.current['cmi.core.lesson_status'] = 'incomplete';
          setStatus('incomplete');
        }
        return 'true';
      },
      LMSFinish: (_param: string): string => {
        void commit(true);
        markInitialized(false);
        return 'true';
      },
      LMSGetValue: (element: string): string => cmiRef.current[element] ?? '',
      LMSSetValue: (element: string, value: string): string => {
        cmiRef.current[element] = String(value);
        dirtyRef.current = true;
        if (element === 'cmi.core.lesson_status') setStatus(value as LessonStatus);
        if (element.startsWith('cmi.core.score')) refreshScore();
        return 'true';
      },
      LMSCommit: (_param: string): string => { void commit(false); return 'true'; },
      LMSGetLastError: (): string => '0',
      LMSGetErrorString: (_code: string): string => 'No error',
      LMSGetDiagnostic: (_code: string): string => 'No diagnostic information available',
    };

    // ── SCORM 2004 (4th Edition) ────────────────────────────────────────────
    const api2004 = {
      Initialize: (_param: string): string => {
        markInitialized(true);
        const cs = cmiRef.current['cmi.completion_status'] || 'unknown';
        if (cs === 'unknown' || cs === 'not attempted') {
          cmiRef.current['cmi.completion_status'] = 'incomplete';
          setStatus('incomplete');
        }
        return 'true';
      },
      Terminate: (_param: string): string => {
        void commit(true);
        markInitialized(false);
        return 'true';
      },
      GetValue: (element: string): string => cmiRef.current[element] ?? '',
      SetValue: (element: string, value: string): string => {
        cmiRef.current[element] = String(value);
        dirtyRef.current = true;
        if (element === 'cmi.completion_status') {
          const map: Record<string, LessonStatus> = {
            completed: 'completed',
            incomplete: 'incomplete',
            'not attempted': 'not attempted',
            unknown: 'not attempted',
          };
          const success = cmiRef.current['cmi.success_status'];
          if (success !== 'passed' && success !== 'failed') setStatus(map[value] ?? 'incomplete');
        }
        if (element === 'cmi.success_status') {
          if (value === 'passed') setStatus('passed');
          if (value === 'failed') setStatus('failed');
        }
        if (element.startsWith('cmi.score')) refreshScore();
        return 'true';
      },
      Commit: (_param: string): string => { void commit(false); return 'true'; },
      GetLastError: (): string => '0',
      GetErrorString: (_code: string): string => 'No error',
      GetDiagnostic: (_code: string): string => 'No diagnostic information available',
    };

    (window as any).API = api12;
    (window as any).API_1484_11 = api2004;

    return () => {
      delete (window as any).API;
      delete (window as any).API_1484_11;
    };
  }, [entryPoint, commit, refreshScore]);

  // Save progress when the learner leaves: pagehide fires reliably on mobile
  // (beforeunload often doesn't), visibilitychange covers app switching.
  // sendBeacon carries the session cookie, which the commit route accepts.
  useEffect(() => {
    if (preview) return;
    const flush = () => {
      if (!initializedRef.current || !dirtyRef.current) return;
      const sent = navigator.sendBeacon?.(
        `/api/scorm/${packageId}/commit`,
        new Blob([JSON.stringify({ cmiData: cmiRef.current, isFinish: false })], { type: 'text/plain' })
      );
      if (sent) dirtyRef.current = false;
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      // Client-side navigation away from the player (e.g. Next lesson).
      flush();
    };
  }, [packageId, preview]);

  // Focus mode: native fullscreen where supported (desktop, Android), with a
  // CSS fallback for iOS Safari, which can't fullscreen arbitrary elements.
  const toggleFocusMode = useCallback(async () => {
    const el = containerRef.current;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
      return;
    }
    if (focusMode) {
      setFocusMode(false);
      return;
    }
    if (el?.requestFullscreen) {
      try {
        await el.requestFullscreen();
        return;
      } catch {
        // Fall through to the CSS fallback.
      }
    }
    setFocusMode(true);
  }, [focusMode]);

  useEffect(() => {
    const onFsChange = () => setFocusMode(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    if (!focusMode || document.fullscreenElement) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFocusMode(false); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [focusMode]);

  const statusConfig: Record<LessonStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
    'not attempted': { label: 'Not started', color: 'text-gray-400', icon: Clock },
    incomplete: { label: 'In progress', color: 'text-blue-400', icon: Clock },
    browsed: { label: 'Browsed', color: 'text-yellow-400', icon: Clock },
    completed: { label: 'Completed', color: 'text-green-400', icon: CheckCircle2 },
    passed: { label: 'Passed', color: 'text-green-400', icon: CheckCircle2 },
    failed: { label: 'Not passed yet', color: 'text-red-400', icon: AlertCircle },
  };

  const statusInfo = statusConfig[status] || statusConfig['not attempted'];
  const StatusIcon = statusInfo.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] min-h-[320px] bg-gray-900 rounded-2xl" role="status">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading interactive lesson…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh] min-h-[320px] bg-gray-900 rounded-2xl px-6" role="alert">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-white font-bold mb-1">This lesson couldn&apos;t be opened</p>
          <p className="text-gray-400 text-sm mb-5">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-gray-950 overflow-hidden ${focusMode
        ? 'fixed inset-0 z-[80] h-[100dvh]'
        : 'rounded-2xl border border-gray-800 shadow-2xl'
        }`}
    >
      {/* Status HUD */}
      <div className="flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex items-center gap-2 text-sm font-semibold ${statusInfo.color} flex-shrink-0`}>
            <StatusIcon className="w-4 h-4" aria-hidden="true" />
            <span>{statusInfo.label}</span>
          </div>
          {packageTitle && (
            <span className="text-xs text-gray-400 truncate hidden sm:block border-l border-gray-700 pl-3">
              {packageTitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {scorePercent !== null && (
            <div className="text-sm text-gray-300 font-mono tabular-nums">
              <span className="hidden sm:inline">Score: </span><span className="text-white font-bold">{scorePercent}%</span>
            </div>
          )}
          {preview ? (
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300">
              Preview, not tracked
            </span>
          ) : (
            <div className="flex items-center gap-1.5 text-xs" role="status" aria-live="polite">
              {saveState === 'saving' && <><Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" /><span className="text-gray-400 hidden sm:inline">Saving…</span></>}
              {saveState === 'saved' && <><Cloud className="w-3.5 h-3.5 text-green-400" /><span className="text-gray-400 hidden sm:inline">Progress saved</span></>}
              {saveState === 'error' && (
                <button
                  type="button"
                  onClick={() => void commit(false)}
                  className="flex items-center gap-1.5 text-red-300 hover:text-red-200 font-semibold"
                >
                  <CloudOff className="w-3.5 h-3.5" /><span>Not saved, retry</span>
                </button>
              )}
              {saveState === 'idle' && (
                <>
                  <span className={`w-2 h-2 rounded-full ${initialized ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} aria-hidden="true" />
                  <span className="text-gray-500 hidden sm:inline">{initialized ? 'Tracking' : 'Waiting for lesson'}</span>
                </>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => void toggleFocusMode()}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            aria-label={focusMode ? 'Exit full screen' : 'Full screen'}
            title={focusMode ? 'Exit full screen (Esc)' : 'Full screen'}
          >
            {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Resume banner */}
      {showResumeBanner && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-blue-900/60 border-b border-blue-800/50 shrink-0">
          <div className="flex items-center gap-2 text-sm text-blue-200">
            <RotateCcw className="w-4 h-4 text-blue-400 flex-shrink-0" aria-hidden="true" />
            <span>Welcome back. The lesson will pick up where you left off.</span>
          </div>
          <button
            type="button"
            onClick={() => setShowResumeBanner(false)}
            className="text-blue-300 hover:text-white text-xs font-bold flex-shrink-0 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SCORM iframe */}
      {/*
        SECURITY (tracked, Kiongozi UX audit 2026-07-16, Critical #11): this
        iframe runs instructor-uploaded SCORM content with `allow-scripts` AND
        `allow-same-origin` from the app's OWN origin (see the serve route). That
        combination lets untrusted package JS read the same-origin session cookie
        (`.kiongozi.org`, cookie-domain.ts) and call any authenticated API route
        with `credentials: 'include'`, i.e. act as the logged-in user. Threat
        model is a malicious/compromised INSTRUCTOR account (upload is
        privileged), not an anonymous attacker, but it is still a real
        account-takeover vector.

        COMPLETE FIX (deliberately NOT applied blind, requires verification we
        cannot do in an automated pass):
          1. Serve SCORM content from a separate, cookieless origin
             (e.g. scorm-content.kiongozi.org) so the session cookie never
             reaches it, needs DNS/hosting changes outside this repo.
          2. Drop `allow-same-origin` and replace the current direct
             `window.parent.API` / `window.API_1484_11` access with a
             postMessage bridge: inject a shim into served HTML that seeds a
             local CMI cache (so synchronous LMSGetValue keeps working) and
             posts SetValue/Commit/Initialize/Terminate to this parent, which
             validates event.origin + event.source and mutates cmiRef here.

        Why not done here: the bridge's correctness is SCORM-package-dependent
        (the findAPI discovery walk varies by authoring tool; dropping
        allow-same-origin breaks packages that reach window.parent/window.top),
        so it MUST be smoke-tested against real SCORM packages and
        security-reviewed before shipping. Do NOT change the sandbox below or
        point the serve origin off-domain until BOTH steps above land together.
      */}
      <div className={`relative bg-white ${focusMode ? 'flex-1 min-h-0' : 'h-[calc(100dvh-14rem)] min-h-[420px] sm:min-h-[560px]'}`}>
        {frameLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950" aria-hidden="true">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={entryPoint}
          title={packageTitle ? `Interactive lesson: ${packageTitle}` : 'Interactive lesson'}
          className="absolute inset-0 w-full h-full border-0"
          onLoad={() => setFrameLoading(false)}
          allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-pointer-lock allow-downloads allow-modals allow-top-navigation-by-user-activation"
        />
      </div>
    </div>
  );
}
