-- Add comments column to inventory_items
alter table inventory_items 
add column if not exists comments text;

-- Notify schema reload
notify pgrst, 'reload schema';
