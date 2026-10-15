/**
 * Turn Markdown/HTML authored in the course editor into plain text for
 * previews (cards, meta descriptions) so learners never see raw `**` or `#`.
 */
export function toPlainText(input: string | null | undefined): string {
    if (!input) return '';
    return input
        .replace(/<[^>]+>/g, ' ')                       // HTML tags
        .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')           // images
        .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')         // links -> text
        .replace(/```[\s\S]*?```/g, ' ')                // fenced code
        .replace(/`([^`]+)`/g, '$1')                    // inline code
        .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '') // headings, quotes, list markers
        .replace(/(\*\*|__)(.*?)\1/g, '$2')             // bold
        .replace(/(\*|_)(.*?)\1/g, '$2')                // italics
        .replace(/~~(.*?)~~/g, '$1')                    // strikethrough
        .replace(/^\s*\|?[-:\s|]+\|?\s*$/gm, ' ')       // table separators
        .replace(/\|/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
}
