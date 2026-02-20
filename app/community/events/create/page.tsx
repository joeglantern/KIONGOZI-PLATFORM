'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, CalendarIcon } from 'lucide-react';
import Link from 'next/link';

export default function CreateEventPage() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [eventType, setEventType] = useState('meetup');
    const [location, setLocation] = useState('');
    const [meetingUrl, setMeetingUrl] = useState('');
    const [useNativeVideo, setUseNativeVideo] = useState(false);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const { toast } = useToast();
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title || !description || !location || !startTime || !endTime) {
            toast({
                title: "Missing Information",
                description: "Please fill in all required fields.",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                toast({
                    title: "Authentication Required",
                    description: "Please log in to host an event.",
                    variant: "destructive",
                });
                return;
            }

            // If using native video, we don't save a meeting_url (or we could save a special one)
            // But we'll rely on a check in the UI to show the 'Join Stage' button if no external URL is present
            // Wait, we need a flag. Let's hijack meeting_url with a 'INTERNAL' flag or just save null
            // and add a column?
            // For now, let's use a convention: meeting_url = 'INTERNAL_LIVE_STAGE'

            const finalMeetingUrl = useNativeVideo ? 'INTERNAL_LIVE_STAGE' : meetingUrl;

            const { data, error } = await supabase
                .from('social_events')
                .insert({
                    title,
                    description,
                    event_type: eventType,
                    location,
                    meeting_url: finalMeetingUrl || null,
                    start_time: new Date(startTime).toISOString(),
                    end_time: new Date(endTime).toISOString(),
                    created_by: user.id
                })
                .select()
                .single();

            if (error) throw error;

            toast({
                title: "Event Created!",
                description: "Your event has been published.",
                className: "bg-civic-green text-white border-none"
            });

            router.push(`/community/events/${data.id}`);
        } catch (error: any) {
            console.error('Error creating event:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to create event.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8">
            <Button variant="ghost" asChild className="mb-6">
                <Link href="/community/events">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Calendar
                </Link>
            </Button>

            <Card className="border-civic-green/20 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl text-civic-green-dark flex items-center gap-2">
                        <CalendarIcon className="h-6 w-6" />
                        Host an Event
                    </CardTitle>
                    <CardDescription>
                        Organize a gathering, rally, or workshop for your community.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Event Title</Label>
                            <Input
                                id="title"
                                placeholder="E.g., Community Town Hall"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={100}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="type">Event Type</Label>
                                <Select value={eventType} onValueChange={setEventType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="meetup">Meetup</SelectItem>
                                        <SelectItem value="townhall">Town Hall</SelectItem>
                                        <SelectItem value="protest">Protest / Rally</SelectItem>
                                        <SelectItem value="cleanup">Cleanup</SelectItem>
                                        <SelectItem value="workshop">Workshop</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="location">Location</Label>
                                <Input
                                    id="location"
                                    placeholder="Address or 'Online'"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Platform Toggle */}
                        <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
                            <Label className="text-base font-semibold">Where is this happening?</Label>

                            <div className="flex gap-4 pt-2">
                                <Button
                                    type="button"
                                    variant={useNativeVideo ? 'default' : 'outline'}
                                    className={useNativeVideo ? 'bg-civic-green hover:bg-civic-green-dark text-white' : ''}
                                    onClick={() => setUseNativeVideo(true)}
                                >
                                    Native Live Stage
                                </Button>
                                <Button
                                    type="button"
                                    variant={!useNativeVideo ? 'default' : 'outline'}
                                    className={!useNativeVideo ? 'bg-civic-green hover:bg-civic-green-dark text-white' : ''}
                                    onClick={() => setUseNativeVideo(false)}
                                >
                                    External Link
                                </Button>
                            </div>

                            {useNativeVideo ? (
                                <p className="text-sm text-muted-foreground">
                                    Hosted directly on Kiongozi. Users can join a secure audio/video room instantly. Best for Town Halls and AMAs.
                                </p>
                            ) : (
                                <div className="space-y-2 pt-2">
                                    <Label htmlFor="meetingUrl">External Meeting Link</Label>
                                    <Input
                                        id="meetingUrl"
                                        placeholder="https://zoom.us/j/..."
                                        type="url"
                                        value={meetingUrl}
                                        onChange={(e) => setMeetingUrl(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start">Start Time</Label>
                                <Input
                                    id="start"
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="end">End Time</Label>
                                <Input
                                    id="end"
                                    type="datetime-local"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe the agenda, what to bring, etc..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="min-h-[150px]"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-civic-green hover:bg-civic-green-dark text-white h-12 text-lg"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Publishing...
                                </>
                            ) : (
                                'Publish Event'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
