'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, Calendar, PlayCircle, Mic2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TownHallProps {
    event: any;
    isPast?: boolean;
}

export default function TownHallCard({ event, isPast }: TownHallProps) {
    return (
        <Card className="flex flex-col h-full border-border/60 hover:shadow-lg transition-all duration-300 overflow-hidden group">
            <div className="relative h-48 bg-slate-900 flex items-center justify-center">
                {/* Placeholder for video thumbnail or actual image */}
                {event.image_url ? (
                    <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity"
                    />
                ) : (
                    <div className="text-white/20">
                        <Video className="h-16 w-16" />
                    </div>
                )}

                {/* Overlay Icon */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {isPast ? (
                        <PlayCircle className="h-12 w-12 text-white/90 drop-shadow-md group-hover:scale-110 transition-transform" />
                    ) : (
                        <div className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm animate-pulse-slow">
                            Update
                        </div>
                    )}
                </div>

                <Badge className="absolute top-3 left-3 bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm border-none">
                    Town Hall
                </Badge>
            </div>

            <CardContent className="flex-1 pt-6 space-y-3">
                <div>
                    <div className="text-xs text-civic-green mb-1 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(event.start_time), 'MMM d, yyyy')}
                    </div>
                    <CardTitle className="text-xl">
                        {event.title}
                    </CardTitle>
                </div>

                <p className="text-sm text-foreground/80 line-clamp-2">
                    {event.description}
                </p>
            </CardContent>

            <CardFooter className="pt-0 pb-6">
                {isPast ? (
                    <Button variant="outline" className="w-full gap-2 border-civic-green/30 text-civic-green-dark hover:bg-civic-green/10" asChild>
                        {event.recording_url ? (
                            <a href={event.recording_url} target="_blank" rel="noopener noreferrer">
                                <PlayCircle className="h-4 w-4" /> Watch Recording
                            </a>
                        ) : (
                            <span className="text-muted-foreground cursor-not-allowed">Recording Processing</span>
                        )}
                    </Button>
                ) : (
                    <Button className="w-full gap-2 bg-red-600 hover:bg-red-700 text-white" asChild>
                        <Link href={`/community/events/${event.id}`}>
                            <Mic2 className="h-4 w-4" /> Join Session
                        </Link>
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
