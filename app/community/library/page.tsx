import { createClient } from '@/app/utils/supabase/server';
import LawResourceCard from '@/components/social/LawResourceCard';
import { Button } from '@/components/ui/button';
import { BookOpen, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default async function LibraryPage() {
    const supabase = await createClient();

    // Fetch resources
    const { data: resources } = await supabase
        .from('social_law_resources')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-civic-green-dark flex items-center gap-3">
                        <BookOpen className="h-8 w-8" />
                        Law & Resource Library
                    </h1>
                    <p className="text-muted-foreground text-lg mt-2 max-w-2xl">
                        Access vital documents, bylaws, and educational resources to empower your advocacy.
                    </p>
                </div>
                {/* Search Bar Placeholder */}
                <div className="w-full md:w-auto min-w-[300px]">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search documents..."
                            className="bg-background pl-9"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {resources?.map((resource) => (
                    <LawResourceCard key={resource.id} resource={resource} />
                ))}

                {(!resources || resources.length === 0) && (
                    <div className="col-span-full py-16 text-center bg-muted/20 rounded-xl border border-dashed border-border">
                        <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-foreground mb-2">Library is Empty</h3>
                        <p className="text-muted-foreground">Resources are being digitized. Check back soon.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
