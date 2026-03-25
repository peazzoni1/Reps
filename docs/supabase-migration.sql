-- Supabase Migration: Reps App Persistence
-- Run once in Supabase dashboard > SQL Editor

-- Movement Sessions
create table if not exists movement_sessions (
  id text primary key,
  user_id uuid references auth.users not null,
  type text not null,
  feelings text[] not null default '{}',
  label text not null,
  date timestamptz not null,
  note text,
  workout_details jsonb
);
alter table movement_sessions enable row level security;
create policy "Users own their movement sessions" on movement_sessions
  for all using (auth.uid() = user_id);

-- Food Entries
create table if not exists food_entries (
  id text primary key,
  user_id uuid references auth.users not null,
  date timestamptz not null,
  description text not null,
  meal text
);
alter table food_entries enable row level security;
create policy "Users own their food entries" on food_entries
  for all using (auth.uid() = user_id);

-- Coach Sessions
create table if not exists coach_sessions (
  id text primary key,
  user_id uuid references auth.users not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  messages jsonb not null default '[]',
  memory_summary jsonb
);
alter table coach_sessions enable row level security;
create policy "Users own their coach sessions" on coach_sessions
  for all using (auth.uid() = user_id);

-- User Preferences
create table if not exists user_preferences (
  user_id uuid primary key references auth.users not null,
  custom_tags text[] not null default '{}',
  custom_movement_types jsonb not null default '[]',
  activity_preferences jsonb not null default '[]'
);
alter table user_preferences enable row level security;
create policy "Users own their preferences" on user_preferences
  for all using (auth.uid() = user_id);

-- User Profiles
create table if not exists user_profiles (
  user_id uuid primary key references auth.users not null,
  first_name text,
  last_name text,
  sex text,
  birthdate date,
  subscription_tier text default 'free',
  subscription_status text default 'inactive',
  revenue_cat_user_id text,
  subscription_expires_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table user_profiles enable row level security;
create policy "Users own their profiles" on user_profiles
  for all using (auth.uid() = user_id);
create index if not exists idx_user_profiles_revenue_cat on user_profiles(revenue_cat_user_id);

-- Daily Check-In Usage Tracking (HomeScreen AI Coach card)
-- Tracks HomeScreen daily check-ins (3 per week for free users)
-- Note: Chat screen has separate 10 messages/day limit (tracked client-side)
create table if not exists daily_checkin_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  week_start_date date not null,
  checkin_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, week_start_date)
);
alter table daily_checkin_usage enable row level security;
create policy "Users own their daily check-in usage" on daily_checkin_usage
  for all using (auth.uid() = user_id);
create index if not exists idx_daily_checkin_usage_user_week on daily_checkin_usage(user_id, week_start_date);
