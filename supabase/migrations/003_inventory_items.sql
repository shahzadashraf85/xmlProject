-- Inventory Items Table for Device Registration
-- Run this in your Supabase SQL Editor

-- 1. Create inventory_items table
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand TEXT NOT NULL DEFAULT 'Unknown',
    model TEXT NOT NULL,
    serial_number TEXT NOT NULL UNIQUE,
    device_type TEXT DEFAULT 'LAPTOP',
    grade TEXT CHECK (grade IN ('A', 'B', 'C')) DEFAULT 'B',
    specs JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'pending_triage',
    location TEXT DEFAULT 'Receiving',
    repair_needed_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create repair_sessions table for technician work tracking
CREATE TABLE IF NOT EXISTS public.repair_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    technician_id UUID REFERENCES auth.users(id),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    work_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Row Level Security
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_sessions ENABLE ROW LEVEL SECURITY;

-- 4. Create OPEN policies for inventory_items (allow anyone to insert/read for now)
-- This allows the PowerShell script to work without authentication
CREATE POLICY "Allow public insert to inventory_items"
    ON public.inventory_items
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public select from inventory_items"
    ON public.inventory_items
    FOR SELECT
    USING (true);

CREATE POLICY "Allow public update to inventory_items"
    ON public.inventory_items
    FOR UPDATE
    USING (true);

-- 5. Create policies for repair_sessions (authenticated users only)
CREATE POLICY "Authenticated users can insert repair sessions"
    ON public.repair_sessions
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view repair sessions"
    ON public.repair_sessions
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update repair sessions"
    ON public.repair_sessions
    FOR UPDATE
    USING (auth.uid() IS NOT NULL);

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_serial ON public.inventory_items(serial_number);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON public.inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_brand ON public.inventory_items(brand);
CREATE INDEX IF NOT EXISTS idx_repair_sessions_inventory ON public.repair_sessions(inventory_id);

-- 7. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger for updated_at
DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON public.inventory_items;
CREATE TRIGGER update_inventory_items_updated_at
    BEFORE UPDATE ON public.inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- SUCCESS! The inventory_items table is now ready.
-- You can now use the REGISTER-DEVICE script to add devices.
