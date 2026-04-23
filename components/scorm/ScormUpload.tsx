'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createClient } from '@/app/utils/supabaseClient';
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
  file: File;
  status: 'queued' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
  pkg?: ScormPackage;
}

interface ScormUploadProps {
  courseId: string;
  onPackageLinked?: (pkg: ScormPackage) => void;
}

export default function ScormUpload({ courseId, onPackageLinked }: ScormUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [existingPackages, setExistingPackages] = useState<ScormPackage[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchExisting() {
      const { data } = await supabase
        .from('scorm_packages')
        .select('id, title, version, entry_point, created_at, status')
        .eq('course_id', courseId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      setExistingPackages(data || []);
      setLoadingExisting(false);
    }
    fetchExisting();
  }, [courseId]);

  const uploadOne = async (file: File, index: number) => {
    const updateJob = (patch: Partial<UploadJob>) =>
      setJobs(prev => prev.map((j, i) => i === index ? { ...j, ...patch } : j));

    if (!file.name.endsWith('.zip')) {
      updateJob({ status: 'error', error: 'Not a .zip file' });
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      updateJob({ status: 'error', error: 'Exceeds 500MB limit' });
      return;
    }

    updateJob({ status: 'uploading', progress: 10 });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('course_id', courseId);

      updateJob({ progress: 30 });

      const res = await fetch('/api/scorm/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      updateJob({ progress: 90 });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();
      updateJob({ status: 'done', progress: 100, pkg: data.package });
      setExistingPackages(prev => [data.package, ...prev]);
      onPackageLinked?.(data.package);
    } catch (err: any) {
      updateJob({ status: 'error', error: err.message || 'Upload failed' });
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.name.endsWith('.zip'));
    if (arr.length === 0) return;

    const newJobs: UploadJob[] = arr.map(f => ({
      file: f,
      status: 'queued',
      progress: 0,
    }));

    setJobs(prev => {
      const base = prev.filter(j => j.status === 'done' || j.status === 'error');
      return [...base, ...newJobs];
    });

    // Upload sequentially to avoid overwhelming the server
    for (let i = 0; i < arr.length; i++) {
      // index relative to current jobs state — use functional update offset
      await uploadOne(arr[i], i);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  const handleArchive = async (pkgId: string) => {
    const { error } = await supabase
      .from('scorm_packages')
      .update({ status: 'archived' })
      .eq('id', pkgId);
    if (!error) setExistingPackages(prev => prev.filter(p => p.id !== pkgId));
  };

  const isUploading = jobs.some(j => j.status === 'uploading' || j.status === 'queued');
  const activeJobs = jobs.filter(j => j.status !== 'done' || jobs.some(jj => jj.status === 'uploading'));

  return (
    <div className="space-y-5">
      {/* Existing packages */}
      {loadingExisting ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
          <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
          Loading packages...
        </div>
      ) : existingPackages.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
            Linked Packages ({existingPackages.length})
          </p>
          {existingPackages.map((pkg) => (
            <div key={pkg.id} className="rounded-2xl border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/10 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                      <span className="text-xs font-bold text-green-600 dark:text-green-400">Active</span>
                    </div>
                    <p className="text-gray-900 dark:text-white font-semibold text-sm">{pkg.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      SCORM {pkg.version} · {pkg.entry_point}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={`/lms/scorm/${pkg.id}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Preview
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleArchive(pkg.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Active upload jobs */}
      {jobs.length > 0 && (
        <div className="space-y-2">
          {jobs.map((job, i) => (
            <div key={i} className={`rounded-xl border px-4 py-3 ${
              job.status === 'error'
                ? 'border-red-200 bg-red-50 dark:border-red-800/30 dark:bg-red-900/10'
                : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/30'
            }`}>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  {job.status === 'done' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : job.status === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-orange-500 animate-spin flex-shrink-0" />
                  )}
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {job.file.name}
                  </span>
                </div>
                <span className={`text-xs font-bold flex-shrink-0 ${
                  job.status === 'done' ? 'text-green-500' :
                  job.status === 'error' ? 'text-red-500' :
                  job.status === 'uploading' ? 'text-orange-500' : 'text-gray-400'
                }`}>
                  {job.status === 'queued' ? 'Queued' :
                   job.status === 'uploading' ? `${job.progress}%` :
                   job.status === 'done' ? 'Done' : 'Failed'}
                </span>
              </div>
              {job.status === 'uploading' && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-orange-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              )}
              {job.status === 'error' && (
                <p className="text-xs text-red-500 mt-0.5">{job.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div>
        {existingPackages.length > 0 && jobs.length === 0 && (
          <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
            Upload More Packages
          </p>
        )}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`
            relative rounded-2xl border-2 border-dashed p-8 cursor-pointer transition-all text-center
            ${dragOver
              ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/5'
              : 'border-gray-200 dark:border-gray-700 hover:border-orange-400 bg-gray-50 dark:bg-gray-800/30 hover:bg-orange-50/50 dark:hover:bg-gray-800/50'
            }
            ${isUploading ? 'cursor-not-allowed opacity-60' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />

          <div className="space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-center mx-auto">
              <FileArchive className="w-7 h-7 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                Drop multiple SCORM packages here
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                or click to browse · select multiple .zip files · up to 500MB each
              </p>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <UploadCloud className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-orange-500 font-semibold">Select Packages</span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Supports Articulate Storyline, Rise, Adobe Captivate, and any SCORM 1.2 compliant package
      </p>
    </div>
  );
}
