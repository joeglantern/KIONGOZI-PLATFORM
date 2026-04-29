import { createClient } from '@/app/utils/supabase/server';
import ProjectCard from '@/components/social/ProjectCard';
import { Button } from '@/components/ui/button';
import { PlusCircle, Clipboard } from 'lucide-react';
import Link from 'next/link';

const MILESTONE_LABELS: Record<string, string> = {
    announced: 'Announced',
    funded: 'Funded',
    in_progress: 'In Progress',
    stalled: 'Stalled',
    completed: 'Completed',
    audited: 'Audited',
};

export default async function ProjectsPage({
    searchParams,
}: {
    searchParams: Promise<{ milestone?: string; type?: string }>;
}) {
    const { milestone, type } = await searchParams;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase.from('public_projects').select('*').order('created_at', { ascending: false }).limit(50);

    if (milestone) query = query.eq('milestone', milestone);
    if (type) query = query.eq('project_type', type);

    const { data: projects } = await query;

    const activeMilestone = milestone ?? '';
    const activeType = type ?? '';

    const milestoneCounts = (projects ?? []).reduce((acc: Record<string, number>, p) => {
        acc[p.milestone] = (acc[p.milestone] ?? 0) + 1;
        return acc;
    }, {});

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-civic-earth/10 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-civic-green-dark flex items-center gap-3">
                        <Clipboard className="h-8 w-8" />
                        Project Monitor
                    </h1>
                    <p className="text-muted-foreground text-lg mt-1 max-w-2xl">
                        Track publicly funded community projects. Submit updates, photos, and hold institutions accountable.
                    </p>
                </div>
                {user && (
                    <Button asChild className="bg-civic-clay hover:bg-civic-clay/90 text-white shadow-md shrink-0">
                        <Link href="/community/projects/create">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Project
                        </Link>
                    </Button>
                )}
            </div>

            {/* Milestone filter pills */}
            <div className="flex flex-wrap gap-2">
                <Link href="/community/projects"
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors
                        ${!activeMilestone ? 'bg-civic-green text-white border-civic-green' : 'border-border text-muted-foreground hover:border-civic-green/50'}`}>
                    All
                </Link>
                {Object.entries(MILESTONE_LABELS).map(([key, label]) => (
                    <Link key={key} href={`/community/projects?milestone=${key}`}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors
                            ${activeMilestone === key ? 'bg-civic-clay text-white border-civic-clay' : 'border-border text-muted-foreground hover:border-civic-clay/50'}`}>
                        {label}
                    </Link>
                ))}
            </div>

            {/* Project grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects?.map(project => <ProjectCard key={project.id} project={project} />)}

                {(!projects || projects.length === 0) && (
                    <div className="col-span-full text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
                        <Clipboard className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                        <h3 className="text-xl font-medium mb-2">No Projects Tracked</h3>
                        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                            Know about a publicly funded project in your area? Add it so the community can track it.
                        </p>
                        {user && (
                            <Button asChild variant="outline" className="border-civic-clay text-civic-clay">
                                <Link href="/community/projects/create">Add a Project</Link>
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
