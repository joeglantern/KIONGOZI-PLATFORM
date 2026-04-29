import { createClient } from '@/app/utils/supabase/server';
import FundCard from '@/components/social/FundCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, DollarSign, TrendingUp, Activity } from 'lucide-react';
import Link from 'next/link';

function formatCurrency(amount: number, currency = 'KES') {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export default async function FundsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: funds } = await supabase
        .from('public_funds')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    const totals = (funds ?? []).reduce(
        (acc, f) => ({
            totalFunds: acc.totalFunds + (f.total_amount ?? 0),
            totalDisbursed: acc.totalDisbursed + (f.amount_disbursed ?? 0),
            active: acc.active + (f.status === 'active' || f.status === 'disbursing' ? 1 : 0),
        }),
        { totalFunds: 0, totalDisbursed: 0, active: 0 }
    );

    const sectors = Array.from(new Set((funds ?? []).map(f => f.sector).filter(Boolean)));
    const activeStatuses = ['active', 'disbursing'];

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-civic-earth/10 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-civic-green-dark flex items-center gap-3">
                        <DollarSign className="h-8 w-8" />
                        Youth Fund Tracker
                    </h1>
                    <p className="text-muted-foreground text-lg mt-1 max-w-2xl">
                        Track how youth-related funds are allocated and disbursed. Follow the money.
                    </p>
                </div>
                {user && (
                    <Button asChild className="bg-civic-green hover:bg-civic-green-dark text-white shadow-md shrink-0">
                        <Link href="/community/funds/submit">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Submit Fund
                        </Link>
                    </Button>
                )}
            </div>

            {/* Summary stats */}
            {(funds?.length ?? 0) > 0 && (
                <div className="grid grid-cols-3 gap-4">
                    <Card className="border-civic-earth/10 bg-civic-green/5">
                        <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Tracked</p>
                            <p className="text-2xl font-bold text-civic-green-dark mt-1">{formatCurrency(totals.totalFunds)}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-civic-earth/10 bg-civic-clay/5">
                        <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Disbursed</p>
                            <p className="text-2xl font-bold text-civic-clay mt-1">{formatCurrency(totals.totalDisbursed)}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-civic-earth/10">
                        <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Active Programs</p>
                            <p className="text-2xl font-bold mt-1">{totals.active}</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Fund grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {funds?.map(fund => <FundCard key={fund.id} fund={fund} />)}

                {(!funds || funds.length === 0) && (
                    <div className="col-span-full text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
                        <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                        <h3 className="text-xl font-medium text-foreground mb-2">No Funds Tracked Yet</h3>
                        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                            Help the community stay informed by submitting a youth fund or grant program.
                        </p>
                        {user && (
                            <Button asChild variant="outline" className="border-civic-green text-civic-green">
                                <Link href="/community/funds/submit">Submit a Fund</Link>
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
