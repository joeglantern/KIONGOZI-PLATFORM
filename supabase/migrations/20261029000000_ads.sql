-- In-feed ads (Instagram / X style): campaigns + events (impression, click, hide, report).
-- House ads (KChat promoting itself) fill empty slots; paid campaigns outrank them.

create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  advertiser_name text not null,
  advertiser_avatar_url text,
  headline text not null,
  body text,
  media_url text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  thumbnail_url text,
  width int,
  height int,
  placeholder text,
  cta_label text not null default 'Learn more',
  -- https://… opens in the in-app browser; kchat://invite | ai | recap | story | profile/<username> opens a screen
  cta_url text not null,
  is_house boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'ended')),
  -- higher wins a slot more often (paid campaigns > house ads)
  weight int not null default 10,
  starts_at timestamptz,
  ends_at timestamptz,
  -- per-person frequency: the same ad shows at most once per this many hours
  frequency_hours int not null default 6,
  -- optional stop after this many impressions in total (budget)
  max_impressions int,
  why_text text default 'This ad is shown to people on KChat in Kenya.',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ad_campaigns_live_idx on public.ad_campaigns (status, starts_at, ends_at);

create table if not exists public.ad_events (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('impression', 'click', 'hide', 'report')),
  created_at timestamptz not null default now()
);

create index if not exists ad_events_campaign_kind_idx on public.ad_events (campaign_id, kind);
create index if not exists ad_events_user_recent_idx on public.ad_events (user_id, created_at desc);

-- Only the API (service role) touches these
alter table public.ad_campaigns enable row level security;
alter table public.ad_events enable row level security;
