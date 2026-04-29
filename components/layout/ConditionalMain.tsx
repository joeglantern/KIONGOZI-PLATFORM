// Server component — no client needed. The instructor layout renders its own
// <main>, so the root layout only needs pt-16 for non-instructor routes.
// Pass isInstructor from the root layout via a prop set at the segment level.

interface Props {
    children: React.ReactNode;
    isInstructor?: boolean;
}

export function ConditionalMain({ children, isInstructor }: Props) {
    return (
        <main className={`flex-1 ${isInstructor ? '' : 'pt-16'}`}>
            {children}
        </main>
    );
}
