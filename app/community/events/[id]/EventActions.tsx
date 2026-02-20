'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Share2, Star } from 'lucide-react';
import { createClient } from '@/app/utils/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface EventActionsProps {
    event: any;
    currentUser: any;
    rsvpStatusProp: 'going' | 'interested' | null;
}

export default function EventActions({ event, currentUser, rsvpStatusProp }: EventActionsProps) {
    const [rsvpStatus, setRsvpStatus] = useState<string | null>(rsvpStatusProp);
    const [isRsvping, setIsRsvping] = useState(false);
    const { toast } = useToast();
    const supabase = createClient();

    const handleRsvp = async (status: 'going' | 'interested') => {
        if (!currentUser) {
            toast({
                title: "Login Required",
                description: "You must be logged in to RSVP.",
            });
            return;
        }

        if (isRsvping) return;
        setIsRsvping(true);

        try {
            if (rsvpStatus === status) {
                // Toggle off
                const { error } = await supabase
                    .from('social_event_rsvps')
                    .delete()
                    .eq('event_id', event.id)
                    .eq('user_id', currentUser.id);

                if (error) throw error;
                setRsvpStatus(null);
                toast({ description: "RSVP removed." });
            } else {
                // If changing an existing RSVP status, update it. If new, insert it.
                if (rsvpStatus) {
                    const { error } = await supabase
                        .from('social_event_rsvps')
                        .update({ status: status })
                        .eq('event_id', event.id)
                        .eq('user_id', currentUser.id);

                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from('social_event_rsvps')
                        .insert({
                            event_id: event.id,
                            user_id: currentUser.id,
                            status: status
                        });

                    if (error) throw error;
                }

                setRsvpStatus(status);
                toast({
                    title: status === 'going' ? "You're going!" : "Interest saved.",
                    className: "bg-civic-green text-white border-none"
                });
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to update RSVP.",
                variant: "destructive",
            });
        } finally {
            setIsRsvping(false);
        }
    };

    return (
        <div className="space-y-3 w-full">
            <Button
                className={cn(
                    "w-full h-12 text-lg shadow-sm transition-all",
                    rsvpStatus === 'going'
                        ? "bg-civic-green/10 text-civic-green-dark border-civic-green/20 border hover:bg-civic-green/20"
                        : "bg-civic-green hover:bg-civic-green-dark text-white"
                )}
                onClick={() => handleRsvp('going')}
                disabled={isRsvping}
                variant={rsvpStatus === 'going' ? 'outline' : 'default'}
            >
                {rsvpStatus === 'going' ? (
                    <>
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        I'm Going
                    </>
                ) : (
                    'RSVP Going'
                )}
            </Button>

            <Button
                className={cn("w-full", rsvpStatus === 'interested' && "bg-secondary/50")}
                variant="outline"
                onClick={() => handleRsvp('interested')}
                disabled={isRsvping}
            >
                <Star className={cn("mr-2 h-4 w-4", rsvpStatus === 'interested' && "fill-current text-yellow-500")} />
                {rsvpStatus === 'interested' ? 'Interested' : 'Interested'}
            </Button>
        </div>
    );
}
