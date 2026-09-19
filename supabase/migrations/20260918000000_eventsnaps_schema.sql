create extension if not exists pgcrypto;

create table if not exists public.plans (
  id text primary key,
  name text not null,
  features jsonb not null default '{}'::jsonb,
  price numeric not null default 0
);

create table if not exists public.user_profiles (
  id uuid primary key,
  email text not null,
  role text not null default 'user',
  plan_id text not null default 'basic' references public.plans(id),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  full_name text,
  instagram_username text,
  custom_logo_url text
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  code varchar(6) unique not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  creator_id text not null default 'anonymous',
  moderation_enabled boolean not null default false,
  status varchar(10) not null default 'active',
  title text not null default '',
  theme text not null default 'default',
  landing_config jsonb not null default '{}'::jsonb,
  archived boolean not null default false,
  archive_expires_at timestamptz
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  description text,
  prize text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  storage_path text not null,
  storage_url text,
  caption text,
  status varchar(10) not null default 'pending',
  uploaded_by text not null default 'anonymous',
  uploaded_at timestamptz not null default now(),
  enhanced_url text,
  ai_metadata jsonb default '{}'::jsonb,
  challenge_id uuid references public.challenges(id) on delete set null
);

create table if not exists public.moderation_queues (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  queued_at timestamptz not null default now(),
  gemini_suggestion text,
  confidence_score numeric,
  processed boolean not null default false,
  error_message text
);

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  moderator_id text not null default 'anonymous',
  action text not null,
  reason text,
  actioned_at timestamptz not null default now()
);

create table if not exists public.jukebox_settings (
  event_id uuid primary key references public.events(id) on delete cascade,
  is_active boolean not null default true,
  vibe_filters text[] default '{}',
  spotify_playlist_id text,
  provider varchar(10) not null default 'spotify',
  created_at timestamptz not null default now()
);

create table if not exists public.jukebox_queue (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  track_id text not null,
  spotify_track_id text default '' not null,
  title text not null,
  artist text not null,
  album_art text,
  genre text,
  votes integer not null default 0,
  voters jsonb default '[]'::jsonb,
  status varchar(10) not null default 'pending',
  provider varchar(10) not null default 'spotify',
  created_at timestamptz not null default now(),
  preview_url text
);

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  plan_id text not null references public.plans(id),
  status text not null default 'trialing' check (status in ('active', 'trialing', 'past_due', 'canceled')),
  external_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.photo_reactions (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  session_id text not null,
  emoji text not null default '❤️',
  created_at timestamptz default now(),
  unique(photo_id, session_id, emoji)
);

create table if not exists public.event_recaps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  status text default 'pending',
  video_url text,
  music_track text,
  created_at timestamptz default now()
);

create table if not exists public.live_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  author_name text not null default 'Anonymous',
  message text not null,
  is_approved boolean default true,
  created_at timestamptz default now()
);

alter table public.plans enable row level security;
alter table public.user_profiles enable row level security;
alter table public.events enable row level security;
alter table public.photos enable row level security;
alter table public.moderation_queues enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.jukebox_settings enable row level security;
alter table public.jukebox_queue enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.admin_config enable row level security;
alter table public.challenges enable row level security;
alter table public.photo_reactions enable row level security;
alter table public.event_recaps enable row level security;
alter table public.live_messages enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['plans','user_profiles','events','photos','moderation_queues','moderation_actions','jukebox_settings','jukebox_queue','user_subscriptions','admin_config','challenges','photo_reactions','event_recaps','live_messages'] loop
    execute format('drop policy if exists "public access" on public.%I', table_name);
    execute format('create policy "public access" on public.%I for all using (true) with check (true)', table_name);
  end loop;
end $$;

insert into public.plans (id, name, features, price) values
  ('trial_pro', 'Trial Pro (24h)', '{"gallery":true,"tv_mode":true,"playlist":true,"white_label":true,"max_storage_gb":10}', 0),
  ('basic', 'Básico', '{"gallery":false,"playlist":true,"tv_mode":false,"white_label":false,"max_storage_gb":0.5}', 50000),
  ('pro', 'Pro', '{"gallery":true,"playlist":true,"tv_mode":true,"white_label":true,"max_storage_gb":10}', 100000)
on conflict (id) do nothing;