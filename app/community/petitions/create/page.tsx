'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Calendar } from 'lucide-react';
import ImageUpload from '@/components/ui/ImageUpload';
import Link from 'next/link';

export default function CreatePetitionPage() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [targetSignatures, setTargetSignatures] = useState<string>('100');
    const [deadline, setDeadline] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const { toast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !description.trim()) {
            toast({
                title: "Missing Information",
                description: "Please provide a title and description.",
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
                    description: "Please log in to create a petition.",
                    variant: "destructive",
                });
                return;
            }

            const { data, error } = await supabase
                .from('social_petitions')
                .insert({
                    title,
                    description,
                    target_signatures: parseInt(targetSignatures) || 100,
                    created_by: user.id,
                    status: 'active',
                    ...(deadline ? { deadline } : {}),
                    ...(imageUrl ? { image_url: imageUrl } : {}),
                })
                .select()
                .single();

            if (error) throw error;

            toast({
                title: "Success!",
                description: "Your petition has been created.",
                className: "bg-civic-green text-white border-none"
            });

            router.push('/community/petitions');
        } catch (error: any) {
            console.error('Error creating petition:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to create petition.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8">
            <Button variant="ghost" asChild className="mb-6">
                <Link href="/community/petitions">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Actions
                </Link>
            </Button>

            <Card className="border-civic-green/20 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl text-civic-green-dark">Start a New Petition</CardTitle>
                    <CardDescription>
                        Mobilize the community around a cause you care about.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label>Cover Image <span className="text-muted-foreground text-xs">(optional)</span></Label>
                            <ImageUpload
                                onUpload={setImageUrl}
                                current={imageUrl}
                                folder="kiongozi/petitions"
                                label="Upload a cover image for your petition"
                                aspectHint="banner"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="title">Petition Title</Label>
                            <Input
                                id="title"
                                placeholder="E.g., Protect the local wetlands"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={100}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Why is this important?</Label>
                            <Textarea
                                id="description"
                                placeholder="Explain the issue, why it matters, and what you want to change..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="min-h-[200px]"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="target">Signature Goal</Label>
                            <Input
                                id="target"
                                type="number"
                                min="10"
                                max="1000000"
                                value={targetSignatures}
                                onChange={(e) => setTargetSignatures(e.target.value)}
                                required
                            />
                            <p className="text-xs text-muted-foreground">Start with a realistic goal. You can increase it later!</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="deadline" className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" /> Petition Deadline <span className="text-muted-foreground text-xs">(optional)</span>
                            </Label>
                            <Input
                                id="deadline"
                                type="datetime-local"
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">Set a date by which you want to reach your goal.</p>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-civic-green hover:bg-civic-green-dark text-white h-12 text-lg"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Launching Campaign...
                                </>
                            ) : (
                                'Launch Petition'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
