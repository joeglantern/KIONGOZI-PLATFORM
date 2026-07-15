'use client';

import { useState, useMemo } from 'react';
import LawResourceCard from '@/components/social/LawResourceCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
    Search, SlidersHorizontal, X, Globe, MapPin, Tag, Briefcase, 
    BookOpen, GraduationCap
} from 'lucide-react';

interface LibraryClientProps {
    resources: any[];
}

export default function LibraryClient({ resources = [] }: LibraryClientProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [selectedSector, setSelectedSector] = useState<string | null>(null);
    const [selectedSdg, setSelectedSdg] = useState<string | null>(null);
    const [youthKbOnly, setYouthKbOnly] = useState(false);

    // Derived Filter lists from actual data
    const categories = useMemo(() => {
        const cats = resources.map(r => r.category).filter(Boolean);
        return Array.from(new Set(cats));
    }, [resources]);

    const counties = useMemo(() => {
        const cnts = resources.map(r => r.county).filter(Boolean);
        return Array.from(new Set(cnts)).sort();
    }, [resources]);

    const topics = useMemo(() => {
        const tps = resources.map(r => r.topic).filter(Boolean);
        return Array.from(new Set(tps)).sort();
    }, [resources]);

    const sectors = useMemo(() => {
        const scts = resources.map(r => r.governance_sector).filter(Boolean);
        return Array.from(new Set(scts)).sort();
    }, [resources]);

    const sdgs = useMemo(() => {
        const s = resources.map(r => r.sdg).filter(Boolean);
        return Array.from(new Set(s)).sort();
    }, [resources]);

    const filteredResources = useMemo(() => {
        return resources.filter(resource => {
            // Text Search matches title, description, summary, topic, or county
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const titleMatch = resource.title?.toLowerCase().includes(query);
                const descMatch = resource.description?.toLowerCase().includes(query);
                const summaryMatch = resource.summary?.toLowerCase().includes(query);
                const topicMatch = resource.topic?.toLowerCase().includes(query);
                const countyMatch = resource.county?.toLowerCase().includes(query);
                
                if (!titleMatch && !descMatch && !summaryMatch && !topicMatch && !countyMatch) {
                    return false;
                }
            }

            // Category Filter
            if (selectedCategory && resource.category !== selectedCategory) {
                return false;
            }

            // County Filter
            if (selectedCounty && resource.county !== selectedCounty) {
                return false;
            }

            // Topic Filter
            if (selectedTopic && resource.topic !== selectedTopic) {
                return false;
            }

            // Governance Sector Filter
            if (selectedSector && resource.governance_sector !== selectedSector) {
                return false;
            }

            // SDG Filter
            if (selectedSdg && resource.sdg !== selectedSdg) {
                return false;
            }

            // Youth Knowledge Base
            if (youthKbOnly && !resource.is_youth_kb) {
                return false;
            }

            return true;
        });
    }, [resources, searchQuery, selectedCategory, selectedCounty, selectedTopic, selectedSector, selectedSdg, youthKbOnly]);

    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedCategory(null);
        setSelectedCounty(null);
        setSelectedTopic(null);
        setSelectedSector(null);
        setSelectedSdg(null);
        setYouthKbOnly(false);
    };

    const hasActiveFilters = 
        searchQuery !== '' || 
        selectedCategory !== null || 
        selectedCounty !== null || 
        selectedTopic !== null || 
        selectedSector !== null || 
        selectedSdg !== null || 
        youthKbOnly;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Filters */}
            <div className="lg:col-span-1 space-y-6">
                <Card className="border-border/50 bg-white rounded-2xl shadow-sm overflow-hidden sticky top-6">
                    <div className="p-5 border-b border-border/40 bg-muted/20 flex justify-between items-center">
                        <h3 className="font-bold text-foreground flex items-center gap-2">
                            <SlidersHorizontal className="h-4 w-4 text-civic-green" />
                            Filters
                        </h3>
                        {hasActiveFilters && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleClearFilters}
                                className="h-8 text-xs text-civic-clay hover:text-civic-clay-dark hover:bg-civic-clay/5 px-2 rounded-lg"
                            >
                                Clear All
                            </Button>
                        )}
                    </div>
                    
                    <CardContent className="p-5 space-y-6">
                        {/* Youth Knowledge Base Toggle */}
                        <div className="flex items-center justify-between pb-4 border-b border-border/40">
                            <div className="space-y-0.5">
                                <label className="text-sm font-bold text-foreground cursor-pointer flex items-center gap-1.5" htmlFor="youth-kb">
                                    <GraduationCap className="h-4 w-4 text-amber-500" />
                                    Youth Knowledge Base
                                </label>
                                <p className="text-[11px] text-muted-foreground">Show youth-led resources only</p>
                            </div>
                            <input
                                type="checkbox"
                                id="youth-kb"
                                checked={youthKbOnly}
                                onChange={(e) => setYouthKbOnly(e.target.checked)}
                                className="w-4.5 h-4.5 accent-civic-green rounded border-gray-300 text-civic-green focus:ring-civic-green cursor-pointer"
                            />
                        </div>

                        {/* Category Filter */}
                        <div className="space-y-2.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <BookOpen className="h-3 w-3" /> Document Category
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                                        className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-all ${
                                            selectedCategory === cat
                                                ? 'bg-civic-green text-white font-bold'
                                                : 'bg-muted/50 text-foreground hover:bg-muted'
                                        }`}
                                    >
                                        {cat.replace('_', ' ').toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* SDG Filter */}
                        {sdgs.length > 0 && (
                            <div className="space-y-2.5 border-t border-border/40 pt-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Globe className="h-3 w-3 text-emerald-600" /> Sustainable Dev Goals
                                </h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {sdgs.map((sdg) => (
                                        <button
                                            key={sdg}
                                            onClick={() => setSelectedSdg(selectedSdg === sdg ? null : sdg)}
                                            className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-all ${
                                                selectedSdg === sdg
                                                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-100 hover:bg-emerald-100'
                                            }`}
                                        >
                                            {sdg}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Counties Filter */}
                        {counties.length > 0 && (
                            <div className="space-y-2.5 border-t border-border/40 pt-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <MapPin className="h-3 w-3 text-blue-500" /> Counties
                                </h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {counties.map((county) => (
                                        <button
                                            key={county}
                                            onClick={() => setSelectedCounty(selectedCounty === county ? null : county)}
                                            className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-all ${
                                                selectedCounty === county
                                                    ? 'bg-blue-600 text-white font-bold'
                                                    : 'bg-blue-50/50 text-blue-800 hover:bg-blue-50'
                                            }`}
                                        >
                                            {county}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Topics Filter */}
                        {topics.length > 0 && (
                            <div className="space-y-2.5 border-t border-border/40 pt-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Tag className="h-3 w-3 text-amber-500" /> Topics
                                </h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {topics.map((topic) => (
                                        <button
                                            key={topic}
                                            onClick={() => setSelectedTopic(selectedTopic === topic ? null : topic)}
                                            className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-all ${
                                                selectedTopic === topic
                                                    ? 'bg-amber-500 text-white font-bold'
                                                    : 'bg-amber-50/50 text-amber-800 hover:bg-amber-50'
                                            }`}
                                        >
                                            {topic}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Governance Sector Filter */}
                        {sectors.length > 0 && (
                            <div className="space-y-2.5 border-t border-border/40 pt-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Briefcase className="h-3 w-3 text-purple-500" /> Governance Sector
                                </h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {sectors.map((sector) => (
                                        <button
                                            key={sector}
                                            onClick={() => setSelectedSector(selectedSector === sector ? null : sector)}
                                            className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-all ${
                                                selectedSector === sector
                                                    ? 'bg-purple-600 text-white font-bold'
                                                    : 'bg-purple-50/50 text-purple-800 hover:bg-purple-50'
                                            }`}
                                        >
                                            {sector}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Document Listing */}
            <div className="lg:col-span-3 space-y-6">
                {/* Search Bar + Active badge indicator */}
                <div className="flex flex-col gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground/70" />
                        <Input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search documents by title, key topic, county context..."
                            className="bg-white border-border/60 pl-11 h-12 text-sm rounded-xl focus-visible:ring-civic-green/30"
                        />
                    </div>

                    {/* Active Filter Indicators */}
                    {hasActiveFilters && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mr-1">Active:</span>
                            {selectedCategory && (
                                <Badge className="bg-civic-green/10 text-civic-green-dark border-none font-medium flex items-center gap-1">
                                    Category: {selectedCategory.replace('_', ' ')}
                                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedCategory(null)} />
                                </Badge>
                            )}
                            {selectedSdg && (
                                <Badge className="bg-emerald-50 text-emerald-800 border-none font-medium flex items-center gap-1">
                                    {selectedSdg}
                                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedSdg(null)} />
                                </Badge>
                            )}
                            {selectedCounty && (
                                <Badge className="bg-blue-50 text-blue-800 border-none font-medium flex items-center gap-1">
                                    County: {selectedCounty}
                                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedCounty(null)} />
                                </Badge>
                            )}
                            {selectedTopic && (
                                <Badge className="bg-amber-50 text-amber-800 border-none font-medium flex items-center gap-1">
                                    Topic: {selectedTopic}
                                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedTopic(null)} />
                                </Badge>
                            )}
                            {selectedSector && (
                                <Badge className="bg-purple-50 text-purple-800 border-none font-medium flex items-center gap-1">
                                    Sector: {selectedSector}
                                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedSector(null)} />
                                </Badge>
                            )}
                            {youthKbOnly && (
                                <Badge className="bg-amber-50 text-amber-800 border-none font-medium flex items-center gap-1">
                                    Youth KB Only
                                    <X className="h-3 w-3 cursor-pointer" onClick={() => setYouthKbOnly(false)} />
                                </Badge>
                            )}
                        </div>
                    )}
                </div>

                {/* Grid */}
                {filteredResources.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fadeIn">
                        {filteredResources.map((resource) => (
                            <LawResourceCard key={resource.id} resource={resource} />
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-border flex flex-col items-center justify-center p-6 shadow-sm">
                        <BookOpen className="h-16 w-16 text-muted-foreground/30 mb-4 stroke-1" />
                        <h3 className="text-xl font-bold text-foreground mb-2">No documents match filters</h3>
                        <p className="text-muted-foreground text-sm max-w-sm mb-6">
                            Try loosening your filters, removing search terms, or checking the Youth Knowledge Base toggle.
                        </p>
                        <Button 
                            onClick={handleClearFilters}
                            className="bg-civic-green hover:bg-civic-green-dark text-white rounded-xl font-bold"
                        >
                            Reset All Filters
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
