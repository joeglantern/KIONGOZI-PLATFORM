import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { WarningCircle } from '@phosphor-icons/react';
import { useAuthStore } from '../stores/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Invalid credentials. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">

      {/* ── Left: brand panel ─────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden bg-card border-r border-border">
        {/* Subtle dot-grid texture */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(128,128,128,0.08) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Soft vignette */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 90% 80% at 50% 50%, transparent 40%, var(--tw-shadow-color, transparent) 100%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 py-14 text-center">

          {/* Logo */}
          <div
            className="rounded-2xl overflow-hidden mb-8"
            style={{
              width: '148px',
              height: '148px',
              boxShadow: '0 0 0 1px rgba(128,128,128,0.12), 0 20px 60px rgba(0,0,0,0.15)',
            }}
          >
            <img
              src="/KchatLogo.png"
              alt="Kiongozi Chat"
              width={148}
              height={148}
              style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <p className="text-[10.5px] font-semibold tracking-[0.2em] uppercase text-brand mb-2.5">
            Admin Console
          </p>

          <h1 className="text-[28px] font-bold leading-[1.15] tracking-tight text-foreground">
            Kiongozi<br />Control Center
          </h1>

        </div>
      </div>

      {/* ── Right: sign-in form ────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-screen flex items-center justify-center px-6 py-14 lg:px-14">
        <div className="w-full max-w-[340px]">

          {/* Mobile-only logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="rounded-xl overflow-hidden shrink-0" style={{ width: '38px', height: '38px' }}>
              <img
                src="/KchatLogo.png"
                alt="Kiongozi Chat"
                width={38}
                height={38}
                style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <span className="text-[14px] font-semibold text-foreground tracking-tight">
              Kiongozi Admin
            </span>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-[22px] font-bold text-foreground tracking-tight mb-1">
              Sign in
            </h2>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Enter your administrator credentials to continue.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-start gap-2.5 rounded-lg border mb-5 px-3 py-2.5"
              style={{
                background: 'rgba(239,68,68,0.07)',
                borderColor: 'rgba(239,68,68,0.2)',
              }}
            >
              <WarningCircle weight="fill" size={15} className="text-red-400 shrink-0 mt-[1.5px]" />
              <p className="text-[13px] text-red-400 leading-relaxed">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div>
              <label
                htmlFor="email"
                className="block text-[12px] font-medium text-muted-foreground mb-1.5 tracking-[0.01em]"
              >
                Email address
              </label>
              <input
                id="email" type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@kiongozi.app"
                disabled={isLoading}
                className="input-base w-full"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-[12px] font-medium text-muted-foreground mb-1.5 tracking-[0.01em]"
              >
                Password
              </label>
              <input
                id="password" type="password" autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                className="input-base w-full"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="btn-primary w-full mt-1"
            >
              {isLoading ? (
                <>
                  <span
                    className="animate-spin"
                    style={{
                      display: 'inline-block', width: '13px', height: '13px',
                      border: '2px solid rgba(0,0,0,0.15)', borderTopColor: 'rgba(0,0,0,0.7)',
                      borderRadius: '50%',
                    }}
                  />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-[11px] text-muted-foreground leading-relaxed">
            Access is restricted to authorised administrators only.
          </p>

        </div>
      </div>
    </div>
  );
}
