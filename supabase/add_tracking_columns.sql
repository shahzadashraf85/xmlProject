-- Add columns to store Canada Post response data
ALTER TABLE public.orders_imports 
ADD COLUMN IF NOT EXISTS tracking_number text,
ADD COLUMN IF NOT EXISTS label_url text,
ADD COLUMN IF NOT EXISTS shipment_id text;

-- Optional: Add status column if you want to track status locally
-- ALTER TABLE public.orders_imports ADD COLUMN IF NOT EXISTS shipment_status text;
