-- Create enum for part request status
create type part_request_status as enum ('requested', 'ordered', 'received');

-- Create enum for order status
create type order_status as enum ('draft', 'sent', 'received');

-- Table: part_requests (individual part requests linked to devices)
create table part_requests (
  id uuid default gen_random_uuid() primary key,
  inventory_id uuid references inventory_items(id) on delete cascade,
  part_name text not null,
  part_number text,
  ai_description text, -- Raw AI text input
  status part_request_status default 'requested',
  order_id uuid, -- Links to orders table when ordered
  created_by text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: orders (bulk orders to suppliers)
create table orders (
  id uuid default gen_random_uuid() primary key,
  supplier text not null,
  status order_status default 'draft',
  created_by text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  sent_at timestamp with time zone,
  received_at timestamp with time zone,
  notes text
);

-- Enable RLS
alter table part_requests enable row level security;
alter table orders enable row level security;

-- Policies: Allow authenticated users full access
create policy "Enable all access for authenticated users" on part_requests
  for all using (true);

create policy "Enable all access for authenticated users" on orders
  for all using (true);

-- Function to update inventory status when all parts for a device are received
create or replace function update_inventory_on_parts_received()
returns trigger as $$
begin
  -- Check if all parts for this device are received
  if new.status = 'received' and old.status != 'received' then
    -- Count pending parts for this device
    declare
      pending_count int;
    begin
      select count(*) into pending_count
      from part_requests
      where inventory_id = new.inventory_id
        and status != 'received';
      
      -- If no pending parts, mark device as ready
      if pending_count = 0 then
        update inventory_items
        set status = 'ready_to_ship'
        where id = new.inventory_id;
      end if;
    end;
  end if;
  return new;
end;
$$ language plpgsql;

-- Trigger for auto-update
create trigger on_part_received
  after update on part_requests
  for each row
  execute function update_inventory_on_parts_received();

-- Function to update part requests when order is received
create or replace function update_parts_on_order_received()
returns trigger as $$
begin
  if new.status = 'received' and old.status != 'received' then
    update part_requests
    set status = 'received', updated_at = now()
    where order_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql;

-- Trigger for order received
create trigger on_order_received
  after update on orders
  for each row
  execute function update_parts_on_order_received();
