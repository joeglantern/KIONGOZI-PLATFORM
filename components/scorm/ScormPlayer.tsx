'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/app/utils/supabaseClient';
import { Loader2, AlertCircle, CheckCircle2, Clock, Maximize2, RotateCcw } from 'lucide-react';

interface ScormPlayerProps {
  packageId: string;
  preview?: boolean;
}

type LessonStatus = 'not attempted' | 'incomplete' | 'completed' | 'passed' | 'failed' | 'browsed';

interface Registration {
  id: string;
  cmi_data: Record<string, string>;
  lesson_status: LessonStatus;
  score_raw: number | null;
}

export default function ScormPlayer({ packageId, preview = false }: ScormPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cmiRef = useRef<Record<string, string>>({});
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [entryPoint, setEntryPoint] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<LessonStatus>('not attempted');
  const [score, setScore] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [packageTitle, setPackageTitle] = useState<string>('');
  const [showResumeBanner, setShowResumeBanner] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  // Get auth token for API calls
  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  }, [supabase]);

  // Commit CMI data to server (no-op in preview mode)
  const commit = useCallback(async (isFinish = false) => {
    if (preview) return;
    try {
      const token = await getToken();
      const response = await fetch(`/api/scorm/${packageId}/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cmiData: cmiRef.current, isFinish }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'SCORM progress could not be saved.');
      }
    } catch (err) {
      console.error('SCORM commit failed:', err);
    }
  }, [packageId, preview, getToken]);

  // Initialize registration and inject window.API
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const token = await getToken();
        const res = await fetch(`/api/scorm/${packageId}/init`, {
          headers: {
            Authorization: `Bearer ${token}`,
            ...(preview && { 'X-SCORM-Preview': '1' }),
          },
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.error || 'Failed to initialize SCORM session');
        }

        const data = await res.json();
        if (!mounted) return;

        const reg = data.registration;
        const pkg = data.package;

        setRegistration(reg);
        setStatus(reg.lesson_status || 'not attempted');
        setScore(reg.score_raw);
        setPackageTitle(pkg.title || '');
        if (
          (reg.lesson_status === 'incomplete' || reg.lesson_status === 'browsed') &&
          reg.suspend_data
        ) {
          setShowResumeBanner(true);
        }

        const isScorm2004 = pkg.version === '2004';

        // Seed local CMI store from saved registration
        cmiRef.current = {
          ...(reg.cmi_data || {}),
          // SCORM 1.2 mandatory fields
          ...(!isScorm2004 && {
            'cmi.core.lesson_status': reg.lesson_status || 'not attempted',
            'cmi.core.student_id': reg.user_id || '',
            'cmi.suspend_data': reg.suspend_data || '',
            'cmi.core.lesson_location': reg.lesson_location || '',
            'cmi.core.score.raw': reg.score_raw !== null ? String(reg.score_raw) : '',
            'cmi.core.score.min': String(reg.score_min ?? 0),
            'cmi.core.score.max': String(reg.score_max ?? 100),
            'cmi.core.total_time': reg.total_time || 'PT0S',
          }),
          // SCORM 2004 mandatory fields
          ...(isScorm2004 && {
            'cmi.completion_status': reg.lesson_status === 'completed' ? 'completed' : 'incomplete',
            'cmi.success_status': reg.lesson_status === 'passed' ? 'passed' : reg.lesson_status === 'failed' ? 'failed' : 'unknown',
            'cmi.learner_id': reg.user_id || '',
            'cmi.suspend_data': reg.suspend_data || '',
            'cmi.location': reg.lesson_location || '',
            'cmi.score.raw': reg.score_raw !== null ? String(reg.score_raw) : '',
            'cmi.score.min': String(reg.score_min ?? 0),
            'cmi.score.max': String(reg.score_max ?? 100),
            'cmi.total_time': reg.total_time || 'PT0S',
          }),
        };

        const launchUrl = `${data.serveBase}/${pkg.entry_point}`;
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
  }, [packageId, getToken]);

  // Inject window.API (SCORM 1.2) and window.API_1484_11 (SCORM 2004)
  useEffect(() => {
    if (!entryPoint) return;

    // ── SCORM 1.2 ──────────────────────────────────────────────────────────
    const api12 = {
      LMSInitialize: (_param: string): string => {
        setInitialized(true);
        cmiRef.current['cmi.core.lesson_status'] =
          cmiRef.current['cmi.core.lesson_status'] === 'not attempted'
            ? 'incomplete'
            : cmiRef.current['cmi.core.lesson_status'];
        return 'true';
      },
      LMSFinish: (_param: string): string => {
        commit(true);
        setInitialized(false);
        return 'true';
      },
      LMSGetValue: (element: string): string => cmiRef.current[element] ?? '',
      LMSSetValue: (element: string, value: string): string => {
        cmiRef.current[element] = value;
        if (element === 'cmi.core.lesson_status') setStatus(value as LessonStatus);
        if (element === 'cmi.core.score.raw') setScore(parseFloat(value) || null);
        return 'true';
      },
      LMSCommit: (_param: string): string => { commit(false); return 'true'; },
      LMSGetLastError: (): string => '0',
      LMSGetErrorString: (_code: string): string => 'No error',
      LMSGetDiagnostic: (_code: string): string => 'No diagnostic information available',
    };

    // ── SCORM 2004 (4th Edition) ────────────────────────────────────────────
    // Uses different method names and CMI data model paths
    const api2004 = {
      Initialize: (_param: string): string => {
        setInitialized(true);
        // Map 2004 completion_status → 1.2-style lesson_status for HUD
        const cs = cmiRef.current['cmi.completion_status'] || 'unknown';
        if (cs === 'unknown' || cs === 'not attempted') {
          cmiRef.current['cmi.completion_status'] = 'incomplete';
        }
        return 'true';
      },
      Terminate: (_param: string): string => {
        commit(true);
        setInitialized(false);
        return 'true';
      },
      GetValue: (element: string): string => cmiRef.current[element] ?? '',
      SetValue: (element: string, value: string): string => {
        cmiRef.current[element] = value;
        // Map SCORM 2004 fields to HUD state
        if (element === 'cmi.completion_status') {
          const map: Record<string, LessonStatus> = {
            completed: 'completed',
            incomplete: 'incomplete',
            'not attempted': 'not attempted',
            unknown: 'not attempted',
          };
          setStatus(map[value] ?? 'incomplete');
        }
        if (element === 'cmi.success_status') {
          if (value === 'passed') setStatus('passed');
          if (value === 'failed') setStatus('failed');
        }
        if (element === 'cmi.score.raw') setScore(parseFloat(value) || null);
        return 'true';
      },
      Commit: (_param: string): string => { commit(false); return 'true'; },
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
  }, [entryPoint, commit]);

  // Auto-commit when tab/window unloads (skip in preview)
  useEffect(() => {
    if (preview) return;
    const handleUnload = () => {
      if (initialized) {
        navigator.sendBeacon(
          `/api/scorm/${packageId}/commit`,
          JSON.stringify({ cmiData: cmiRef.current, isFinish: true })
        );
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [initialized, packageId, preview]);

  const statusConfig: Record<LessonStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
    'not attempted': { label: 'Not Started', color: 'text-gray-400', icon: Clock },
    incomplete: { label: 'In Progress', color: 'text-blue-400', icon: Loader2 },
    browsed: { label: 'Browsed', color: 'text-yellow-400', icon: Clock },
    completed: { label: 'Completed', color: 'text-green-400', icon: CheckCircle2 },
    passed: { label: 'Passed', color: 'text-green-400', icon: CheckCircle2 },
    failed: { label: 'Failed', color: 'text-red-400', icon: AlertCircle },
  };

  const statusInfo = statusConfig[status] || statusConfig['not attempted'];
  const StatusIcon = statusInfo.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-900 rounded-2xl">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading SCORM content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-900 rounded-2xl">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-white font-bold mb-1">Failed to load content</p>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const handleFullscreen = () => {
    iframeRef.current?.requestFullscreen?.();
  };

  return (
    <div className="flex flex-col gap-0 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
      {/* Status HUD */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex items-center gap-2 text-sm font-semibold ${statusInfo.color} flex-shrink-0`}>
            <StatusIcon className="w-4 h-4" />
            <span>{statusInfo.label}</span>
          </div>
          {packageTitle && (
            <span className="text-xs text-gray-400 truncate hidden sm:block border-l border-gray-700 pl-3">
              {packageTitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {score !== null && (
            <div className="text-sm text-gray-300 font-mono">
              Score: <span className="text-white font-bold">{Math.round(score)}%</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${initialized ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-xs text-gray-500">{initialized ? 'Live' : 'Standby'}</span>
          </div>
          <button
            onClick={handleFullscreen}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Resume banner */}
      {showResumeBanner && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-blue-900/60 border-b border-blue-800/50">
          <div className="flex items-center gap-2 text-sm text-blue-200">
            <RotateCcw className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>Resuming where you left off — your progress has been saved.</span>
          </div>
          <button
            onClick={() => setShowResumeBanner(false)}
            className="text-blue-400 hover:text-white text-xs font-bold flex-shrink-0 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SCORM iframe */}
      <iframe
        ref={iframeRef}
        src={entryPoint}
        title="SCORM Content"
        className="w-full border-0"
        style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}
        allow="fullscreen"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-top-navigation-by-user-activation"
      />
    </div>
  );
}
