'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video, Save, Loader2, Link as LinkIcon } from 'lucide-react';
import { createClient } from '@/app/utils/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RecordingManagerProps {
    eventId: string;
    initialRecordingUrl?: string;
}

export default function RecordingManager({ eventId, initialRecordingUrl }: RecordingManagerProps) {
    const [recordingUrl, setRecordingUrl] = useState(initialRecordingUrl || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(!initialRecordingUrl);
    const { toast } = useToast();
    const supabase = createClient();

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('social_events')
                .update({ recording_url: recordingUrl || null })
                .eq('id', eventId);

            if (error) throw error;

            toast({
                title: "Recording Updated",
                description: recordingUrl ? "Recording link has been saved." : "Recording link removed.",
                className: "bg-civic-green text-white border-none"
            });
            setIsEditing(false);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to save recording.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (!isEditing && initialRecordingUrl) {
        return (
            <div className="flex items-center justify-between p-3 bg-civic-green/10 border border-civic-green/20 rounded-lg">
                <div className="flex items-center gap-2 overflow-hidden">
                    <Video className="h-4 w-4 text-civic-green-dark shrink-0" />
                    <span className="text-xs font-medium truncate text-civic-green-dark">Archive Linked</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-7 text-xs">
                    Edit Link
                </Button>
            </div>
        );
    }

    return (
        <div className="p-4 bg-muted/30 border border-border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-civic-green" />
                <Label className="text-sm font-semibold">Session Recording</Label>
            </div>
            <div className="flex gap-2">
                <Input
                    placeholder="Link to Zoom info, YouTube, etc."
                    value={recordingUrl}
                    onChange={(e) => setRecordingUrl(e.target.value)}
                    className="h-9 text-xs"
                />
                <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-civic-green hover:bg-civic-green-dark text-white"
                >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
            </div>
            <p className="text-[10px] text-muted-foreground italic leading-tight">
                Paste the URL here once the session is over so community members can catch up.
            </p>
        </div>
    );
}
