-- Simple fix: Just create profiles for existing users
-- Run this in Supabase SQL Editor

-- Create profiles for all users that don't have one yet
INSERT INTO public.profiles (id, role, created_at)
SELECT id, 'employee', NOW()
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- Verify it worked
SELECT u.email, p.role, p.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;
