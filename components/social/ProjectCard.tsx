import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Users, MessageSquare, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

const MILESTONE_STYLES: Record<string, { label: string; class: string }> = {
    announced:   { label: 'Announced',   class: 'bg-yellow-100 text-yellow-800' },
    funded:      { label: 'Funded',      class: 'bg-blue-100 text-blue-800' },
    in_progress: { label: 'In Progress', class: 'bg-green-100 text-green-800' },
    stalled:     { label: 'Stalled',     class: 'bg-red-100 text-red-800' },
    completed:   { label: 'Completed',   class: 'bg-emerald-100 text-emerald-800' },
    audited:     { label: 'Audited',     class: 'bg-purple-100 text-purple-800' },
};

const MILESTONE_ORDER = ['announced', 'funded', 'in_progress', 'stalled', 'completed', 'audited'];

const TYPE_COLORS: Record<string, string> = {
    infrastructure: 'bg-orange-50 text-orange-700',
    social:         'bg-pink-50 text-pink-700',
    environment:    'bg-green-50 text-green-700',
    health:         'bg-red-50 text-red-700',
    education:      'bg-blue-50 text-blue-700',
    other:          'bg-gray-50 text-gray-700',
};

export default function ProjectCard({ project }: { project: any }) {
    const ms = MILESTONE_STYLES[project.milestone] ?? MILESTONE_STYLES.announced;
    const typeStyle = TYPE_COLORS[project.project_type] ?? TYPE_COLORS.other;
    const milestoneIndex = MILESTONE_ORDER.indexOf(project.milestone);

    return (
        <Card className="flex flex-col h-full border-civic-earth/10 hover:border-civic-clay/30 transition-all duration-300 group bg-card/50 overflow-hidden">
            <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${typeStyle}`}>
                        {project.project_type.replace('_', ' ')}
                    </span>
                    <Badge className={`text-xs ${ms.class}`}>{ms.label}</Badge>
                </div>
                <CardTitle className="text-lg leading-snug group-hover:text-civic-clay transition-colors line-clamp-2">
                    <Link href={`/community/projects/${project.id}`}>{project.title}</Link>
                </CardTitle>
                {project.implementing_body && (
                    <p className="text-xs text-muted-foreground mt-1">{project.implementing_body}</p>
                )}
            </CardHeader>

            <CardContent className="flex-1 pb-4 space-y-3">
                {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{project.description}</p>
                )}

                {/* Mini progress track */}
                <div className="flex items-center gap-1">
                    {MILESTONE_ORDER.filter(m => m !== 'stalled').map((m, i) => {
                        const isActive = project.milestone === m;
                        const isPast = milestoneIndex > MILESTONE_ORDER.indexOf(m) && project.milestone !== 'stalled';
                        return (
                            <div key={m} className={`h-1.5 flex-1 rounded-full transition-colors ${
                                isActive ? 'bg-civic-clay' : isPast ? 'bg-civic-green' : 'bg-muted'
                            }`} />
                        );
                    })}
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {project.location_name && (
                        <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {project.location_name}
                        </span>
                    )}
                    <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {project.follower_count}
                    </span>
                    <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> {project.update_count} updates
                    </span>
                </div>

                <p className="text-xs text-muted-foreground">
                    Added {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                </p>
            </CardContent>

            <CardFooter className="pt-0 border-t border-border/40 p-4 bg-muted/5">
                <Button asChild variant="outline" size="sm" className="w-full border-civic-clay/30 text-civic-clay hover:bg-civic-clay/5">
                    <Link href={`/community/projects/${project.id}`}>
                        Track Progress <ArrowRight className="ml-auto h-4 w-4" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
