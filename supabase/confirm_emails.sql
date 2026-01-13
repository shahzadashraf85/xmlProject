-- Manually confirm email for all existing users
-- Run this in Supabase SQL Editor

-- Option 1: Confirm ALL users
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Option 2: Confirm a specific user by email
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'user@example.com'
AND email_confirmed_at IS NULL;

-- Option 3: Confirm a specific user by ID
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE id = 'user-uuid-here'
AND email_confirmed_at IS NULL;

-- Verify the update
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
ORDER BY created_at DESC;
