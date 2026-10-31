import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Plus, Pause, Play, StopCircle, PencilSimple, Eye, CursorClick, Users, EyeSlash, Flag } from '@phosphor-icons/react'
import toast from 'react-hot-toast'
import { getAds, createAd, updateAd, endAd, type AdCampaign } from '../api/client'
import { cn } from '../lib/utils'

const CTA_TARGETS = [
  { value: 'kchat://invite', label: 'Invite friends screen' },
  { value: 'kchat://ai', label: 'Kiongozi AI' },
  { value: 'kchat://recap', label: 'Your week (recap)' },
  { value: 'kchat://story', label: 'New story' },
  { value: 'kchat://baraza', label: 'Start a baraza' },
  { value: 'kchat://mitaa', label: 'Mitaa clips' },
  { value: 'kchat://messages', label: 'Messages (chats)' },
  { value: 'kchat://explore', label: 'Explore' },
  { value: 'url', label: 'Website link…' },
]

const EMPTY: Partial<AdCampaign> = {
  advertiser_name: '', advertiser_avatar_url: '', headline: '', body: '', media_url: '', media_type: 'image',
  width: 1080, height: 1350, cta_label: 'Learn more', cta_url: 'https://', is_house: false, status: 'draft',
  weight: 10, frequency_hours: 6, max_impressions: null, starts_at: null, ends_at: null,
  why_text: 'This ad is shown to people on KChat in Kenya.',
}

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : String(n))

function StatusPill({ status }: { status: AdCampaign['status'] }) {
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize',
      status === 'active' && 'bg-brand/15 text-brand',
      status === 'paused' && 'bg-amber-500/15 text-amber-400',
      status === 'draft' && 'bg-zinc-500/15 text-zinc-400',
      status === 'ended' && 'bg-red-500/10 text-red-400')}>{status}</span>
  )
}

