-- Drop ALL existing policies on profiles to clear the recursion
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 1. Simple, non-recursive policy for viewing own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- 2. Allow users to update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- 3. Allow inserting a profile during signup (if triggers fail)
CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Fix permissions for orders_imports as well just in case
ALTER TABLE public.orders_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own imports" ON public.orders_imports;
CREATE POLICY "Users can view own imports" 
ON public.orders_imports 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own imports" ON public.orders_imports;
CREATE POLICY "Users can insert own imports" 
ON public.orders_imports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);
