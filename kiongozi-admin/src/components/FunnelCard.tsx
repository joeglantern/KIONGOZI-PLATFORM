// The 5 numbers that say whether KChat is working, per sign-up week:
// signed up → posted → followed someone → sent a DM → came back the next day.
import { useQuery } from '@tanstack/react-query'
import { getFunnel, type FunnelWeek } from '../api/client'
import { cn } from '../lib/utils'

const STEPS: { key: keyof FunnelWeek; label: string }[] = [
  { key: 'signed_up', label: 'Signed up' },
  { key: 'posted', label: 'Posted' },
  { key: 'followed', label: 'Followed someone' },
  { key: 'messaged', label: 'Sent a DM' },
  { key: 'came_back_next_day', label: 'Came back next day' },
]

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)

function weekLabel(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export default function FunnelCard() {
  const { data = [], isLoading, isError } = useQuery<FunnelWeek[]>({
    queryKey: ['funnel'],
    queryFn: () => getFunnel(8),
    staleTime: 5 * 60_000,
  })

  // Totals across the weeks shown
  const total = STEPS.reduce((acc, s) => ({ ...acc, [s.key]: data.reduce((n, w) => n + Number(w[s.key] || 0), 0) }), {} as Record<string, number>)
  const base = total.signed_up || 0

  return (
    <section className="mb-10">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">New people, last 8 weeks</p>
      <p className="text-[11px] text-muted-foreground mt-0.5 mb-4">Of everyone who signed up, how many did each thing at least once. Bots excluded.</p>

      {isLoading ? (
        <div className="h-[150px] rounded-xl bg-muted/40 animate-pulse" />
      ) : isError ? (
        <p className="text-[13px] text-muted-foreground">Couldn’t load the funnel. The API may still be on the old version.</p>
      ) : !base ? (
        <p className="text-[13px] text-muted-foreground">No sign-ups in the last 8 weeks.</p>
      ) : (
        <>
          <div className="space-y-2.5 mb-6">
            {STEPS.map((s, i) => {
              const n = total[s.key] || 0
              const p = pct(n, base)
              return (
                <div key={s.key} className="flex items-center gap-3">
                  <span className="w-[150px] shrink-0 text-[13px] text-foreground">{s.label}</span>
                  <div className="flex-1 h-7 rounded-md bg-muted/50 overflow-hidden">
                    <div
                      className={cn('h-full rounded-md transition-[width] duration-700', i === 0 ? 'bg-foreground/80' : 'bg-brand')}
                      style={{ width: `${Math.max(p, n ? 2 : 0)}%` }}
                    />
                  </div>
                  <span className="w-[92px] shrink-0 text-right tabular-nums text-[13px]">
                    <span className="font-semibold">{n}</span>
                    {i > 0 && <span className="text-muted-foreground"> · {p}%</span>}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] tabular-nums">
              <thead>
                <tr className="text-muted-foreground text-left">
                  <th className="font-medium py-1.5 pr-4">Week of</th>
                  {STEPS.map(s => <th key={s.key} className="font-medium py-1.5 px-2 text-right">{s.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.map(w => (
                  <tr key={w.week} className="border-t border-border">
                    <td className="py-1.5 pr-4">{weekLabel(w.week)}</td>
                    {STEPS.map((s, i) => (
                      <td key={s.key} className="py-1.5 px-2 text-right">
                        {w[s.key]}
                        {i > 0 && w.signed_up ? <span className="text-muted-foreground"> ({pct(Number(w[s.key]), w.signed_up)}%)</span> : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
