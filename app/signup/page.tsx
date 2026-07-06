import SignupContent from './SignupContent';

function getSafeNext(next: string | null | undefined) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; path?: string; goal?: string; mission?: string; answer?: string }>;
}) {
  const resolved = await searchParams;
  const next = getSafeNext(resolved.next);
  return (
    <SignupContent 
      next={next} 
      path={resolved.path || null} 
      goal={resolved.goal || null} 
      mission={resolved.mission || null}
      answer={resolved.answer || null}
    />
  );
}
