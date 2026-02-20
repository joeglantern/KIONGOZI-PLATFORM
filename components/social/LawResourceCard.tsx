import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, FileText, Download, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface LawResourceProps {
    resource: any;
}

export default function LawResourceCard({ resource }: LawResourceProps) {
    return (
        <Card className="flex flex-col h-full border-border/60 hover:border-civic-green/30 hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                    <div className="p-2 bg-civic-green/10 rounded-lg text-civic-green-dark">
                        <FileText className="h-6 w-6" />
                    </div>
                    {/* Badge for Type/Category if needed */}
                </div>
                <CardTitle className="text-lg mt-3 leading-tight">
                    {resource.title}
                </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 pb-4">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                    {resource.description}
                </p>
                <div className="text-xs text-civic-green font-medium uppercase tracking-wide">
                    {resource.category.replace('_', ' ')}
                </div>
            </CardContent>

            <CardFooter className="pt-0 pb-4 mt-auto">
                <Button variant="outline" size="sm" className="w-full gap-2 hover:text-civic-green hover:border-civic-green" asChild>
                    <a href={resource.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                        Download PDF
                    </a>
                </Button>
            </CardFooter>
        </Card>
    );
}
