import { createClient } from '@/app/utils/supabase/server';
import LibraryClient from './LibraryClient';
import { BookOpen } from 'lucide-react';

export default async function LibraryPage() {
    const supabase = await createClient();

    // Fetch resources
    const { data: resources } = await supabase
        .from('social_law_resources')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-8 py-4">
            <div className="border-b border-border pb-6">
                <h1 className="text-3xl font-extrabold tracking-tight text-civic-green-dark flex items-center gap-3">
                    <BookOpen className="h-8 w-8" />
                    Law & Research Library
                </h1>
                <p className="text-muted-foreground text-lg mt-2 max-w-3xl leading-relaxed">
                    Access vital documents, SDG guides, national policies, local county bylaws, and youth-led research briefs to empower your civic advocacy.
                </p>
            </div>

            <LibraryClient resources={resources || []} />
        </div>
    );
}
