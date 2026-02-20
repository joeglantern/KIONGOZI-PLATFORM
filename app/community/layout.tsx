import { createClient } from '@/app/utils/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, MessageSquare, Hash, Users, Leaf, Globe, FileText, Calendar, Map, BookOpen, Video } from 'lucide-react';

export default async function CommunityLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch trending topics
    const { data: topics } = await supabase
        .from('social_topics')
        .select('*')
        .order('name')
        .limit(5);

    return (
        <div className="min-h-screen bg-civic-earth-light/10">
            {/* Civic Header / Banner */}
            <div className="bg-gradient-to-r from-civic-green-dark to-civic-green py-8 text-white shadow-lg">
                <div className="container mx-auto px-4 md:px-6">
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Globe className="h-8 w-8" />
                        Civic & Climate Action
                    </h1>
                    <p className="mt-2 text-civic-green-light/90 max-w-2xl text-lg">
                        Connect, organize, and drive change in your community.
                    </p>
                </div>
            </div>

            <div className="container mx-auto py-8 px-4 md:px-6">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Main Content Area */}
                    <main className="flex-1 w-full lg:w-3/4">
                        {children}
                    </main>

                    {/* Sidebar */}
                    <aside className="w-full lg:w-1/4 space-y-6">

                        {/* Guest / Welcome Card */}
                        {!user ? (
                            <Card className="border-civic-green/20 bg-civic-green/5 overflow-hidden">
                                <div className="h-2 bg-civic-green w-full"></div>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center gap-2 text-civic-green-dark">
                                        <Leaf className="h-5 w-5" />
                                        Join the Movement
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                                        Sign in to upvote impactful ideas, sign petitions, and coordinate local action.
                                    </p>
                                    <div className="space-y-2">
                                        <Button asChild className="w-full bg-civic-green hover:bg-civic-green-dark text-white shadow-sm">
                                            <Link href="/login">Sign In</Link>
                                        </Button>
                                        <Button asChild variant="outline" className="w-full border-civic-green/30 text-civic-green-dark hover:bg-civic-green/10">
                                            <Link href="/register">Create Account</Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="border-border/50 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Users className="h-5 w-5 text-civic-green" />
                                        Your Impact
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Welcome back! Ready to make an impact today?
                                    </p>
                                    <Button asChild className="w-full bg-civic-green hover:bg-civic-green-dark text-white">
                                        <Link href="/community/create">Start a Discussion</Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Petitions CTA */}
                        <Card className="border-civic-clay/30 bg-civic-clay/5 overflow-hidden">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center gap-2 text-civic-clay">
                                    <FileText className="h-5 w-5" />
                                    Take Action
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <Button asChild className="w-full bg-civic-clay hover:bg-civic-clay/90 text-white shadow-sm justify-start">
                                        <Link href="/community/petitions">
                                            <FileText className="mr-2 h-4 w-4" />
                                            Petitions
                                        </Link>
                                    </Button>
                                    <Button asChild variant="outline" className="w-full border-civic-clay/30 text-civic-clay hover:bg-civic-clay/10 justify-start">
                                        <Link href="/community/events">
                                            <Calendar className="mr-2 h-4 w-4" />
                                            Calendar
                                        </Link>
                                    </Button>
                                    <Button asChild variant="outline" className="w-full border-civic-clay/30 text-civic-clay hover:bg-civic-clay/10 justify-start">
                                        <Link href="/community/impact">
                                            <Map className="mr-2 h-4 w-4" />
                                            Report Issue
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Resources */}
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-civic-green" />
                                    Knowledge Hub
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button asChild variant="ghost" className="w-full justify-start h-auto py-2 text-foreground/80 hover:text-civic-green">
                                    <Link href="/community/town-halls">
                                        <Video className="mr-2 h-4 w-4" />
                                        Town Halls
                                    </Link>
                                </Button>
                                <Button asChild variant="ghost" className="w-full justify-start h-auto py-2 text-foreground/80 hover:text-civic-green">
                                    <Link href="/community/library">
                                        <BookOpen className="mr-2 h-4 w-4" />
                                        Law Library
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Trending Topics */}
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-civic-clay" />
                                    Priority Topics
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col gap-1">
                                    {topics?.map((topic: any) => (
                                        <Link
                                            key={topic.id}
                                            href={`/community/topic/${topic.slug}`}
                                            className="flex items-center justify-between py-2 px-2 rounded-md text-sm hover:bg-muted/50 transition-colors group"
                                        >
                                            <span className="flex items-center gap-2 text-foreground/80 group-hover:text-civic-green-dark font-medium transition-colors">
                                                <Hash className="h-3.5 w-3.5 text-muted-foreground group-hover:text-civic-green" />
                                                {topic.name}
                                            </span>
                                        </Link>
                                    )) || <p className="text-sm text-muted-foreground py-2">No active topics.</p>}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-0 pb-4">
                                <Link href="/community" className="text-xs text-muted-foreground hover:text-civic-green flex items-center gap-1 ml-auto">
                                    View all topics <TrendingUp className="h-3 w-3" />
                                </Link>
                            </CardFooter>
                        </Card>

                        {/* Quick Stats or Info */}
                        <div className="bg-civic-earth-light/10 rounded-lg p-4 text-xs text-muted-foreground border border-civic-earth/10">
                            <p className="font-semibold text-civic-earth-dark mb-1">Community Guidelines</p>
                            <p>Respectful debate is encouraged. Hate speech and misinformation will be removed.</p>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
