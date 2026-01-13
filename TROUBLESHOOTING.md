# Troubleshooting Guide

## Issue 1: AI Mapping Error (FIXED ✅)

**Error**: `models/gemini-pro is not found`

**Solution**: Updated to use `gemini-1.5-flash` model (latest version)

**Status**: ✅ Fixed - refresh your browser and try again!

---

## Issue 2: Auth Error - "Error fetching user role"

**Error**: `Failed to load resource: the server responded with a status of 500`

**Cause**: Your user doesn't have a profile in the `profiles` table yet.

### Solution: Run This SQL in Supabase

1. **Go to Supabase Dashboard** → SQL Editor
2. **Run this query**:

```sql
-- Create profile for all existing users
INSERT INTO public.profiles (id, role, created_at)
SELECT id, 'employee', NOW()
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
```

3. **Verify it worked**:

```sql
SELECT u.email, p.role, p.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;
```

You should see your user with a role.

### Alternative: Make Sure Migration Ran

If the `profiles` table doesn't exist:

1. **Go to Supabase Dashboard** → SQL Editor
2. **Copy and run** the entire `supabase/migrations/001_initial_setup.sql` file
3. **Refresh** your browser

---

## Quick Test

After fixing:

1. **Refresh** your browser at http://localhost:5173
2. **Login** again
3. **Enable** AI toggle (🤖 Use AI-Powered Column Mapping)
4. **Upload** your Excel file
5. **Success!** ✨

---

## Still Having Issues?

### Check Supabase Setup

Run this in Supabase SQL Editor to verify everything:

```sql
-- 1. Check if profiles table exists
SELECT * FROM public.profiles LIMIT 5;

-- 2. Check if your user has a profile
SELECT u.email, p.role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'your-email@example.com';

-- 3. Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';
```

### Check Environment Variables

```bash
cat .env
```

Should show:
- ✅ VITE_SUPABASE_URL
- ✅ VITE_SUPABASE_ANON_KEY
- ✅ VITE_GEMINI_API_KEY

---

## Common Issues

### "Please set VITE_GEMINI_API_KEY"
- Make sure `.env` file exists
- Restart dev server: `npm run dev`

### "AI mapping failed"
- Check API key is valid
- Check internet connection
- Try again (might be rate limit)

### "Contact Name is required" errors
- AI mapping worked, but data is missing
- Check your Excel file has data in those columns
- Try manual mapping (uncheck AI toggle)

---

**Need more help?** Check the README.md or AI_MAPPING_GUIDE.md
