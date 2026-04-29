import LoginContent from './LoginContent';

function getSafeNext(next: string | null | undefined) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

// Server component — reads searchParams without useSearchParams(),
// so LoginContent can render on the server with no Suspense needed.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const resolved = await searchParams;
  const next = getSafeNext(resolved.next);
  return <LoginContent next={next} />;
}
