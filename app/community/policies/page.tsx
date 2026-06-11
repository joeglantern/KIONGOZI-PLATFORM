import { createClient } from '@/app/utils/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ArrowRight, FileText } from 'lucide-react';
import Link from 'next/link';

export default async function PoliciesPage() {
    const supabase = await createClient();

    // Fetch policies
    const { data: policies } = await supabase
        .from('policies')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-civic-green-dark flex items-center gap-3">
                        <ShieldCheck className="h-8 w-8" />
                        National & Regional Policies
                    </h1>
                    <p className="text-muted-foreground text-lg mt-2 max-w-2xl">
                        Explore and understand policy documents, frameworks, and bills affecting youth participation, funding, and sustainability.
                    </p>
                </div>
            </div>

            {/* Grid of Policies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {policies?.map((policy) => (
                    <Card key={policy.id} className="border-border/50 bg-white rounded-2xl hover:shadow-md transition-all group flex flex-col justify-between">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2 text-civic-green text-xs font-semibold uppercase tracking-wider mb-2">
                                <FileText className="h-4 w-4" />
                                Public Policy Framework
                            </div>
                            <CardTitle className="text-xl font-bold text-foreground leading-tight group-hover:text-civic-green transition-colors">
                                {policy.title}
                            </CardTitle>
                            <CardDescription className="line-clamp-3 text-muted-foreground pt-1.5 leading-relaxed">
                                {policy.summary}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-4 pt-0">
                            {/* Visual indicator tag */}
                            <div className="flex gap-2 flex-wrap">
                                <Badge className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-none text-xs">Opportunities Inside</Badge>
                                <Badge className="bg-civic-green/10 hover:bg-civic-green/20 text-civic-green-dark border-none text-xs">Youth Focused</Badge>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-3 border-t border-border/30 flex justify-end">
                            <Button asChild variant="ghost" className="text-civic-green hover:text-civic-green-dark gap-2 font-semibold">
                                <Link href={`/community/policies/${policy.id}`}>
                                    Explore Policy <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}

                {(!policies || policies.length === 0) && (
                    <div className="col-span-full py-20 text-center bg-muted/20 rounded-xl border border-dashed border-border">
                        <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-foreground mb-2">No Policies Published</h3>
                        <p className="text-muted-foreground">Admins are digitizing key policy frameworks. Check back soon.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Simple local Badge replacement for compiling without shadcn badge issues
function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
            {children}
        </span>
    );
}
