import { createClient } from '@/app/utils/supabase/server';
import ImpactReportCard from '@/components/social/ImpactReportCard';
import { Button } from '@/components/ui/button';
import { Map, PlusCircle, List } from 'lucide-react';
import Link from 'next/link';

export default async function ImpactPage() {
    const supabase = await createClient();

    // Fetch reports
    const { data: reports } = await supabase
        .from('social_impact_reports')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-civic-green-dark flex items-center gap-3">
                        <Map className="h-8 w-8" />
                        Impact Map
                    </h1>
                    <p className="text-muted-foreground text-lg mt-1 max-w-2xl">
                        See what's happening in your community. Report issues, track infrastructure projects, and celebrate wins.
                    </p>
                </div>
                <div className="flex gap-2">
                    {/* Placeholder for Toggle View (Map/List) */}
                    {/* <Button variant="outline" size="sm" disabled>
                        <List className="mr-2 h-4 w-4" />
                        List
                    </Button> */}
                    <Button asChild className="bg-civic-clay hover:bg-civic-clay/90 text-white shadow-md">
                        <Link href="/community/impact/create">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Report Issue
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Placeholder for Actual Map Component */}
            <div className="bg-civic-earth/5 border border-civic-earth/10 rounded-xl h-64 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                <Map className="h-12 w-12 mb-4 opacity-20" />
                <p className="max-w-md">
                    Interactive map view is currently being integrated.
                    <br />
                    Below is the feed of recent community reports.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports?.map((report) => (
                    <ImpactReportCard key={report.id} report={report} />
                ))}

                {(!reports || reports.length === 0) && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No reports yet. Be the first to report an issue or success in your area!
                    </div>
                )}
            </div>
        </div>
    );
}
