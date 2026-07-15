import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Globe, MapPin, Tag, Briefcase, Award } from 'lucide-react';

interface LawResourceProps {
    resource: any;
}

export default function LawResourceCard({ resource }: LawResourceProps) {
    const formatCategory = (cat: string) => {
        if (!cat) return '';
        return cat.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <Card className="flex flex-col h-full border border-border/50 bg-white rounded-2xl hover:shadow-xl hover:border-civic-green/40 transition-all duration-300 group overflow-hidden">
            {/* Gradient accent top bar based on category */}
            <div className="h-1.5 w-full bg-gradient-to-r from-civic-green to-emerald-400" />
            
            <CardHeader className="pb-3 pt-5">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-civic-green uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        {formatCategory(resource.category)}
                    </span>
                    {resource.is_youth_kb && (
                        <Badge className="bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200/50 text-[10px] py-0 px-2 font-semibold flex items-center gap-1">
                            <Award className="h-2.5 w-2.5" /> Youth KB
                        </Badge>
                    )}
                </div>
                <CardTitle className="text-lg font-bold text-foreground leading-tight group-hover:text-civic-green transition-colors mt-2">
                    {resource.title}
                </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 pb-4 pt-0 space-y-4">
                <p className="text-sm text-muted-foreground/90 line-clamp-3 leading-relaxed">
                    {resource.summary || resource.description}
                </p>

                {/* Meta details list */}
                <div className="space-y-2 pt-2 border-t border-border/40 text-xs">
                    {resource.sdg && (
                        <div className="flex items-center gap-2 text-foreground/80">
                            <Globe className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                                {resource.sdg}
                            </span>
                        </div>
                    )}

                    {resource.county && (
                        <div className="flex items-center gap-2 text-foreground/85">
                            <MapPin className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            <span>County: <strong className="text-foreground">{resource.county}</strong></span>
                        </div>
                    )}

                    {resource.topic && (
                        <div className="flex items-center gap-2 text-foreground/85">
                            <Tag className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span>Topic: <strong className="text-foreground">{resource.topic}</strong></span>
                        </div>
                    )}

                    {resource.governance_sector && (
                        <div className="flex items-center gap-2 text-foreground/85">
                            <Briefcase className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                            <span>Sector: <strong className="text-foreground">{resource.governance_sector}</strong></span>
                        </div>
                    )}
                </div>
            </CardContent>

            <CardFooter className="pt-3 pb-5 border-t border-border/30 px-6 mt-auto">
                <Button variant="outline" size="sm" className="w-full gap-2 rounded-xl border-border/60 hover:text-civic-green hover:border-civic-green hover:bg-civic-green/5 transition-all font-semibold" asChild>
                    <a href={resource.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                        Download document
                    </a>
                </Button>
            </CardFooter>
        </Card>
    );
}
