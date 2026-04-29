import SignupContent from './SignupContent';

function getSafeNext(next: string | null | undefined) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const resolved = await searchParams;
  const next = getSafeNext(resolved.next);
  return <SignupContent next={next} />;
}
