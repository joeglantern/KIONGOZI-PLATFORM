import LoginContent from './LoginContent';
import { getSafeNext } from '@/lib/auth/redirects';

// Server component, reads searchParams without useSearchParams(),
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
