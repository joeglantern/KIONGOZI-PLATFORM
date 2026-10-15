'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { Button } from '@/components/ui/button';
import {
  UploadCloud, FileArchive, CheckCircle2, AlertCircle,
  Loader2, ExternalLink, Trash2, Package, X
} from 'lucide-react';

interface ScormPackage {
  id: string;
  title: string;
  version: string;
  entry_point: string;
  created_at: string;
  status: string;
}

interface UploadJob {
  id: string;
  file: File;
  status: 'queued' | 'uploading' | 'processing' | 'done' | 'error';
  progress: number;
  error?: string;
  pkg?: ScormPackage;
}

interface ScormUploadProps {
  courseId: string;
  onPackageLinked?: (pkg: ScormPackage) => void;
  onPackageRemoved?: (pkgId: string) => void;
}

// Keep in sync with MAX_ARCHIVE_BYTES in app/api/scorm/upload/route.ts.
const MAX_ARCHIVE_MB = 300;

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** POST with real upload progress (fetch can't report request progress). */
function uploadWithProgress(
  url: string,
  body: FormData,
  token: string,
  onProgress: (fraction: number) => void,
  onUploaded: () => void
): Promise<{ status: number; payload: any }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.upload.onload = onUploaded;
    xhr.onload = () => {
      let payload: any = null;
      try { payload = JSON.parse(xhr.responseText); } catch { /* non-JSON (e.g. proxy error page) */ }
      resolve({ status: xhr.status, payload });
    };
    xhr.onerror = () => reject(new Error('Network error. Check your connection and try again.'));
    xhr.ontimeout = () => reject(new Error('The upload timed out. Try a smaller package or a faster connection.'));
    xhr.send(body);
  });
}

