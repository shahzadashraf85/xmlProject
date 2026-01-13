-- Add parsed_data column to store the JSON rows for history/reprinting
ALTER TABLE public.orders_imports 
ADD COLUMN IF NOT EXISTS parsed_data JSONB;
