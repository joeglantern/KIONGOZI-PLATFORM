/*
  THESIS: A civic operations room that knows it is watching over Kenya — not a SaaS
  admin template. The left panel is anchored in Kenya's physical geography; the right
  is stripped to only what the task needs.

  OWN-WORLD: Deep navy-blue dark (#0C1424) left against near-black right. Kenya map
  silhouette at 6% opacity as the structural graphic. Brand green (#5CB85C) used
  exactly twice: the wordmark and "Center" in the display heading. No glows, no grid
  overlays, no radial gradients. Inter 800 for display at −0.03em tracking.

  STORY: The operator arrives, sees their platform's territory named at scale,
  and signs in with as little friction as possible.

  FIRST VIEWPORT: Split 52/48. Left — wordmark top-left, "Control / Center" at
  display scale center, Kenya outline behind it, stat strip at bottom. Right —
  centered form, 340px max-width, sign-in heading, email + password + button.

  FORM: Split brand-panel-left / form-right. Direction 1 of 1.

  FINISH: unreviewed and undocumented is unfinished; this build ends with the
  finish review, the verdict, and DESIGN.md.
*/

import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { WarningCircle } from '@phosphor-icons/react';
import { useAuthStore } from '../stores/authStore';

// Simplified Kenya outline — recognizable silhouette for civic geography anchor.
// NE horn is the distinctive tell; Lake Victoria indent on SW.
const KENYA_OUTLINE =
  'M80,52 L142,30 L200,24 L234,20 L268,28 L290,52 L272,74 L250,80 ' +
  'L254,152 L240,250 L195,266 L148,270 L108,260 L80,242 L58,226 ' +
  'L46,208 L58,192 L62,168 L68,132 L74,94 Z';

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

      {/* ── Left: civic geography panel ───────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col"
        style={{ background: '#0C1424' }}
      >
        {/* Kenya silhouette — the product's territory at a glance */}
        <svg
          viewBox="0 0 320 300"
          aria-hidden="true"
          className="absolute pointer-events-none select-none"
          style={{
            right: '-6%',
            top: '50%',
            transform: 'translateY(-52%)',
            width: '82%',
            opacity: 0.065,
          }}
        >
          <path
            d={KENYA_OUTLINE}
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>

        {/* Structural horizontal lines — map graticule feel */}
        {[25, 50, 75].map((pct) => (
          <div
            key={pct}
            aria-hidden="true"
            className="absolute left-0 right-0 pointer-events-none"
            style={{ top: `${pct}%`, height: '1px', background: 'rgba(255,255,255,0.032)' }}
          />
        ))}

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-14 py-14">

          {/* Wordmark */}
          <div className="flex items-center gap-2.5">
            <KiongoziBadge size={28} />
            <span style={{
              color: '#5CB85C',
              fontWeight: 600,
              fontSize: '13.5px',
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
            }}>
              Kiongozi
            </span>
          </div>

          {/* Display heading — vertical center */}
          <div className="flex-1 flex flex-col justify-center">
            <p style={{
              fontSize: '10.5px',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(92,184,92,0.58)',
              fontWeight: 500,
              marginBottom: '18px',
            }}>
              Operations
            </p>
            <h1 style={{
              fontSize: 'clamp(48px, 5.2vw, 70px)',
              fontWeight: 800,
              lineHeight: 0.9,
              letterSpacing: '-0.03em',
              color: 'rgba(255,255,255,0.94)',
              margin: 0,
            }}>
              Control<br />
              <span style={{ color: '#5CB85C' }}>Center</span>
            </h1>
            <p style={{
              marginTop: '26px',
              fontSize: '13.5px',
              lineHeight: 1.7,
              color: 'rgba(160,185,210,0.48)',
              maxWidth: '295px',
            }}>
              Monitor users, moderate content, and manage
              platform health across Kenya's civic network.
            </p>
          </div>

          {/* Bottom data strip */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.055)',
            paddingTop: '20px',
            display: 'flex',
            gap: '36px',
          }}>
            {[
              { value: '47', label: 'Counties' },
              { value: '2026', label: 'Platform year' },
            ].map(({ value, label }) => (
              <div key={label}>
                <div style={{
                  fontSize: '19px',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.8)',
                  letterSpacing: '-0.02em',
                }}>
                  {value}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: 'rgba(160,185,210,0.36)',
                  marginTop: '2px',
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: sign-in form ────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-screen flex items-center justify-center px-6 py-14 lg:px-16">
        <div className="w-full" style={{ maxWidth: '340px' }}>

          {/* Mobile-only wordmark */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <KiongoziBadge size={26} />
            <span style={{
              color: '#5CB85C',
              fontWeight: 600,
              fontSize: '13px',
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
            }}>
              Kiongozi
            </span>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{
              fontSize: '21px',
              fontWeight: 700,
              color: 'hsl(0 0% 97%)',
              letterSpacing: '-0.025em',
              marginBottom: '4px',
            }}>
              Sign in
            </h2>
            <p style={{ fontSize: '13px', color: 'hsl(240 5% 60%)', lineHeight: 1.5 }}>
              Use your administrator credentials to continue.
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div
              className="flex items-start gap-2.5 rounded-lg border mb-5"
              style={{
                background: 'rgba(239,68,68,0.07)',
                borderColor: 'rgba(239,68,68,0.18)',
                padding: '11px 13px',
              }}
            >
              <WarningCircle
                weight="fill"
                size={15}
                style={{ color: '#F87171', flexShrink: 0, marginTop: '1.5px' }}
              />
              <p style={{ fontSize: '13px', color: '#F87171', lineHeight: 1.5, margin: 0 }}>
                {error}
              </p>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'hsl(0 0% 78%)',
                  letterSpacing: '0.01em',
                  marginBottom: '6px',
                }}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@kiongozi.app"
                disabled={isLoading}
                className="input-base w-full"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'hsl(0 0% 78%)',
                  letterSpacing: '0.01em',
                  marginBottom: '6px',
                }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                      display: 'inline-block',
                      width: '13px',
                      height: '13px',
                      border: '2px solid rgba(0,0,0,0.15)',
                      borderTopColor: 'rgba(0,0,0,0.7)',
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
            marginTop: '28px',
            textAlign: 'center',
            fontSize: '11px',
            color: 'hsl(240 5% 38%)',
            lineHeight: 1.5,
          }}>
            Access is restricted to authorised administrators only.
          </p>

        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KiongoziBadge({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect width="28" height="28" rx="6" fill="#5CB85C" />
      {/* K + arrow — civic forward motion */}
      <path
        d="M8 8h4v12H8M12 14h7M16 10l4 4-4 4"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
