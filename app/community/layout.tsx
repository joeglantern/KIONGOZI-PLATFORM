import { createClient } from '@/app/utils/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    MessageSquare, FileText,
    Calendar, BarChart2, DollarSign, Clipboard, Zap,
    ArrowRight, PenSquare, Flame
} from 'lucide-react';
import { Tumi } from '@/components/landing/Characters';

export default async function CommunityLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const [{ count: postsCount }, { count: petitionsCount }, { count: membersCount }, { data: topics }] = await Promise.all([
        supabase.from('social_posts').select('*', { count: 'exact', head: true }),
        supabase.from('social_petitions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('social_topics').select('id, name, slug').order('name').limit(8),
    ]);

    return (
        <div className="min-h-screen bg-[#f4f6f8]">
            {/* Hero */}
            <div className="relative overflow-hidden bg-[#0d1117]">
                {/* Background grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-civic-green/20 via-transparent to-transparent" />
                {/* Bottom fade */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#f4f6f8] to-transparent" />

                <div className="relative container mx-auto px-4 md:px-6 py-12 md:py-16">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="max-w-3xl flex-1">
                            <div className="inline-flex items-center gap-2 bg-civic-green/10 border border-civic-green/20 text-civic-green text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
                                <Zap className="h-3 w-3" />
                                Kenya Youth Civic Space
                            </div>
                            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight">
                                Your voice.<br />
                                <span className="text-civic-green">Your community.</span>
                            </h1>
                            <p className="mt-4 text-white/60 text-base md:text-lg max-w-xl leading-relaxed">
                                Discuss policy, track public funds, sign petitions, and hold leaders accountable, all in one place.
                            </p>

                            {/* Stats row */}
                            <div className="flex flex-wrap gap-6 mt-8 mb-8">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-white">{postsCount?.toLocaleString() ?? ', '}</p>
                                    <p className="text-xs text-white/50 mt-0.5">Discussions</p>
                                </div>
                                <div className="w-px bg-white/10 self-stretch" />
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-white">{petitionsCount?.toLocaleString() ?? ', '}</p>
                                    <p className="text-xs text-white/50 mt-0.5">Active Petitions</p>
                                </div>
                                <div className="w-px bg-white/10 self-stretch" />
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-white">{membersCount?.toLocaleString() ?? ', '}</p>
                                    <p className="text-xs text-white/50 mt-0.5">Members</p>
                                </div>
                            </div>

                            {/* CTAs */}
                            <div className="flex flex-wrap gap-3">
                                <Button asChild className="bg-civic-green hover:bg-civic-green-dark text-white h-11 px-6 font-semibold shadow-lg shadow-civic-green/20">
                                    <Link href="/community/create">
                                        <PenSquare className="mr-2 h-4 w-4" />
                                        Start a Discussion
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" className="h-11 px-6 border-white/20 text-white hover:bg-white/10 hover:text-white font-semibold bg-transparent">
                                    <Link href="/community/petitions">
                                        View Petitions
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        {/* Tumi Mascot Guide Widget */}
                        <div className="shrink-0 hidden md:flex flex-col items-center gap-3 max-w-[250px] text-center bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-[2rem] shadow-xl">
                            <div className="bg-brand-cream border-2 border-brand-primary p-2 rounded-2xl">
                                <Tumi action="cheer" className="w-20 h-20" />
                            </div>
                            <div className="relative bg-white text-brand-primary p-3 rounded-2xl border-2 border-brand-primary shadow-sm text-xs font-bold text-left">
                                <div className="absolute left-[50%] translate-x-[-50%] top-[-10px] w-0 h-0 border-r-[10px] border-r-transparent border-b-[10px] border-b-brand-primary border-l-[10px] border-l-transparent"></div>
                                <p className="text-xs font-black text-brand-primary leading-relaxed">
                                    "Habari! I'm Tumi, your Community guide. Share discussions, sign petitions, and join local debates below! Let's make our voices count! 📣"
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto py-8 px-4 md:px-6">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Main Content */}
                    <main className="flex-1 min-w-0">
                        {children}
                    </main>

                    {/* Sidebar */}
                    <aside className="w-full lg:w-72 shrink-0 space-y-4">

                        {/* Login / Post prompt */}
                        {!user ? (
                            <Card className="border-0 shadow-sm bg-white">
                                <CardContent className="p-5">
                                    <p className="text-sm font-semibold text-foreground mb-1">Join the conversation</p>
                                    <p className="text-xs text-muted-foreground mb-4">Sign in to post, vote, and sign petitions.</p>
                                    <div className="flex gap-2">
                                        <Button asChild size="sm" className="flex-1 bg-civic-green hover:bg-civic-green-dark text-white">
                                            <Link href="/login">Sign In</Link>
                                        </Button>
                                        <Button asChild size="sm" variant="outline" className="flex-1">
                                            <Link href="/signup">Sign Up</Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="border-0 shadow-sm bg-white">
                                <CardContent className="p-5">
                                    <p className="text-sm font-semibold text-foreground mb-3">What's on your mind?</p>
                                    <Button asChild className="w-full bg-civic-green hover:bg-civic-green-dark text-white">
                                        <Link href="/community/create">
                                            <PenSquare className="mr-2 h-4 w-4" />
                                            Create Post
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Trending Topics */}
                        <Card className="border-0 shadow-sm bg-white">
                            <CardHeader className="pb-2 pt-5 px-5">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                                    <Flame className="h-4 w-4 text-civic-clay" />
                                    Trending Topics
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-3 pb-3">
                                {topics?.map((topic: any, i: number) => (
                                    <Link
                                        key={topic.id}
                                        href={`/community/topic/${topic.slug}`}
                                        className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-muted/60 transition-colors group"
                                    >
                                        <span className="text-xs text-muted-foreground w-4 text-center font-medium">{i + 1}</span>
                                        <div>
                                            <p className="text-sm font-semibold text-foreground group-hover:text-civic-green transition-colors leading-tight">
                                                #{topic.name}
                                            </p>
                                        </div>
                                    </Link>
                                )) ?? <p className="text-xs text-muted-foreground px-2 py-2">No topics yet.</p>}
                            </CardContent>
                        </Card>

                        {/* Take Action */}
                        <Card className="border-0 shadow-sm bg-white">
                            <CardHeader className="pb-2 pt-5 px-5">
                                <CardTitle className="text-sm font-bold text-foreground">Take Action</CardTitle>
                            </CardHeader>
                            <CardContent className="px-3 pb-3 space-y-1">
                                {[
                                    { href: '/community/petitions', icon: FileText, label: 'Petitions', color: 'text-civic-clay' },
                                    { href: '/community/events', icon: Calendar, label: 'Events Calendar', color: 'text-blue-600' },
                                    { href: '/community/impact', icon: MessageSquare, label: 'Report an Issue', color: 'text-orange-500' },
                                ].map(({ href, icon: Icon, label, color }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-muted/60 transition-colors group"
                                    >
                                        <Icon className={`h-4 w-4 ${color}`} />
                                        <span className="text-sm font-medium text-foreground group-hover:text-civic-green transition-colors">{label}</span>
                                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </Link>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Civic Tools */}
                        <Card className="border-0 shadow-sm bg-white">
                            <CardHeader className="pb-2 pt-5 px-5">
                                <CardTitle className="text-sm font-bold text-foreground">Social Accountability Tools</CardTitle>
                            </CardHeader>
                            <CardContent className="px-3 pb-3 space-y-1">
                                {[
                                    { href: '/community/policy-pulse', icon: BarChart2, label: 'Policy Pulse', color: 'text-civic-green' },
                                    { href: '/community/funds', icon: DollarSign, label: 'Fund Tracker', color: 'text-emerald-600' },
                                    { href: '/community/projects', icon: Clipboard, label: 'Project Monitor', color: 'text-violet-600' },
                                ].map(({ href, icon: Icon, label, color }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-muted/60 transition-colors group"
                                    >
                                        <Icon className={`h-4 w-4 ${color}`} />
                                        <span className="text-sm font-medium text-foreground group-hover:text-civic-green transition-colors">{label}</span>
                                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </Link>
                                ))}
                            </CardContent>
                        </Card>

                        <p className="text-xs text-muted-foreground text-center px-2 leading-relaxed">
                            Respectful debate encouraged. Hate speech and misinformation will be removed.
                        </p>
                    </aside>
                </div>
            </div>
        </div>
    );
}
