"use client";

import { Button } from '@/components/ui/button';
import type { CourseReadinessSummary, CourseRevisionRecord, ValidationIssue } from '@/lib/course-authoring';
import {
    AlertCircle,
    CheckCircle2,
    Eye,
    History,
    Loader2,
    RefreshCcw,
    Sparkles,
    TriangleAlert,
} from 'lucide-react';

type RailRevision = CourseRevisionRecord & {
    restorable?: boolean;
};

interface ReadinessRailProps {
    readiness: CourseReadinessSummary | null;
    loadingReadiness: boolean;
    revisions: RailRevision[];
    loadingRevisions: boolean;
    restoringRevisionId?: string | null;
    onPreviewCourse: () => void;
    onPreviewCurrentItem?: (() => void) | null;
    onSelectIssue: (issue: ValidationIssue) => void;
    onRestoreRevision: (revisionId: string) => void;
}

function formatTimestamp(value?: string | null) {
    if (!value) return 'Unknown';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleString();
}

export function ReadinessRail({
    readiness,
    loadingReadiness,
    revisions,
    loadingRevisions,
    restoringRevisionId,
    onPreviewCourse,
    onPreviewCurrentItem,
    onSelectIssue,
    onRestoreRevision,
}: ReadinessRailProps) {
    const tone = readiness?.status === 'published'
        ? 'green'
        : readiness?.status === 'ready_to_publish'
            ? 'orange'
            : 'red';

    const toneClasses = tone === 'green'
        ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/10 dark:border-green-800/40 dark:text-green-400'
        : tone === 'orange'
            ? 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/10 dark:border-orange-800/40 dark:text-orange-400'
            : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/10 dark:border-red-800/40 dark:text-red-400';

    return (
        <aside className="hidden xl:flex w-[360px] border-l border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40 flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <section className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Readiness</p>
                            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-widest ${toneClasses}`}>
                                {readiness?.status === 'needs_attention' ? <TriangleAlert className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                                {readiness?.statusLabel || 'Checking'}
                            </div>
                        </div>
                        {loadingReadiness && <Loader2 className="w-4 h-4 animate-spin text-orange-500" />}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-2xl bg-gray-50 dark:bg-gray-900 p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Checklist</p>
                            <p className="font-black text-gray-900 dark:text-white">
                                {readiness ? `${readiness.completedChecks}/${readiness.totalChecks}` : '--'}
                            </p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 dark:bg-gray-900 p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Issues</p>
                            <p className="font-black text-gray-900 dark:text-white">
                                {readiness ? `${readiness.blockingCount} blockers` : '--'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 space-y-2">
                        <Button onClick={onPreviewCourse} variant="outline" className="w-full justify-start rounded-2xl border-gray-200 dark:border-gray-700 gap-2">
                            <Eye className="w-4 h-4" />
                            Preview Course
                        </Button>
                        {onPreviewCurrentItem && (
                            <Button onClick={onPreviewCurrentItem} variant="outline" className="w-full justify-start rounded-2xl border-gray-200 dark:border-gray-700 gap-2">
                                <Eye className="w-4 h-4" />
                                Preview Current Lesson
                            </Button>
                        )}
                    </div>
                </section>

                <section className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Publish Checklist</p>
                            <p className="text-sm text-gray-500">What still needs attention before learners see this course.</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {loadingReadiness && !readiness ? (
                            <div className="rounded-2xl bg-gray-50 dark:bg-gray-900 p-4 text-sm text-gray-400">
                                Checking course readiness…
                            </div>
                        ) : readiness?.checks.length ? (
                            readiness.checks.map((check) => (
                                <div key={check.id} className="flex items-start gap-3 rounded-2xl bg-gray-50 dark:bg-gray-900 p-3">
                                    {check.passed ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    ) : (
                                        <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${check.blocking ? 'text-red-500' : 'text-orange-500'}`} />
                                    )}
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{check.label}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{check.description}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-2xl bg-gray-50 dark:bg-gray-900 p-4 text-sm text-gray-400">
                                No checklist data yet.
                            </div>
                        )}
                    </div>
                </section>

                <section className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Needs Attention</p>
                    <p className="text-sm text-gray-500 mb-4">Jump straight to the parts that block publishing.</p>

                    <div className="space-y-3">
                        {readiness?.issues.length ? (
                            readiness.issues.map((issue) => (
                                <button
                                    key={issue.id}
                                    onClick={() => onSelectIssue(issue)}
                                    className={`w-full text-left rounded-2xl border px-4 py-3 transition-colors ${
                                        issue.level === 'blocking'
                                            ? 'border-red-200 bg-red-50 hover:bg-red-100/70 dark:border-red-800/30 dark:bg-red-900/10'
                                            : 'border-orange-200 bg-orange-50 hover:bg-orange-100/70 dark:border-orange-800/30 dark:bg-orange-900/10'
                                    }`}
                                >
                                    <p className={`text-sm font-bold ${issue.level === 'blocking' ? 'text-red-700 dark:text-red-300' : 'text-orange-700 dark:text-orange-300'}`}>
                                        {issue.label}
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{issue.description}</p>
                                </button>
                            ))
                        ) : (
                            <div className="rounded-2xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 px-4 py-3">
                                <p className="text-sm font-bold text-green-700 dark:text-green-300">No blocking issues found.</p>
                                <p className="text-xs text-green-700/80 dark:text-green-300/80 mt-1">This course is in good shape for publishing.</p>
                            </div>
                        )}
                    </div>
                </section>

                <section className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <History className="w-4 h-4 text-gray-400" />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Version History</p>
                            <p className="text-sm text-gray-500">Recent authoring snapshots for safe restores.</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {loadingRevisions ? (
                            <div className="rounded-2xl bg-gray-50 dark:bg-gray-900 p-4 text-sm text-gray-400">
                                Loading history…
                            </div>
                        ) : revisions.length ? (
                            revisions.map((revision) => (
                                <div key={revision.id} className="rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-3">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{revision.summary}</p>
                                    <p className="text-xs text-gray-500 mt-1">{formatTimestamp(revision.created_at)}</p>
                                    {revision.restorable && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onRestoreRevision(revision.id)}
                                            disabled={restoringRevisionId === revision.id}
                                            className="mt-3 h-8 px-3 rounded-xl text-orange-600 hover:text-orange-700 hover:bg-orange-50 gap-2"
                                        >
                                            {restoringRevisionId === revision.id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <RefreshCcw className="w-3.5 h-3.5" />
                                            )}
                                            Restore
                                        </Button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="rounded-2xl bg-gray-50 dark:bg-gray-900 p-4 text-sm text-gray-400">
                                No revisions yet. They will appear automatically as you edit.
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </aside>
    );
}
