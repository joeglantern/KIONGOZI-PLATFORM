'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/app/utils/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PetitionProps {
    petition: any;
    currentUser: any;
    hasSignedProp?: boolean;
}

export default function PetitionCard({ petition, currentUser, hasSignedProp = false }: PetitionProps) {
    const [signatureCount, setSignatureCount] = useState(petition.current_signatures || 0);
    const [hasSigned, setHasSigned] = useState(hasSignedProp);
    const [isSigning, setIsSigning] = useState(false);
    const { toast } = useToast();
    const supabase = createClient();

    const progress = Math.min((signatureCount / (petition.target_signatures || 100)) * 100, 100);

    const handleSign = async (e: React.MouseEvent) => {
        e.preventDefault();

        if (!currentUser) {
            toast({
                title: "Login Required",
                description: "You must be logged in to sign petitions.",
            });
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
                if (error.code === '23505') { // Unique violation
                    setHasSigned(true);
                    toast({ description: "You have already signed this petition." });
                } else {
                    throw error;
                }
            } else {
                setHasSigned(true);
                setSignatureCount((prev: number) => prev + 1);
                toast({
                    title: "Signed!",
                    description: "Thank you for your support.",
                    className: "bg-civic-green text-white border-none"
                });
            }
        } catch (error: any) {
            console.error('Error signing petition:', error);
            toast({
                title: "Error",
                description: "Failed to sign petition. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSigning(false);
        }
    };

    return (
        <Card className="flex flex-col h-full border-civic-earth/10 hover:border-civic-clay/30 transition-all duration-300 group overflow-hidden bg-card/50">
            {petition.image_url && (
                <div className="h-40 w-full overflow-hidden relative">
                    <img
                        src={petition.image_url}
                        alt={petition.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <Badge className="absolute bottom-3 left-3 bg-white/90 text-civic-green-dark hover:bg-white">
                        {petition.status === 'active' ? 'Active Campaign' : 'Closed'}
                    </Badge>
                </div>
            )}

            <CardHeader className={cn("pb-2", !petition.image_url && "pt-6")}>
                <CardTitle className="text-xl leading-tight text-foreground group-hover:text-civic-clay transition-colors line-clamp-2">
                    <Link href={`/community/petitions/${petition.id}`}>
                        {petition.title}
                    </Link>
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                    <FileText className="h-3 w-3" />
                    <span>Started {formatDistanceToNow(new Date(petition.created_at), { addSuffix: true })}</span>
                </div>
            </CardHeader>

            <CardContent className="flex-1 pb-4">
                <p className="text-sm text-foreground/80 line-clamp-3 mb-4 leading-relaxed">
                    {petition.description}
                </p>

                <div className="space-y-2 mt-auto">
                    <div className="flex justify-between text-xs font-medium">
                        <span className="text-civic-green-dark">{signatureCount} signatures</span>
                        <span className="text-muted-foreground">Goal: {petition.target_signatures}</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-civic-earth/10 [&>div]:bg-civic-green" />
                </div>
            </CardContent>

            <CardFooter className="pt-0 border-t border-border/40 p-4 bg-muted/5 mt-auto">
                <div className="flex gap-3 w-full">
                    {hasSigned ? (
                        <Button variant="outline" className="flex-1 bg-civic-green/10 border-civic-green/20 text-civic-green-dark cursor-default hover:bg-civic-green/10">
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Signed
                        </Button>
                    ) : (
                        <Button
                            className="flex-1 bg-civic-clay hover:bg-civic-clay/90 text-white"
                            onClick={handleSign}
                            disabled={isSigning || petition.status !== 'active'}
                        >
                            {isSigning ? 'Signing...' : 'Sign Petition'}
                        </Button>
                    )}

                    <Button variant="ghost" size="icon" asChild className="shrink-0 text-muted-foreground hover:text-civic-clay">
                        <Link href={`/community/petitions/${petition.id}`}>
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
