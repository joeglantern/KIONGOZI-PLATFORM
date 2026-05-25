"use client";

import { useCallback, useRef, useState } from 'react';
import * as tus from 'tus-js-client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, UploadCloud, FileText, Video as VideoIcon, X, CheckCircle2 } from 'lucide-react';

interface Props {
    courseId: string;
    supabase: any;
    slidesUrl: string;
    slidesType: 'pdf' | 'pptx' | '';
    videoUrl: string;
    onSlidesChange: (url: string, type: 'pdf' | 'pptx' | '') => void;
    onVideoChange: (url: string) => void;
}

const SLIDES_ACCEPT = '.pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation';
const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime';

export default function CourseMediaPanel({
    courseId,
    supabase,
    slidesUrl,
    slidesType,
    videoUrl,
    onSlidesChange,
    onVideoChange,
}: Props) {
    const { toast } = useToast();

    const [uploadingSlides, setUploadingSlides] = useState(false);
    const [slidesProgress, setSlidesProgress] = useState(0);
    const [uploadingVideo, setUploadingVideo] = useState(false);
    const [videoProgress, setVideoProgress] = useState(0);

    const slidesInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    const detectSlidesType = (file: File): 'pdf' | 'pptx' | '' => {
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf';
        if (file.name.toLowerCase().endsWith('.pptx') || file.type.includes('presentation')) return 'pptx';
        return '';
    };

    const handleSlidesUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        const detected = detectSlidesType(file);
        if (!detected) {
            toast({ title: 'Unsupported file', description: 'Please upload a PDF or PPTX.', variant: 'destructive' });
            return;
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const filePath = `course-slides/${courseId}/${fileName}`;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { toast({ title: 'Session expired. Please refresh.', variant: 'destructive' }); return; }

        setUploadingSlides(true);
        setSlidesProgress(0);

        const upload = new tus.Upload(file, {
            endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            headers: { authorization: `Bearer ${session.access_token}`, 'x-upsert': 'false' },
            uploadDataDuringCreation: true,
            removeFingerprintOnSuccess: true,
            metadata: { bucketName: 'courses', objectName: filePath, contentType: file.type, cacheControl: '3600' },
            chunkSize: 6 * 1024 * 1024,
            onError(err) {
                toast({ title: 'Slides upload failed', description: err.message, variant: 'destructive' });
                setUploadingSlides(false);
            },
            onProgress(uploaded, total) {
                setSlidesProgress(Math.round((uploaded / total) * 100));
            },
            onSuccess() {
                const { data: { publicUrl } } = supabase.storage.from('courses').getPublicUrl(filePath);
                onSlidesChange(publicUrl, detected);
                setUploadingSlides(false);
                setSlidesProgress(100);
            },
        });

        const prev = await upload.findPreviousUploads();
        if (prev.length > 0) upload.resumeFromPreviousUpload(prev[0]);
        upload.start();
    }, [courseId, supabase, onSlidesChange, toast]);

    const handleVideoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        if (!file.type.startsWith('video/')) {
            toast({ title: 'Unsupported file', description: 'Please upload a video file (MP4, WebM, MOV).', variant: 'destructive' });
            return;
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const filePath = `course-videos/${courseId}/${fileName}`;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { toast({ title: 'Session expired. Please refresh.', variant: 'destructive' }); return; }

        setUploadingVideo(true);
        setVideoProgress(0);

        const upload = new tus.Upload(file, {
            endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            headers: { authorization: `Bearer ${session.access_token}`, 'x-upsert': 'false' },
            uploadDataDuringCreation: true,
            removeFingerprintOnSuccess: true,
            metadata: { bucketName: 'courses', objectName: filePath, contentType: file.type, cacheControl: '3600' },
            chunkSize: 6 * 1024 * 1024,
            onError(err) {
                toast({ title: 'Video upload failed', description: err.message, variant: 'destructive' });
                setUploadingVideo(false);
            },
            onProgress(uploaded, total) {
                setVideoProgress(Math.round((uploaded / total) * 100));
            },
            onSuccess() {
                const { data: { publicUrl } } = supabase.storage.from('courses').getPublicUrl(filePath);
                onVideoChange(publicUrl);
                setUploadingVideo(false);
                setVideoProgress(100);
            },
        });

        const prev = await upload.findPreviousUploads();
        if (prev.length > 0) upload.resumeFromPreviousUpload(prev[0]);
        upload.start();
    }, [courseId, supabase, onVideoChange, toast]);

    const fileNameFromUrl = (url: string) => {
        try {
            const decoded = decodeURIComponent(url);
            return decoded.split('/').pop() || url;
        } catch { return url; }
    };

    return (
        <div className="space-y-6">
            <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Course-Level Slides & Video</label>
                <p className="text-xs text-gray-400 mt-1">
                    Optional. Upload one slide deck (PDF or PPTX) and one walkthrough video (MP4) — students choose Text, Slides, or Video mode on the course page.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* SLIDES */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Slides (PDF or PPTX)</span>
                    </div>
                    <div
                        onClick={() => !uploadingSlides && slidesInputRef.current?.click()}
                        className={`relative w-full rounded-2xl border-2 border-dashed transition-all bg-gray-50 dark:bg-gray-800 ${uploadingSlides
                            ? 'border-orange-300 cursor-wait'
                            : 'border-gray-200 dark:border-gray-700 cursor-pointer hover:border-orange-400'
                            }`}
                        style={{ minHeight: 160 }}
                    >
                        {uploadingSlides ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
                                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                                <p className="text-xs font-bold text-orange-500">Uploading… {slidesProgress}%</p>
                                <div className="w-full max-w-[200px] h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500 transition-all" style={{ width: `${slidesProgress}%` }} />
                                </div>
                            </div>
                        ) : slidesUrl ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
                                <CheckCircle2 className="w-7 h-7 text-green-500" />
                                <p className="text-xs font-bold text-gray-700 dark:text-gray-200 break-all line-clamp-2">
                                    {fileNameFromUrl(slidesUrl)}
                                </p>
                                <div className="flex items-center gap-2 text-xs font-bold">
                                    <span className="px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 uppercase text-gray-600 dark:text-gray-300">
                                        {slidesType || 'file'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onSlidesChange('', ''); }}
                                        className="text-red-500 hover:text-red-600 inline-flex items-center gap-1"
                                    >
                                        <X className="w-3 h-3" /> Remove
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); slidesInputRef.current?.click(); }}
                                        className="text-orange-500 hover:text-orange-600"
                                    >
                                        Replace
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-4 text-center">
                                <UploadCloud className="w-8 h-8 text-gray-300" />
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">Click to upload slides</p>
                                <p className="text-[10px] text-gray-400">PDF or PPTX — up to 500 MB</p>
                            </div>
                        )}
                    </div>
                    <input
                        ref={slidesInputRef}
                        type="file"
                        accept={SLIDES_ACCEPT}
                        onChange={handleSlidesUpload}
                        className="hidden"
                    />
                </div>

                {/* VIDEO */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <VideoIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Walkthrough video</span>
                    </div>
                    <div
                        onClick={() => !uploadingVideo && videoInputRef.current?.click()}
                        className={`relative w-full rounded-2xl border-2 border-dashed transition-all bg-gray-50 dark:bg-gray-800 ${uploadingVideo
                            ? 'border-orange-300 cursor-wait'
                            : 'border-gray-200 dark:border-gray-700 cursor-pointer hover:border-orange-400'
                            }`}
                        style={{ minHeight: 160 }}
                    >
                        {uploadingVideo ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
                                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                                <p className="text-xs font-bold text-orange-500">Uploading… {videoProgress}%</p>
                                <div className="w-full max-w-[200px] h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500 transition-all" style={{ width: `${videoProgress}%` }} />
                                </div>
                            </div>
                        ) : videoUrl ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
                                <video
                                    src={videoUrl}
                                    className="w-full max-h-24 rounded-lg object-contain bg-black"
                                    preload="metadata"
                                />
                                <p className="text-xs font-bold text-gray-700 dark:text-gray-200 break-all line-clamp-1">
                                    {fileNameFromUrl(videoUrl)}
                                </p>
                                <div className="flex items-center gap-3 text-xs font-bold">
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onVideoChange(''); }}
                                        className="text-red-500 hover:text-red-600 inline-flex items-center gap-1"
                                    >
                                        <X className="w-3 h-3" /> Remove
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); videoInputRef.current?.click(); }}
                                        className="text-orange-500 hover:text-orange-600"
                                    >
                                        Replace
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-4 text-center">
                                <UploadCloud className="w-8 h-8 text-gray-300" />
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">Click to upload video</p>
                                <p className="text-[10px] text-gray-400">MP4 / WebM / MOV — up to 500 MB</p>
                            </div>
                        )}
                    </div>
                    <input
                        ref={videoInputRef}
                        type="file"
                        accept={VIDEO_ACCEPT}
                        onChange={handleVideoUpload}
                        className="hidden"
                    />
                </div>
            </div>
        </div>
    );
}
