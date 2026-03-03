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
