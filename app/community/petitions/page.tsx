import { createClient } from '@/app/utils/supabase/server';
import { getCurrentUser } from '@/lib/auth/current-user';
import PetitionCard from '@/components/social/PetitionCard';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default async function PetitionsPage() {
    const supabase = await createClient();
    const user = await getCurrentUser();

    // Fetch active petitions
    const { data: petitions, error } = await supabase
        .from('social_petitions')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50);

    // Fetch real signature counts and user's signed petitions in parallel
    let signedPetitionIds = new Set<string>();
    let signatureCountMap = new Map<string, number>();

    if (petitions?.length) {
        const petitionIds = petitions.map(p => p.id);

        const [allSigsResult, userSigsResult] = await Promise.all([
            supabase
                .from('social_petition_signatures')
                .select('petition_id')
                .in('petition_id', petitionIds),
            user
                ? supabase
                    .from('social_petition_signatures')
                    .select('petition_id')
                    .eq('user_id', user.id)
                    .in('petition_id', petitionIds)
                : Promise.resolve({ data: [] }),
        ]);

        allSigsResult.data?.forEach((s: any) => {
            signatureCountMap.set(s.petition_id, (signatureCountMap.get(s.petition_id) || 0) + 1);
        });
        (userSigsResult as any).data?.forEach((s: any) => signedPetitionIds.add(s.petition_id));
    }

    const petitionsWithCounts = (petitions || []).map(p => ({
        ...p,
        current_signatures: signatureCountMap.get(p.id) || 0,
    }));

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-civic-earth/10 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-civic-green-dark">Action Center</h1>
                    <p className="text-muted-foreground text-lg mt-1">
                        Mobilize for change. Start or support a cause that matters.
                    </p>
                </div>
                <Button asChild className="bg-civic-green hover:bg-civic-green-dark text-white shadow-md">
                    <Link href="/community/petitions/create">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Start Petition
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {petitionsWithCounts.map((petition) => (
                    <PetitionCard
                        key={petition.id}
                        petition={petition}
                        currentUser={user}
                        hasSignedProp={signedPetitionIds.has(petition.id)}
                    />
                ))}

                {petitionsWithCounts.length === 0 && (
                    <div className="col-span-full text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
                        <h3 className="text-xl font-medium text-foreground mb-2">No Active Petitions</h3>
                        <p className="text-muted-foreground mb-6">Be the first to mobilize the community for a cause.</p>
                        <Button asChild variant="outline" className="border-civic-green text-civic-green">
                            <Link href="/community/petitions/create">Start a Campaign</Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