export default function ScormUpload({ courseId, onPackageLinked, onPackageRemoved }: ScormUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [existingPackages, setExistingPackages] = useState<ScormPackage[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;
    async function fetchExisting() {
      const { data, error } = await supabase
        .from('scorm_packages')
        .select('id, title, version, entry_point, created_at, status')
        .eq('course_id', courseId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (error) setLoadError('Could not load linked packages.');
      setExistingPackages(data || []);
      setLoadingExisting(false);
    }
    fetchExisting();
    return () => { cancelled = true; };
  }, [courseId, supabase]);

  const updateJob = useCallback((id: string, patch: Partial<UploadJob>) => {
    setJobs(prev => prev.map(j => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const uploadOne = async (job: UploadJob) => {
    const { file } = job;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      updateJob(job.id, { status: 'error', error: 'Not a .zip file. Publish your course as a SCORM .zip package.' });
      return;
    }
    if (file.size > MAX_ARCHIVE_MB * 1024 * 1024) {
      updateJob(job.id, { status: 'error', error: `This file is ${formatSize(file.size)}. The limit is ${MAX_ARCHIVE_MB} MB.` });
      return;
    }

    updateJob(job.id, { status: 'uploading', progress: 0 });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Your session has expired. Refresh the page and sign in again.');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('course_id', courseId);

      const { status, payload } = await uploadWithProgress(
        '/api/scorm/upload',
        formData,
        session.access_token,
        (fraction) => updateJob(job.id, { progress: Math.round(fraction * 100) }),
        () => updateJob(job.id, { status: 'processing', progress: 100 })
      );

      if (status < 200 || status >= 300) {
        const message =
          payload?.error ||
          (status === 413 ? `The server rejected this file as too large (limit ${MAX_ARCHIVE_MB} MB).` : `Upload failed (HTTP ${status}).`);
        throw new Error(message);
      }

      const pkg: ScormPackage = payload.package;
      updateJob(job.id, { status: 'done', progress: 100, pkg });
      setExistingPackages(prev => [pkg, ...prev.filter(p => p.id !== pkg.id)]);
      onPackageLinked?.(pkg);
    } catch (err: any) {
      updateJob(job.id, { status: 'error', error: err.message || 'Upload failed' });
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;

    const newJobs: UploadJob[] = arr.map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file: f,
      status: 'queued',
      progress: 0,
    }));

    setJobs(prev => [...prev.filter(j => j.status === 'error'), ...newJobs]);

    // Upload sequentially so a large batch doesn't overwhelm the server.
    for (const job of newJobs) {
      await uploadOne(job);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (isUploading) return;
    if (e.dataTransfer.files.length > 0) void handleFiles(e.dataTransfer.files);
  };

  const handleRemove = async (pkgId: string) => {
    setRemovingId(pkgId);
    const { error } = await supabase
      .from('scorm_packages')
      .update({ status: 'archived' })
      .eq('id', pkgId);
    setRemovingId(null);
    setConfirmingRemoveId(null);
    if (error) {
      setLoadError(`Could not remove the package: ${error.message}`);
      return;
    }
    setExistingPackages(prev => prev.filter(p => p.id !== pkgId));
    onPackageRemoved?.(pkgId);
  };

  const isUploading = jobs.some(j => j.status === 'uploading' || j.status === 'queued' || j.status === 'processing');
  const visibleJobs = jobs.filter(j => j.status !== 'done');

  return (
    <div className="space-y-5">
      {loadError && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <span>{loadError}</span>
          <button type="button" onClick={() => setLoadError(null)} aria-label="Dismiss" className="shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Existing packages */}
      {loadingExisting ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-2" role="status">
          <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
          Loading packages…
        </div>
      ) : existingPackages.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
            In this course ({existingPackages.length})
          </p>
          {existingPackages.map((pkg) => (
            <div key={pkg.id} className="rounded-2xl border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/10 p-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                      <span className="text-xs font-bold text-green-600 dark:text-green-400">Live in course</span>
                    </div>
                    <p className="text-gray-900 dark:text-white font-semibold text-sm break-words">{pkg.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      SCORM {pkg.version} · starts at {pkg.entry_point}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {confirmingRemoveId === pkg.id ? (
                    <>
                      <span className="text-xs text-gray-600 dark:text-gray-300">Remove from course?</span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void handleRemove(pkg.id)}
                        disabled={removingId === pkg.id}
                        className="bg-red-600 hover:bg-red-700 text-white h-8"
                      >
                        {removingId === pkg.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Remove'}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmingRemoveId(null)} className="h-8">
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button asChild variant="outline" size="sm" className="border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white gap-1.5">
                        <a href={`/lms/scorm/${pkg.id}?preview=1`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" />
                          Preview
                        </a>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmingRemoveId(pkg.id)}
                        aria-label={`Remove ${pkg.title} from this course`}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Active upload jobs */}
      {visibleJobs.length > 0 && (
        <ul className="space-y-2" aria-live="polite">
          {visibleJobs.map((job) => (
            <li key={job.id} className={`rounded-xl border px-4 py-3 ${job.status === 'error'
              ? 'border-red-200 bg-red-50 dark:border-red-800/30 dark:bg-red-900/10'
              : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/30'
              }`}>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  {job.status === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-orange-500 animate-spin flex-shrink-0" />
                  )}
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {job.file.name}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">{formatSize(job.file.size)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-bold tabular-nums ${job.status === 'error' ? 'text-red-500' : job.status === 'queued' ? 'text-gray-400' : 'text-orange-500'}`}>
                    {job.status === 'queued' ? 'Queued' :
                      job.status === 'uploading' ? `Uploading ${job.progress}%` :
                        job.status === 'processing' ? 'Unpacking…' : 'Failed'}
                  </span>
                  {job.status === 'error' && (
                    <button
                      type="button"
                      onClick={() => setJobs(prev => prev.filter(j => j.id !== job.id))}
                      aria-label={`Dismiss ${job.file.name}`}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              {(job.status === 'uploading' || job.status === 'processing') && (
                <div
                  className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={job.progress}
                  aria-label={`Uploading ${job.file.name}`}
                >
                  <div
                    className={`bg-orange-500 h-1.5 rounded-full transition-all duration-300 ${job.status === 'processing' ? 'animate-pulse' : ''}`}
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              )}
              {job.status === 'processing' && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">Uploaded. Unpacking and checking the package, this can take a minute for large courses.</p>
              )}
              {job.status === 'error' && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{job.error}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Drop zone */}
      <div>
        {existingPackages.length > 0 && visibleJobs.length === 0 && (
          <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
            Add another package
          </p>
        )}
        <button
          type="button"
          onDragOver={(e) => { e.preventDefault(); if (!isUploading) setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          disabled={isUploading}
          aria-describedby="scorm-upload-help"
          className={`
            relative block w-full rounded-2xl border-2 border-dashed p-8 transition-all text-center
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2
            ${dragOver
              ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/5'
              : 'border-gray-200 dark:border-gray-700 hover:border-orange-400 bg-gray-50 dark:bg-gray-800/30 hover:bg-orange-50/50 dark:hover:bg-gray-800/50'
            }
            ${isUploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
          `}
        >
          <span className="block space-y-3">
            <span className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-center mx-auto">
              {isUploading
                ? <Loader2 className="w-7 h-7 text-orange-500 animate-spin" />
                : <FileArchive className="w-7 h-7 text-orange-500" />}
            </span>
            <span className="block">
              <span className="block text-sm font-bold text-gray-900 dark:text-white">
                {isUploading ? 'Uploading…' : 'Drop SCORM .zip packages here'}
              </span>
              <span id="scorm-upload-help" className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                or click to browse · one or more .zip files · up to {MAX_ARCHIVE_MB} MB each
              </span>
            </span>
            {!isUploading && (
              <span className="flex items-center gap-2 justify-center">
                <UploadCloud className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-orange-500 font-semibold">Choose packages</span>
              </span>
            )}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <p className="text-xs text-gray-400 text-center">
        Works with Articulate Storyline and Rise, Adobe Captivate, iSpring and other SCORM 1.2 or 2004 packages
      </p>
    </div>
  );
}
