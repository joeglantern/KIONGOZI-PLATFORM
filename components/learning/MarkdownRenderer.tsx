"use client";

import { memo, useMemo } from 'react';
import DOMPurify from 'dompurify';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import NextImage from 'next/image';

interface MarkdownRendererProps {
    content: string;
}

function looksLikeHtml(content: string) {
    return /<\/?[a-z][\s\S]*>/i.test(content);
}

const proseClassName = [
    'prose',
    'prose-slate',
    'max-w-none',
    'prose-headings:font-bold',
    'prose-h1:text-3xl',
    'prose-h2:text-2xl',
    'prose-h3:text-xl',
    'prose-p:text-gray-600',
    'prose-p:leading-relaxed',
    'prose-li:text-gray-600',
    'prose-strong:text-gray-900',
    'prose-blockquote:border-orange-500',
    'prose-blockquote:bg-orange-50/50',
    'prose-code:text-orange-600',
    'prose-code:bg-orange-50',
    'prose-code:px-1',
    'prose-code:rounded',
    'prose-img:rounded-2xl',
    'prose-img:border',
    'prose-img:border-gray-100',
    'prose-img:shadow-md',
    'prose-video:rounded-2xl',
    'prose-video:shadow-md',
    'prose-table:my-8',
].join(' ');

export const MarkdownRenderer = memo(function MarkdownRenderer({ content }: MarkdownRendererProps) {
    const hasHtml = looksLikeHtml(content);
    const sanitizedHtml = useMemo(() => {
        if (!hasHtml) {
            return '';
        }

        return DOMPurify.sanitize(content, {
            USE_PROFILES: { html: true },
        });
    }, [content, hasHtml]);

    if (hasHtml) {
        return (
            <div
                className={proseClassName}
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
        );
    }

    return (
        <div className={proseClassName}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ node, ...props }) => (
                        <h1 className="text-3xl font-bold text-gray-900 mb-6 mt-10 tracking-tight" {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                        <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8 flex items-center gap-2" {...props} />
                    ),
                    h3: ({ node, ...props }) => (
                        <h3 className="text-xl font-bold text-gray-800 mb-3 mt-6" {...props} />
                    ),
                    p: ({ node, ...props }) => (
                        <p className="text-gray-600 mb-5 leading-relaxed" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                        <ul className="list-disc list-inside mb-5 space-y-2 text-gray-600" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                        <ol className="list-decimal list-inside mb-5 space-y-2 text-gray-600" {...props} />
                    ),
                    blockquote: ({ node, ...props }) => (
                        <blockquote className="border-l-4 border-orange-500 pl-6 py-4 my-6 bg-orange-50/30 text-gray-700 italic rounded-r-lg" {...props} />
                    ),
                    pre: ({ node, ...props }) => <>{props.children}</>,
                    code: ({ node, className, children, ...props }: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const isBlock = match || String(children).includes('\n');

                        if (!isBlock) {
                            return (
                                <code className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded text-sm font-mono border border-orange-100" {...props}>
                                    {children}
                                </code>
                            );
                        }

                        return (
                            <div className="my-6 rounded-xl overflow-hidden border border-gray-200 shadow-sm not-prose">
                                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                                    <span className="text-xs font-mono text-gray-400 capitalize">{match?.[1] || 'code'}</span>
                                    <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                                    </div>
                                </div>
                                <div className="block bg-white text-gray-800 p-5 overflow-x-auto text-sm font-mono">
                                    <code className={className} {...props}>{children}</code>
                                </div>
                            </div>
                        );
                    },
                    a: ({ node, ...props }) => (
                        <a className="text-orange-600 hover:text-orange-700 underline underline-offset-4 font-medium transition-colors" {...props} />
                    ),
                    img: ({ node, src, alt, ...props }) => (
                        <span className="block relative my-8 w-full" style={{ minHeight: '200px' }}>
                            <NextImage
                                src={src || ''}
                                alt={alt || ''}
                                fill
                                className="rounded-2xl shadow-md border border-gray-100 object-contain"
                                unoptimized={src?.startsWith('data:') || src?.startsWith('blob:')}
                            />
                        </span>
                    ),
                    hr: ({ node, ...props }) => (
                        <hr className="my-10 border-gray-100" {...props} />
                    ),
                    table: ({ node, ...props }) => (
                        <div className="overflow-x-auto my-8 rounded-xl border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200" {...props} />
                        </div>
                    ),
                    thead: ({ node, ...props }) => (
                        <thead className="bg-gray-50" {...props} />
                    ),
                    th: ({ node, ...props }) => (
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                        <td className="px-6 py-4 text-sm text-gray-600" {...props} />
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
});
