-- ⚠️ RUN THIS CODE IN SUPABASE SQL EDITOR ⚠️

-- 1. CLEANUP (Drop old tables if they exist to start fresh)
DROP TABLE IF EXISTS part_requests CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TYPE IF EXISTS part_request_status CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;

-- 2. CREATE TYPES
CREATE TYPE part_request_status AS ENUM ('requested', 'ordered', 'received');
CREATE TYPE order_status AS ENUM ('draft', 'sent', 'received');

-- 3. CREATE ORDERS TABLE
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

-- 4. CREATE PART_REQUESTS TABLE
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

-- 5. ENABLE SECURITY (RLS)
ALTER TABLE part_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 6. SET PERMISSIONS (Allow everyone for now to avoid errors)
CREATE POLICY "Allow all access to part_requests" ON part_requests FOR ALL USING (true);
CREATE POLICY "Allow all access to orders" ON orders FOR ALL USING (true);

-- 7. NOTIFY SUPABASE OF CHANGES
NOTIFY pgrst, 'reload schema';
