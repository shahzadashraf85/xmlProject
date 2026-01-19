-- FIX: Enable Users to Delete their own History Records
-- Run this script in the Supabase SQL Editor

-- 1. Ensure RLS is enabled for the table
ALTER TABLE orders_imports ENABLE ROW LEVEL SECURITY;

-- 2. Create the DELETE policy (Users can delete rows where they are the owner)
DROP POLICY IF EXISTS "Users can delete own records" ON orders_imports;

CREATE POLICY "Users can delete own records"
ON orders_imports
FOR DELETE
USING (auth.uid() = user_id);

-- 3. Ensure SELECT/INSERT policies exist (just in case)
DROP POLICY IF EXISTS "Users can view own records" ON orders_imports;
CREATE POLICY "Users can view own records"
ON orders_imports FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own records" ON orders_imports;
CREATE POLICY "Users can insert own records"
ON orders_imports FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. Admin Policy (Admins can do everything)
DROP POLICY IF EXISTS "Admins can manage all records" ON orders_imports;
CREATE POLICY "Admins can manage all records"
ON orders_imports
FOR ALL
USING (
  EXISTS (a
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
