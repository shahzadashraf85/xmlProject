-- Upgrade Inventory Schema for Detailed Specs

-- 1. Add Device Type
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS device_type text DEFAULT 'laptop' CHECK (device_type IN ('laptop', 'desktop'));

-- 2. Add structured specs (JSONB is best for flexible fields)
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS specs jsonb DEFAULT '{}'::jsonb;

-- 3. Migrate old 'specifications' text to 'specs' generic field if needed
-- (Optional: UPDATE inventory_items SET specs = jsonb_build_object('notes', specifications) WHERE specifications IS NOT NULL;)

-- 4. Drop old column eventually, but let's keep it for safety for now, or just ignore it.

-- 5. Ensure technicians can UPDATE these fields (RLS policies already exist for update, so we are good).
