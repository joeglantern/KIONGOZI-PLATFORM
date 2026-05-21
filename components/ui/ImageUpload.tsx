'use client';

import { useRef, useState } from 'react';
import { ImageIcon, Loader2, X, UploadCloud } from 'lucide-react';
import Image from 'next/image';

interface ImageUploadProps {
    onUpload: (url: string) => void;
    current?: string;
    folder?: string;
    label?: string;
    className?: string;
    maxMB?: number;
    aspectHint?: string; // e.g. "square" | "banner"
}

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

export default function ImageUpload({
    onUpload, current, folder = 'kiongozi', label = 'Upload Image',
    className = '', maxMB = 8, aspectHint,
}: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string>(current ?? '');
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        setError('');
        if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
        if (file.size > maxMB * 1024 * 1024) { setError(`Max file size is ${maxMB}MB.`); return; }

        // Show local preview immediately
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        setUploading(true);

        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('upload_preset', PRESET);
            fd.append('folder', folder);

            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
                method: 'POST', body: fd,
            });
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            setPreview(data.secure_url);
            onUpload(data.secure_url);
        } catch {
            setError('Upload failed. Please try again.');
            setPreview(current ?? '');
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const clear = () => {
        setPreview('');
        onUpload('');
        if (inputRef.current) inputRef.current.value = '';
    };

    if (preview) {
        return (
            <div className={`relative group rounded-xl overflow-hidden border border-border ${className}`}>
                <img src={preview} alt="Upload preview"
                    className={`w-full object-cover ${aspectHint === 'square' ? 'aspect-square' : 'aspect-video'}`} />
                {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                )}
                {!uploading && (
                    <button type="button" onClick={clear}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className={className}>
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                disabled={uploading}
                className="w-full border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {uploading
                    ? <><Loader2 className="w-8 h-8 animate-spin" /><span className="text-sm">Uploading…</span></>
                    : <><UploadCloud className="w-8 h-8" /><span className="text-sm font-medium">{label}</span>
                        <span className="text-xs">Click or drag & drop · Max {maxMB}MB</span></>}
            </button>
            <input ref={inputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
    );
}
