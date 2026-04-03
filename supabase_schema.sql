-- Zen-app Supabase Schema Migration

-- Run this entirely inside the Supabase SQL Editor to create the necessary tables
-- and Row Level Security (RLS) policies for your app.

-- 1. Create a `profiles` table that extends the built-in `auth.users` table
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  role text default 'Zen Practitioner',
  bio text default ''
);

-- Turn on Row Level Security for profiles
alter table profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- 2. Create the `tasks` table (replaces AsyncStorage "@todo_tasks")
create table tasks (
  id text primary key, -- Use text because currently using Date.now()-random string
  user_id uuid references auth.users not null,
  text text not null,
  completed boolean default false,
  category text not null check (category in ('today', 'later')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table tasks enable row level security;
create policy "Users can view their own tasks" on tasks for select using (auth.uid() = user_id);
create policy "Users can insert their own tasks" on tasks for insert with check (auth.uid() = user_id);
create policy "Users can update their own tasks" on tasks for update using (auth.uid() = user_id);
create policy "Users can delete their own tasks" on tasks for delete using (auth.uid() = user_id);

-- 3. Create the `routines` table (replaces AsyncStorage "@zen_routine")
create table routines (
  id text primary key,
  user_id uuid references auth.users not null,
  time text not null,
  task text not null,
  description text,
  image_key text,
  insertion_order integer,
  duration integer default 30,
  days_of_week integer[] default '{}',
  date text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table routines enable row level security;
create policy "Users can view their own routines" on routines for select using (auth.uid() = user_id);
create policy "Users can insert their own routines" on routines for insert with check (auth.uid() = user_id);
create policy "Users can update their own routines" on routines for update using (auth.uid() = user_id);
create policy "Users can delete their own routines" on routines for delete using (auth.uid() = user_id);

-- Optional: Create a trigger that inserts a profile when a new user signs up in Auth
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Create the `user_settings` table (replaces AsyncStorage "@zen_user_settings_v2")
create table if not exists user_settings (
  id uuid references auth.users not null primary key,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table user_settings enable row level security;
create policy "Users can view their own settings" on user_settings for select using (auth.uid() = id);
create policy "Users can insert their own settings" on user_settings for insert with check (auth.uid() = id);
create policy "Users can update their own settings" on user_settings for update using (auth.uid() = id);

-- 5. Create the `user_themes` table (Syncs ThemeContext)
create table if not exists user_themes (
  id uuid references auth.users not null primary key,
  active_theme text default 'default',
  is_dark_mode boolean default true,
  auto_theme boolean default false,
  custom_themes jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table user_themes enable row level security;
create policy "Users can view their own themes" on user_themes for select using (auth.uid() = id);
create policy "Users can insert their own themes" on user_themes for insert with check (auth.uid() = id);
create policy "Users can update their own themes" on user_themes for update using (auth.uid() = id);

-- 6. Create the `user_stats` table (replaces AsyncStorage "@zen_stats")
create table if not exists user_stats (
  id uuid references auth.users not null primary key,
  total_focus_minutes integer default 0,
  tasks_completed integer default 0,
  sessions_completed integer default 0,
  current_streak integer default 0,
  best_streak integer default 0,
  history jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table user_stats enable row level security;
create policy "Users can view their own stats" on user_stats for select using (auth.uid() = id);
create policy "Users can insert their own stats" on user_stats for insert with check (auth.uid() = id);
create policy "Users can update their own stats" on user_stats for update using (auth.uid() = id);
