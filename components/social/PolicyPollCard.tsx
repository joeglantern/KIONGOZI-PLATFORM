'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart2, Users, ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

const CATEGORY_COLORS: Record<string, string> = {
    environment: 'bg-green-100 text-green-800',
    education: 'bg-blue-100 text-blue-800',
    health: 'bg-red-100 text-red-800',
    economy: 'bg-yellow-100 text-yellow-800',
    governance: 'bg-purple-100 text-purple-800',
    general: 'bg-gray-100 text-gray-800',
};

interface PolicyPollCardProps {
    poll: any;
    hasResponded?: boolean;
}

export default function PolicyPollCard({ poll, hasResponded = false }: PolicyPollCardProps) {
    const colorClass = CATEGORY_COLORS[poll.category] ?? CATEGORY_COLORS.general;
    const isClosed = poll.status === 'closed' || (poll.closes_at && new Date(poll.closes_at) < new Date());

    return (
        <Card className="flex flex-col h-full border-civic-earth/10 hover:border-civic-green/30 transition-all duration-300 group bg-card/50 overflow-hidden">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge className={`text-xs font-medium capitalize ${colorClass}`}>
                        {poll.category}
                    </Badge>
                    {isClosed ? (
                        <Badge variant="secondary" className="text-xs">Closed</Badge>
                    ) : hasResponded ? (
                        <Badge className="text-xs bg-civic-green/10 text-civic-green-dark border-civic-green/20">Participated</Badge>
                    ) : (
                        <Badge className="text-xs bg-civic-clay/10 text-civic-clay border-civic-clay/20">Open</Badge>
                    )}
                </div>
                <CardTitle className="text-lg leading-snug text-foreground group-hover:text-civic-green-dark transition-colors line-clamp-2">
                    <Link href={`/community/policy-pulse/${poll.id}`}>
                        {poll.title}
                    </Link>
                </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 pb-4">
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed mb-4">
                    {poll.description}
                </p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {poll.response_count ?? 0} responses
                    </span>
                    {poll.closes_at && !isClosed && (
                        <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Closes {formatDistanceToNow(new Date(poll.closes_at), { addSuffix: true })}
                        </span>
                    )}
                </div>

                {poll.ai_insights && (
                    <div className="mt-3 p-2.5 bg-civic-green/5 rounded-lg border border-civic-green/10">
                        <p className="text-xs text-civic-green-dark font-medium flex items-center gap-1 mb-1">
                            <BarChart2 className="h-3 w-3" /> AI Insights Available
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{poll.ai_insights.substring(0, 120)}…</p>
                    </div>
                )}
            </CardContent>

            <CardFooter className="pt-0 border-t border-border/40 p-4 bg-muted/5">
                <Button asChild className="w-full bg-civic-green hover:bg-civic-green-dark text-white" size="sm">
                    <Link href={`/community/policy-pulse/${poll.id}`}>
                        {isClosed || hasResponded ? (
                            <>
                                <BarChart2 className="mr-2 h-4 w-4" /> View Results
                            </>
                        ) : (
                            <>
                                Take Poll <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
