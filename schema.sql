create extension if not exists pgcrypto;

create table if not exists public.chat_messages (
  id text primary key,
  created_at timestamptz not null default now(),
  listener_name text not null check (char_length(listener_name) between 1 and 36),
  body text not null default '',
  gif_url text,
  media_url text,
  reply_to text references public.chat_messages(id) on delete set null,
  reactions jsonb not null default '{}'::jsonb
);

create table if not exists public.song_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  listener_name text not null,
  song_title text not null,
  artist text not null,
  dedication text,
  status text not null default 'new' check (status in ('new', 'seen', 'played', 'archived'))
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  body text not null,
  link_url text,
  link_label text,
  category text not null default 'announcement' check (category in ('event', 'appearance', 'theme', 'announcement')),
  event_date timestamptz,
  is_featured boolean not null default false
);

create table if not exists public.show_settings (
  id integer primary key default 1,
  live_mode boolean not null default false,
  live_title text not null default 'Livin'' Like Kenny',
  live_note text not null default 'The chat stays open, the drinks stay cold, and the requests are ready for showtime.',
  updated_at timestamptz not null default now(),
  constraint single_settings_row check (id = 1)
);

insert into public.show_settings (id) values (1) on conflict (id) do nothing;

alter table public.chat_messages enable row level security;
alter table public.song_requests enable row level security;
alter table public.announcements enable row level security;
alter table public.show_settings enable row level security;

create policy "Anyone can read chat" on public.chat_messages for select using (true);
create policy "Anyone can post chat" on public.chat_messages for insert with check (true);
create policy "Anyone can react to chat" on public.chat_messages for update using (true) with check (true);

create policy "Anyone can submit song requests" on public.song_requests for insert with check (true);
create policy "Dashboard can read song requests" on public.song_requests for select using (true);
create policy "Dashboard can update song request status" on public.song_requests for update using (true) with check (true);

create policy "Anyone can read announcements" on public.announcements for select using (true);
create policy "Dashboard can post announcements" on public.announcements for insert with check (true);
create policy "Dashboard can update announcements" on public.announcements for update using (true) with check (true);

create policy "Anyone can read show settings" on public.show_settings for select using (true);
create policy "Dashboard can insert show settings" on public.show_settings for insert with check (true);
create policy "Dashboard can edit show settings" on public.show_settings for update using (true) with check (true);

-- In Supabase: Database > Replication, enable realtime for:
-- chat_messages, song_requests, announcements, show_settings
--
-- This schema is intentionally no-login/no-account to match the launch requirement.
-- Before a large public launch, move admin mutations behind server routes or Supabase Edge Functions.
