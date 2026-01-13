-- Reset password for admin@laptek.ca
-- Note: This requires the pgcrypto extension, which is standard in Supabase.

UPDATE auth.users
SET encrypted_password = crypt('password', gen_salt('bf'))
WHERE email = 'admin@laptek.ca';

-- Confirm the update (optional, just checks if user exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@laptek.ca') THEN
        RAISE NOTICE 'User admin@laptek.ca not found!';
    END IF;
END $$;