/** Phone-sized preview of how the ad sits in the feed */
function Preview({ ad }: { ad: Partial<AdCampaign> }) {
  return (
    <div className="w-[300px] rounded-[28px] border border-border bg-black p-3 text-white shrink-0">
      <div className="flex gap-2.5">
        <div className="w-9 h-9 rounded-full bg-zinc-800 overflow-hidden shrink-0">
          {ad.advertiser_avatar_url ? <img src={ad.advertiser_avatar_url} className="w-full h-full object-cover" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight truncate">{ad.advertiser_name || 'Advertiser'}</p>
          <p className="text-[11px] text-zinc-500">Sponsored</p>
          <p className="text-[13px] mt-1.5 leading-snug"><b>{ad.headline || 'Headline'}</b> {ad.body}</p>
          <div className="mt-2 rounded-xl overflow-hidden">
            {ad.media_url && ad.media_url.startsWith('http')
              ? <img src={ad.media_url} className="w-full aspect-[4/5] object-cover" />
              : <div className="w-full aspect-[4/5] bg-zinc-800" />}
            <div className="h-9 px-3 flex items-center justify-between bg-[#5CB85C] text-black text-[12.5px] font-bold">
              <span className="truncate">{ad.cta_label || 'Learn more'}</span><span>›</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      {children}
      {hint ? <span className="text-[11px] text-muted-foreground/80">{hint}</span> : null}
    </label>
  )
}
const input = 'h-9 px-3 rounded-lg bg-accent border border-border text-sm outline-none focus:border-brand'

function Editor({ initial, onClose }: { initial: Partial<AdCampaign>; onClose: () => void }) {
  const qc = useQueryClient()
  const [ad, setAd] = useState<Partial<AdCampaign>>(initial)
  const set = (k: keyof AdCampaign, v: any) => setAd(a => ({ ...a, [k]: v }))
  const target = CTA_TARGETS.find(t => t.value === ad.cta_url)?.value || 'url'
  const save = useMutation({
    mutationFn: () => {
      const body = { ...ad, max_impressions: ad.max_impressions || null, starts_at: ad.starts_at || null, ends_at: ad.ends_at || null }
      return ad.id ? updateAd(ad.id, body) : createAd(body)
    },
    onSuccess: () => { toast.success(ad.id ? 'Campaign saved' : 'Campaign created'); qc.invalidateQueries({ queryKey: ['ads'] }); onClose() },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Could not save'),
  })
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto p-4" onClick={onClose}>
      <div className="card w-full max-w-[920px] p-6 my-8" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-5">{ad.id ? 'Edit campaign' : 'New campaign'}</h2>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Advertiser name"><input className={input} value={ad.advertiser_name || ''} onChange={e => set('advertiser_name', e.target.value)} /></Field>
            <Field label="Advertiser logo URL"><input className={input} value={ad.advertiser_avatar_url || ''} onChange={e => set('advertiser_avatar_url', e.target.value)} /></Field>
            <div className="sm:col-span-2"><Field label="Headline" hint="Short and specific. Shown in bold."><input className={input} value={ad.headline || ''} onChange={e => set('headline', e.target.value)} maxLength={80} /></Field></div>
            <div className="sm:col-span-2"><Field label="Text"><textarea className={cn(input, 'h-20 py-2')} value={ad.body || ''} onChange={e => set('body', e.target.value)} maxLength={220} /></Field></div>
            <div className="sm:col-span-2"><Field label="Image URL" hint="4:5 portrait works best (1080×1350)."><input className={input} value={ad.media_url || ''} onChange={e => set('media_url', e.target.value)} /></Field></div>
            <Field label="Button text"><input className={input} value={ad.cta_label || ''} onChange={e => set('cta_label', e.target.value)} maxLength={24} /></Field>
            <Field label="Button opens">
              <select className={input} value={target} onChange={e => set('cta_url', e.target.value === 'url' ? 'https://' : e.target.value)}>
                {CTA_TARGETS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            {target === 'url' && <div className="sm:col-span-2"><Field label="Website link"><input className={input} value={ad.cta_url || ''} onChange={e => set('cta_url', e.target.value)} /></Field></div>}
            <Field label="Starts" hint="Empty = now"><input type="datetime-local" className={input} value={ad.starts_at?.slice(0, 16) || ''} onChange={e => set('starts_at', e.target.value ? new Date(e.target.value).toISOString() : null)} /></Field>
            <Field label="Ends" hint="Empty = until stopped"><input type="datetime-local" className={input} value={ad.ends_at?.slice(0, 16) || ''} onChange={e => set('ends_at', e.target.value ? new Date(e.target.value).toISOString() : null)} /></Field>
            <Field label="Show to the same person at most every (hours)"><input type="number" min={1} className={input} value={ad.frequency_hours ?? 6} onChange={e => set('frequency_hours', +e.target.value)} /></Field>
            <Field label="Stop after impressions" hint="Budget. Empty = no limit"><input type="number" min={0} className={input} value={ad.max_impressions ?? ''} onChange={e => set('max_impressions', e.target.value ? +e.target.value : null)} /></Field>
            <Field label="Weight" hint="Higher wins more slots. House ads ~5, paid 10–50"><input type="number" min={1} className={input} value={ad.weight ?? 10} onChange={e => set('weight', +e.target.value)} /></Field>
            <Field label="Status">
              <select className={input} value={ad.status} onChange={e => set('status', e.target.value)}>
                {['draft', 'active', 'paused', 'ended'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2"><Field label="“Why am I seeing this?” text"><input className={input} value={ad.why_text || ''} onChange={e => set('why_text', e.target.value)} /></Field></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!ad.is_house} onChange={e => set('is_house', e.target.checked)} /> House ad (KChat promoting itself; fills empty slots)</label>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Preview ad={ad} />
            <p className="text-[11px] text-muted-foreground">How it looks in the feed</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button className="h-9 px-4 rounded-lg border border-border text-sm" onClick={onClose}>Cancel</button>
          <button className="h-9 px-4 rounded-lg bg-brand text-black text-sm font-semibold disabled:opacity-50" disabled={save.isPending} onClick={() => save.mutate()}>
            {ad.id ? 'Save' : 'Create campaign'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdsPage() {
  const qc = useQueryClient()
  const { data: ads = [], isLoading } = useQuery({ queryKey: ['ads'], queryFn: getAds, refetchInterval: 30000 })
  const [editing, setEditing] = useState<Partial<AdCampaign> | null>(null)
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdCampaign['status'] }) => (status === 'ended' ? endAd(id) : updateAd(id, { status })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ads'] }),
    onError: () => toast.error('Could not update'),
  })

  const live = ads.filter(a => a.status === 'active')
  const totals = ads.reduce((t, a) => ({ imp: t.imp + (a.stats?.impression || 0), clk: t.clk + (a.stats?.click || 0) }), { imp: 0, clk: 0 })

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Megaphone weight="duotone" className="text-brand" /> Ads</h1>
          <p className="text-sm text-muted-foreground">
            {live.length} live · {fmt(totals.imp)} impressions · {totals.imp ? ((100 * totals.clk) / totals.imp).toFixed(2) : '0'}% click rate.
            Ads appear in For You after the 4th post, then every 8 posts; at most 12 a day per person.
          </p>
        </div>
        <button className="h-9 px-4 rounded-lg bg-brand text-black text-sm font-semibold flex items-center gap-1.5" onClick={() => setEditing(EMPTY)}>
          <Plus weight="bold" /> New campaign
        </button>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : ads.length === 0 ? (
        <div className="card p-10 text-center text-sm text-muted-foreground">No campaigns yet.</div>
      ) : (
        <div className="grid gap-3">
          {ads.map(a => (
            <div key={a.id} className="card p-4 flex flex-col md:flex-row gap-4">
              <img src={a.media_url} className="w-24 h-[120px] rounded-lg object-cover bg-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold truncate">{a.headline}</p>
                  <StatusPill status={a.status} />
                  {a.is_house && <span className="px-2 py-0.5 rounded-full text-[11px] bg-accent text-muted-foreground">House</span>}
                </div>
                <p className="text-[13px] text-muted-foreground mt-0.5">{a.advertiser_name} · button “{a.cta_label}” → {a.cta_url}</p>
                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-[13px]">
                  <span className="flex items-center gap-1.5"><Eye className="text-muted-foreground" />{fmt(a.stats?.impression || 0)} impressions</span>
                  <span className="flex items-center gap-1.5"><Users className="text-muted-foreground" />{fmt(a.stats?.reach || 0)} people</span>
                  <span className="flex items-center gap-1.5"><CursorClick className="text-muted-foreground" />{fmt(a.stats?.click || 0)} clicks · {a.stats?.ctr || 0}%</span>
                  <span className="flex items-center gap-1.5"><EyeSlash className="text-muted-foreground" />{a.stats?.hide || 0} hidden</span>
                  <span className={cn('flex items-center gap-1.5', (a.stats?.report || 0) > 0 && 'text-red-400')}><Flag />{a.stats?.report || 0} reports</span>
                </div>
              </div>
              <div className="flex md:flex-col gap-2 shrink-0">
                <button className="h-8 px-3 rounded-lg border border-border text-[13px] flex items-center gap-1.5" onClick={() => setEditing(a)}><PencilSimple /> Edit</button>
                {a.status === 'active'
                  ? <button className="h-8 px-3 rounded-lg border border-border text-[13px] flex items-center gap-1.5" onClick={() => setStatus.mutate({ id: a.id, status: 'paused' })}><Pause /> Pause</button>
                  : a.status !== 'ended' && <button className="h-8 px-3 rounded-lg border border-border text-[13px] flex items-center gap-1.5" onClick={() => setStatus.mutate({ id: a.id, status: 'active' })}><Play /> Go live</button>}
                {a.status !== 'ended' && <button className="h-8 px-3 rounded-lg border border-border text-[13px] text-red-400 flex items-center gap-1.5" onClick={() => setStatus.mutate({ id: a.id, status: 'ended' })}><StopCircle /> End</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && <Editor initial={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
