import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DollarSign, ArrowRight, Building2 } from 'lucide-react';
import Link from 'next/link';

const STATUS_STYLES: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    disbursing: 'bg-blue-100 text-blue-800',
    closed: 'bg-gray-100 text-gray-700',
    suspended: 'bg-red-100 text-red-800',
};

const SECTOR_COLORS: Record<string, string> = {
    Education: 'bg-blue-50 border-blue-200 text-blue-700',
    Agriculture: 'bg-green-50 border-green-200 text-green-700',
    Health: 'bg-red-50 border-red-200 text-red-700',
    ICT: 'bg-purple-50 border-purple-200 text-purple-700',
    Environment: 'bg-emerald-50 border-emerald-200 text-emerald-700',
};

function formatCurrency(amount: number | null, currency = 'KES') {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export default function FundCard({ fund }: { fund: any }) {
    const disbursedPct = fund.total_amount > 0
        ? Math.min((fund.amount_disbursed / fund.total_amount) * 100, 100)
        : 0;
    const sectorStyle = SECTOR_COLORS[fund.sector] ?? 'bg-gray-50 border-gray-200 text-gray-700';

    return (
        <Card className="flex flex-col h-full border-civic-earth/10 hover:border-civic-green/30 transition-all duration-300 group overflow-hidden bg-card/50">
            <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    {fund.sector && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sectorStyle}`}>
                            {fund.sector}
                        </span>
                    )}
                    <Badge className={`text-xs capitalize ${STATUS_STYLES[fund.status] ?? STATUS_STYLES.active}`}>
                        {fund.status}
                    </Badge>
                </div>
                <CardTitle className="text-lg leading-snug group-hover:text-civic-green-dark transition-colors line-clamp-2">
                    <Link href={`/community/funds/${fund.id}`}>{fund.title}</Link>
                </CardTitle>
                {fund.managing_body && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Building2 className="h-3 w-3" /> {fund.managing_body}
                    </p>
                )}
            </CardHeader>

            <CardContent className="flex-1 pb-4 space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {fund.description}
                </p>

                {fund.total_amount && (
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-muted-foreground">Disbursed</span>
                            <span className="text-civic-green-dark">
                                {formatCurrency(fund.amount_disbursed, fund.currency)} / {formatCurrency(fund.total_amount, fund.currency)}
                            </span>
                        </div>
                        <Progress value={disbursedPct} className="h-2 bg-muted [&>div]:bg-civic-green" />
                        <p className="text-xs text-muted-foreground text-right">{disbursedPct.toFixed(0)}% disbursed</p>
                    </div>
                )}

                {fund.target_beneficiaries && (
                    <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/70">For:</span> {fund.target_beneficiaries}
                    </p>
                )}
            </CardContent>

            <CardFooter className="pt-0 border-t border-border/40 p-4 bg-muted/5">
                <Button asChild variant="outline" size="sm" className="w-full border-civic-green/30 text-civic-green-dark hover:bg-civic-green/5">
                    <Link href={`/community/funds/${fund.id}`}>
                        <DollarSign className="mr-2 h-4 w-4" /> View Breakdown
                        <ArrowRight className="ml-auto h-4 w-4" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
