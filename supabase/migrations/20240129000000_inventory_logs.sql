-- Create inventory_logs table
create table if not exists inventory_logs (
  id uuid default uuid_generate_v4() primary key,
  inventory_id uuid references inventory_items(id) on delete cascade not null,
  action text not null, -- e.g. 'status_change', 'edit', 'return'
  details jsonb default '{}'::jsonb, -- e.g. { old_status: 'shipped', new_status: 'returned' }
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id)
);

-- Enable RLS
alter table inventory_logs enable row level security;

-- Policies
create policy "Enable read access for all users" on inventory_logs for select using (true);
create policy "Enable insert access for authenticated users" on inventory_logs for insert with check (auth.role() = 'authenticated');
