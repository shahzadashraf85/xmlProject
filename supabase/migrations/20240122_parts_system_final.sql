-- ⚠️ RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR ⚠️

-- 1. Reset: Drop existing tables/types to ensure clean slate
DROP TABLE IF EXISTS part_requests CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TYPE IF EXISTS part_request_status CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;

-- 2. Create Enums
CREATE TYPE part_request_status AS ENUM ('requested', 'ordered', 'received');
CREATE TYPE order_status AS ENUM ('draft', 'sent', 'received');

-- 3. Create 'orders' table
CREATE TABLE orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier text NOT NULL,
  status order_status DEFAULT 'draft',
  created_by text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  sent_at timestamp with time zone,
  received_at timestamp with time zone,
  notes text
);

-- 4. Create 'part_requests' table
CREATE TABLE part_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE,
  part_name text NOT NULL,
  part_number text,
  ai_description text,
  status part_request_status DEFAULT 'requested',
  order_id uuid REFERENCES orders(id),
  created_by text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE part_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 6. Create Security Policies (Allow everything for now to prevent permission errors)
CREATE POLICY "Allow all access to part_requests" ON part_requests FOR ALL USING (true);
CREATE POLICY "Allow all access to orders" ON orders FOR ALL USING (true);

-- 7. Create Functions & Triggers for Automation

-- Function: Auto-update inventory status when ALL parts are received
CREATE OR REPLACE FUNCTION update_inventory_on_parts_received()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run if status changed to 'received'
  IF new.status = 'received' AND old.status != 'received' THEN
    DECLARE
      pending_count int;
    BEGIN
      -- Check if there are any other parts for this device that are NOT received
      SELECT count(*) INTO pending_count
      FROM part_requests
      WHERE inventory_id = new.inventory_id
        AND status != 'received';
      
      -- If count is 0, it means ALL parts are now received
      IF pending_count = 0 THEN
        UPDATE inventory_items
        SET status = 'ready_to_ship'
        WHERE id = new.inventory_id;
      END IF;
    END;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_part_received
  AFTER UPDATE ON part_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_on_parts_received();

-- Function: Auto-update part requests when an Order is marked received
CREATE OR REPLACE FUNCTION update_parts_on_order_received()
RETURNS TRIGGER AS $$
BEGIN
  IF new.status = 'received' AND old.status != 'received' THEN
    UPDATE part_requests
    SET status = 'received', updated_at = now()
    WHERE order_id = new.id;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_order_received
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_parts_on_order_received();
