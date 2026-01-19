-- Create a table to track local message states (read/unread)
create table if not exists public.message_states (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  mirakl_message_id text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure unique tracking per message per user
  unique(user_id, mirakl_message_id)
);

-- Enable RLS
alter table public.message_states enable row level security;

-- Policies
create policy "Users can view their own message states"
  on public.message_states for select
  using (auth.uid() = user_id);

create policy "Users can insert/update their own message states"
  on public.message_states for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own message states"
  on public.message_states for update
  using (auth.uid() = user_id);
