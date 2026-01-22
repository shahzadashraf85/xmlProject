-- Create a new table for managing part requests
create type part_status as enum ('requested', 'ordered', 'received');

create table part_requests (
  id uuid default gen_random_uuid() primary key,
  inventory_id uuid references inventory_items(id) on delete cascade,
  part_name text not null,
  part_number text,
  supplier text,
  status part_status default 'requested',
  notes text,
  created_by text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  ordered_at timestamp with time zone,
  received_at timestamp with time zone
);

-- Enable RLS
alter table part_requests enable row level security;

-- Policy: Allow everyone to read/write for now (adjust as needed)
create policy "Enable all access for authenticated users" on part_requests
  for all using (auth.role() = 'authenticated');

-- Function to update inventory status when part is received
create or replace function update_inventory_status_on_receive()
returns trigger as $$
begin
  if new.status = 'received' and old.status != 'received' then
    update inventory_items
    set status = 'ready_to_ship' -- Or 'in_repair' depending on workflow
    where id = new.inventory_id;
  end if;
  return new;
end;
$$ language plpgsql;

-- Trigger for auto-update
create trigger on_part_received
  after update on part_requests
  for each row
  execute function update_inventory_status_on_receive();
