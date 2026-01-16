-- Inventory Management Tables

-- 1. Inventory Items Table
create table public.inventory_items (
    id uuid default gen_random_uuid() primary key,
    created_at timestamptz default now(),
    serial_number text unique not null,
    brand text not null,
    model text not null,
    specifications text, -- CPU, RAM, SSD, etc.
    grade text check (grade in ('A', 'B', 'C')) not null,
    repair_needed_description text, -- "what need to fix"
    status text default 'pending_triage' check (status in ('pending_triage', 'in_repair', 'ready_to_ship', 'scrapped')),
    updated_at timestamptz default now()
);

-- 2. Repair/Technician Sessions Table (Time Tracking)
create table public.repair_sessions (
    id uuid default gen_random_uuid() primary key,
    inventory_id uuid references public.inventory_items(id) on delete cascade not null,
    technician_id uuid references auth.users(id) not null,
    started_at timestamptz default now() not null,
    ended_at timestamptz,
    work_notes text
);

-- 3. Enable RLS
alter table public.inventory_items enable row level security;
alter table public.repair_sessions enable row level security;

-- 4. Policies (Allow full access to authenticated staff)
create policy "Staff can view inventory" on public.inventory_items for select using (auth.role() = 'authenticated');
create policy "Staff can insert inventory" on public.inventory_items for insert with check (auth.role() = 'authenticated');
create policy "Staff can update inventory" on public.inventory_items for update using (auth.role() = 'authenticated');
create policy "Staff can delete inventory" on public.inventory_items for delete using (auth.role() = 'authenticated');

create policy "Staff can view sessions" on public.repair_sessions for select using (auth.role() = 'authenticated');
create policy "Staff can insert sessions" on public.repair_sessions for insert with check (auth.role() = 'authenticated');
create policy "Staff can update sessions" on public.repair_sessions for update using (auth.role() = 'authenticated');
