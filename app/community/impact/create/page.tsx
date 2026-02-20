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
import { Loader2, ArrowLeft, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function CreateImpactReportPage() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [reportType, setReportType] = useState('infrastructure');
    const [locationName, setLocationName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const { toast } = useToast();
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title || !description || !locationName) {
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
                    description: "Please log in to submit a report.",
                    variant: "destructive",
                });
                return;
            }

            const { error } = await supabase
                .from('social_impact_reports')
                .insert({
                    title,
                    description,
                    report_type: reportType,
                    location_name: locationName,
                    // Lat/Lng would optionally come from a map picker here in future
                    created_by: user.id,
                    status: 'pending'
                });

            if (error) throw error;

            toast({
                title: "Report Submitted",
                description: "Thank you for helping improve our community.",
                className: "bg-civic-green text-white border-none"
            });

            router.push('/community/impact');
        } catch (error: any) {
            console.error('Error creating report:', error);
            toast({
                title: "Error",
                description: "Failed to submit report.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8">
            <Button variant="ghost" asChild className="mb-6">
                <Link href="/community/impact">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Map
                </Link>
            </Button>

            <Card className="border-civic-clay/20 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl text-civic-clay flex items-center gap-2">
                        <MapPin className="h-6 w-6" />
                        Report a Community Issue
                    </CardTitle>
                    <CardDescription>
                        Flag infrastructure problems, safety concerns, or environmental hazards.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Report Title</Label>
                            <Input
                                id="title"
                                placeholder="E.g., Pothole on Main St, Broken Streetlight"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={100}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="type">Issue Type</Label>
                            <Select value={reportType} onValueChange={setReportType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="infrastructure">Infrastructure (Roads, Power, Water)</SelectItem>
                                    <SelectItem value="safety">Public Safety / Hazard</SelectItem>
                                    <SelectItem value="environment">Environment (Trash, Pollution)</SelectItem>
                                    <SelectItem value="praise">Community Praise / Success</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                                id="location"
                                placeholder="Address, Landmark, or Coordinates"
                                value={locationName}
                                onChange={(e) => setLocationName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe the issue in detail..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="min-h-[150px]"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-civic-clay hover:bg-civic-clay/90 text-white h-12 text-lg"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                'Submit Report'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
