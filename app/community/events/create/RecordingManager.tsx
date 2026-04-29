'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video, Save, Loader2, Copy, ExternalLink, Pencil } from 'lucide-react';
import { createClient } from '@/app/utils/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isSafeUrl } from '@/lib/events';

interface RecordingManagerProps {
    eventId: string;
    initialRecordingUrl?: string;
}

export default function RecordingManager({ eventId, initialRecordingUrl }: RecordingManagerProps) {
    // Track the saved URL separately from the input value so the saved state
    // reflects the last successful save, not the initial prop (which never changes).
    const [savedUrl, setSavedUrl] = useState(initialRecordingUrl || '');
    const [inputUrl, setInputUrl] = useState(initialRecordingUrl || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(!initialRecordingUrl);
    const { toast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const handleSave = async () => {
        if (inputUrl && !isSafeUrl(inputUrl)) {
            toast({ title: "Invalid URL", description: "Recording link must start with https:// or http://", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('social_events')
                .update({ recording_url: inputUrl || null })
                .eq('id', eventId);

            if (error) throw error;

            setSavedUrl(inputUrl);
            setIsEditing(false);
            toast({
                title: inputUrl ? "Recording link saved" : "Recording link removed",
                className: "bg-civic-green text-white border-none"
            });
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to save recording.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(savedUrl);
        toast({ description: "Recording link copied to clipboard." });
    };

    // Saved state — show the URL with copy + open buttons
    if (!isEditing && savedUrl) {
        return (
            <div className="p-3 bg-civic-green/10 border border-civic-green/20 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-civic-green-dark shrink-0" />
                        <span className="text-xs font-semibold text-civic-green-dark">Recording Linked</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setInputUrl(savedUrl); setIsEditing(true); }} className="h-6 text-xs px-2 text-muted-foreground">
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                </div>
                <p className="text-[11px] text-muted-foreground truncate font-mono">{savedUrl}</p>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleCopy} className="h-7 text-xs flex-1 gap-1 border-civic-green/30 text-civic-green-dark">
                        <Copy className="h-3 w-3" /> Copy link
                    </Button>
                    <Button size="sm" variant="outline" asChild className="h-7 text-xs flex-1 gap-1 border-civic-green/30 text-civic-green-dark">
                        <a href={savedUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" /> Open
                        </a>
                    </Button>
                </div>
            </div>
        );
    }

    // Edit state
    return (
        <div className="p-4 bg-muted/30 border border-border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-civic-green" />
                <Label className="text-sm font-semibold">Session Recording</Label>
            </div>
            <div className="flex gap-2">
                <Input
                    placeholder="https://youtube.com/... or Zoom link"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    className="h-9 text-xs"
                />
                <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-civic-green hover:bg-civic-green-dark text-white shrink-0"
                >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
            </div>
            <p className="text-[10px] text-muted-foreground italic leading-tight">
                Paste the recording URL once the session is over — attendees will see a "Watch Recording" button.
            </p>
        </div>
    );
}
