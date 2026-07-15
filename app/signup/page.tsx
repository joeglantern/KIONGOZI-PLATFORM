import SignupContent from './SignupContent';
import { getSafeNext } from '@/lib/auth/redirects';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; path?: string; mission?: string; answer?: string }>;
}) {
  const resolved = await searchParams;
  const next = getSafeNext(resolved.next);
  return (
    <SignupContent 
      next={next}
      path={resolved.path || null}
      mission={resolved.mission || null}
      answer={resolved.answer || null}
    />
  );
}
