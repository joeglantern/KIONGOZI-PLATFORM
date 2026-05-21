'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Share2, FileSignature, Trash2 } from 'lucide-react';
import { createClient } from '@/app/utils/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AnimatedToast, ToastAction } from '@/components/gamification/AnimatedToast';

interface PetitionActionsProps {
    petition: any;
    currentUser: any;
    hasSignedProp: boolean;
}

export default function PetitionActions({ petition, currentUser, hasSignedProp }: PetitionActionsProps) {
    const [hasSigned, setHasSigned] = useState(hasSignedProp);
    const [isSigning, setIsSigning] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [actionToast, setActionToast] = useState<ToastAction | null>(null);
    const { toast } = useToast();
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);

    const isOwner = currentUser?.id && petition.created_by === currentUser.id;

    const handleDelete = async () => {
        if (!window.confirm('Delete this petition? This cannot be undone.')) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase.from('social_petitions').delete().eq('id', petition.id);
            if (error) throw error;
            toast({ title: 'Petition deleted', className: 'bg-destructive text-white border-none' });
            router.push('/community/petitions');
        } catch {
            toast({ title: 'Failed to delete petition', variant: 'destructive' });
            setIsDeleting(false);
        }
    };

    const handleSign = async () => {
        if (!currentUser) {
            toast({
                title: "Login Required",
                description: "You must be logged in to sign petitions.",
            });
            // Redirect to login could happen here
            return;
        }

        if (hasSigned || isSigning) return;

        setIsSigning(true);
        try {
            const { error } = await supabase
                .from('social_petition_signatures')
                .insert({
                    petition_id: petition.id,
                    user_id: currentUser.id
                });

            if (error) {
                if (error.code === '23505') {
                    setHasSigned(true);
                    toast({ description: "You have already signed this petition." });
                } else {
                    throw error;
                }
            } else {
                setHasSigned(true);

                // Award Gamification XP for Civic Action (50 XP for petition)
                await supabase.rpc('award_civic_action', {
                    user_uuid: currentUser.id,
                    xp_amount: 50
                });

                // Trigger the beautiful animated toast
                setActionToast({
                    id: Date.now().toString(),
                    message: "Petition Signed!",
                    xpAwarded: 50,
                    icon: <FileSignature className="w-6 h-6" />
                });
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to sign petition.",
                variant: "destructive",
            });
        } finally {
            setIsSigning(false);
        }
    };

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: petition.title,
                    text: petition.description.slice(0, 100),
                    url: url,
                });
            } catch (err) {
                // Ignore abort
            }
        } else {
            navigator.clipboard.writeText(url);
            toast({ title: "Copied!", description: "Link copied to clipboard." });
        }
    };

    return (
        <div className="space-y-3">
            {hasSigned ? (
                <div className="bg-civic-green/10 border border-civic-green/20 rounded-lg p-4 text-center">
                    <div className="flex justify-center mb-2">
                        <CheckCircle2 className="h-8 w-8 text-civic-green" />
                    </div>
                    <h3 className="font-semibold text-civic-green-dark">You've signed this petition!</h3>
                    <p className="text-sm text-muted-foreground mt-1">Now verify your impact by sharing.</p>
                </div>
            ) : (
                <Button
                    className="w-full h-12 text-lg bg-civic-clay hover:bg-civic-clay/90 text-white shadow-md animate-in fade-in zoom-in duration-300"
                    onClick={handleSign}
                    disabled={isSigning || petition.status !== 'active'}
                >
                    {isSigning ? 'Signing...' : 'Sign This Petition'}
                </Button>
            )}

            <Button variant="outline" className="w-full" onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share Petition
            </Button>

            {isOwner && (
                <Button
                    variant="outline"
                    className="w-full border-destructive/40 text-destructive hover:bg-destructive/5"
                    onClick={handleDelete}
                    disabled={isDeleting}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? 'Deleting…' : 'Delete Petition'}
                </Button>
            )}

            <AnimatedToast action={actionToast} onClose={() => setActionToast(null)} />
        </div>
    );
}
