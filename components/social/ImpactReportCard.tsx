'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, AlertTriangle, CheckCircle2, Construction, ThumbsUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ImpactReportProps {
    report: any;
}

const REPORT_TYPE_CONFIG: Record<string, { color: string; icon: any }> = {
    infrastructure: { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Construction },
    safety: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle },
    environment: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 }, // Reusing CheckCircle for env/health for now or Leaf if available
    praise: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: ThumbsUp },
};

export default function ImpactReportCard({ report }: ImpactReportProps) {
    const config = REPORT_TYPE_CONFIG[report.report_type] || REPORT_TYPE_CONFIG.infrastructure;
    const Icon = config.icon;

    return (
        <Card className="flex flex-col h-full border-border/60 hover:shadow-md transition-all duration-300 overflow-hidden">
            {report.image_url && (
                <div className="h-48 w-full overflow-hidden relative bg-muted">
                    <img
                        src={report.image_url}
                        alt={report.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3">
                        <Badge className={cn("uppercase text-xs font-bold shadow-sm", config.color)}>
                            <Icon className="w-3 h-3 mr-1" />
                            {report.report_type}
                        </Badge>
                    </div>
                </div>
            )}

            <CardHeader className={cn("pb-2", !report.image_url && "pt-6")}>
                {!report.image_url && (
                    <div className="mb-2">
                        <Badge className={cn("uppercase text-xs font-bold shadow-sm w-fit", config.color)}>
                            <Icon className="w-3 h-3 mr-1" />
                            {report.report_type}
                        </Badge>
                    </div>
                )}
                <CardTitle className="text-lg leading-tight line-clamp-2">
                    {report.title}
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{report.location_name || 'Unknown Location'}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</span>
                </div>
            </CardHeader>

            <CardContent className="flex-1 pb-4">
                <p className="text-sm text-foreground/80 line-clamp-3">
                    {report.description}
                </p>
            </CardContent>

            <CardFooter className="pt-0 pb-4 flex justify-between items-center text-xs text-muted-foreground border-t border-border/40 p-4 bg-muted/5 mt-auto">
                <div className="flex items-center gap-1">
                    <span className={cn(
                        "w-2 h-2 rounded-full",
                        report.status === 'resolved' ? "bg-green-500" :
                            report.status === 'verified' ? "bg-blue-500" : "bg-yellow-500"
                    )}></span>
                    <span className="capitalize">{report.status}</span>
                </div>
                {/* Placeholder for upvotes if we add them later */}
                {/* <div className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" /> 12
                 </div> */}
            </CardFooter>
        </Card>
    );
}
