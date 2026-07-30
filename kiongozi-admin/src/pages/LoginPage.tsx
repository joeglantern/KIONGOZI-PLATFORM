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
    <div className="min-h-screen flex" style={{ background: 'hsl(240 10% 3.9%)' }}>

      {/* ── Left: brand panel ─────────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[48%] relative overflow-hidden"
        style={{ background: '#111318' }}
      >
        {/* Subtle dot-grid texture */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Soft vignette so edges recede */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 90% 80% at 50% 50%, transparent 40%, #111318 100%)',
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
              boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.5)',
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

          {/* Label above heading */}
          <p style={{
            fontSize: '10.5px',
            fontWeight: 600,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#5CB85C',
            marginBottom: '10px',
          }}>
            Admin Console
          </p>

          {/* Heading */}
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-0.025em',
            color: 'rgba(255,255,255,0.95)',
            margin: 0,
            marginBottom: '14px',
          }}>
            Kiongozi<br />Control Center
          </h1>

          <p style={{
            fontSize: '13.5px',
            lineHeight: 1.65,
            color: 'rgba(255,255,255,0.38)',
            maxWidth: '260px',
          }}>
            Manage users, moderate content, and keep Kenya's civic network running.
          </p>

          {/* Bottom strip */}
          <div style={{
            position: 'absolute',
            bottom: '32px',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: '24px',
          }}>
            {[
              { v: '47', l: 'Counties' },
              { v: '2026', l: 'Season' },
            ].map(({ v, l }) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '17px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '-0.02em' }}>{v}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '1px', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: sign-in form ────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-screen flex items-center justify-center px-6 py-14 lg:px-14">
        <div className="w-full" style={{ maxWidth: '340px' }}>

          {/* Mobile-only logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div
              className="rounded-xl overflow-hidden flex-shrink-0"
              style={{ width: '38px', height: '38px' }}
            >
              <img
                src="/KchatLogo.png"
                alt="Kiongozi Chat"
                width={38}
                height={38}
                style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.01em' }}>
              Kiongozi Admin
            </span>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: 700,
              color: 'hsl(0 0% 97%)',
              letterSpacing: '-0.025em',
              marginBottom: '4px',
            }}>
              Sign in
            </h2>
            <p style={{ fontSize: '13px', color: 'hsl(240 5% 58%)', lineHeight: 1.5 }}>
              Enter your administrator credentials to continue.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-start gap-2.5 rounded-lg border mb-5"
              style={{
                background: 'rgba(239,68,68,0.07)',
                borderColor: 'rgba(239,68,68,0.2)',
                padding: '11px 13px',
              }}
            >
              <WarningCircle weight="fill" size={15} style={{ color: '#F87171', flexShrink: 0, marginTop: '1.5px' }} />
              <p style={{ fontSize: '13px', color: '#F87171', lineHeight: 1.5, margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label htmlFor="email" style={{
                display: 'block', fontSize: '12px', fontWeight: 500,
                color: 'hsl(0 0% 76%)', letterSpacing: '0.01em', marginBottom: '6px',
              }}>
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
              <label htmlFor="password" style={{
                display: 'block', fontSize: '12px', fontWeight: 500,
                color: 'hsl(0 0% 76%)', letterSpacing: '0.01em', marginBottom: '6px',
              }}>
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

          <p style={{
            marginTop: '28px', textAlign: 'center', fontSize: '11px',
            color: 'hsl(240 5% 36%)', lineHeight: 1.5,
          }}>
            Access is restricted to authorised administrators only.
          </p>

        </div>
      </div>
    </div>
  );
}
