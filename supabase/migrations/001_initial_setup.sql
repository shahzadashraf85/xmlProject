-- EST XML Generator Database Setup
-- Run this in your Supabase SQL Editor

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'employee')) DEFAULT 'employee',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create orders_imports table
CREATE TABLE IF NOT EXISTS public.orders_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source_filename TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  service_code TEXT NOT NULL DEFAULT 'DOM.EP',
  xml_storage_path TEXT NOT NULL,
  source_storage_path TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 3. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders_imports ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for profiles
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Create RLS Policies for orders_imports
-- Users can insert their own records
CREATE POLICY "Users can insert own records"
  ON public.orders_imports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own records
CREATE POLICY "Users can view own records"
  ON public.orders_imports
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all records
CREATE POLICY "Admins can view all records"
  ON public.orders_imports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'employee');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 8. Create storage buckets (run these in the Supabase Storage UI or via API)
-- You'll need to create these buckets manually in Supabase Dashboard:
-- Bucket name: "imports" (for uploaded Excel/CSV files)
-- Bucket name: "exports" (for generated XML files)

-- 9. Storage bucket policies
-- For "imports" bucket:
-- Allow authenticated users to upload to their own folder
-- Policy: INSERT - auth.uid() = (storage.foldername(name))[1]

-- For "exports" bucket:
-- Allow authenticated users to upload to their own folder
-- Policy: INSERT - auth.uid() = (storage.foldername(name))[1]
-- Allow users to read their own files
-- Policy: SELECT - auth.uid() = (storage.foldername(name))[1]
-- Allow admins to read all files
-- Policy: SELECT - (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'

-- 10. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_imports_user_id ON public.orders_imports(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_imports_created_at ON public.orders_imports(created_at DESC);

-- NOTES:
-- 1. After running this script, create the storage buckets in Supabase Dashboard
-- 2. Set up storage policies as described above
-- 3. To create an admin user, update their profile:
--    UPDATE public.profiles SET role = 'admin' WHERE id = 'user_uuid_here';
