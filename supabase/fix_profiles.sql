-- Quick fix: Create profile for existing users
-- Run this in Supabase SQL Editor if you're getting auth errors

-- First, check if profiles exist
SELECT * FROM public.profiles;

-- If no profiles exist, create one for your user
-- Replace 'your-email@example.com' with your actual email
INSERT INTO public.profiles (id, role, created_at)
SELECT id, 'admin', NOW()
FROM auth.users
WHERE email = 'your-email@example.com'
ON CONFLICT (id) DO NOTHING;

-- Or create profiles for ALL existing users
INSERT INTO public.profiles (id, role, created_at)
SELECT id, 'employee', NOW()
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- Verify profiles were created
SELECT u.email, p.role, p.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;
