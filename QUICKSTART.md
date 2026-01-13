# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Supabase

1. **Create a Supabase Project**
   - Go to https://supabase.com
   - Click "New Project"
   - Fill in project details and wait for setup

2. **Run Database Migration**
   - In Supabase Dashboard → SQL Editor
   - Copy and run `supabase/migrations/001_initial_setup.sql`

3. **Create Storage Buckets**
   - In Supabase Dashboard → Storage
   - Create bucket: `imports` (public or private)
   - Create bucket: `exports` (public or private)

4. **Set Storage Policies**
   - For both buckets, add these policies in the Storage settings:
   
   **INSERT Policy:**
   ```sql
   auth.uid() = (storage.foldername(name))[1]
   ```
   
   **SELECT Policy (for exports bucket):**
   ```sql
   auth.uid() = (storage.foldername(name))[1] OR 
   (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
   ```

### Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Get your Supabase credentials:
   - In Supabase Dashboard → Settings → API
   - Copy **Project URL** and **anon/public key**

3. Update `.env`:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...
   ```

### Step 4: Run the App
```bash
npm run dev
```

Open http://localhost:5173 in your browser!

### Step 5: Create Your First User

1. Click "Sign Up"
2. Enter email and password
3. Check your email for confirmation (if email confirmation is enabled)
4. Sign in and start using the app!

### Optional: Create an Admin User

After registering, promote your user to admin:

1. Go to Supabase Dashboard → SQL Editor
2. Run:
   ```sql
   UPDATE public.profiles 
   SET role = 'admin' 
   WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
   ```

## 📝 Using the App

1. **Upload** an Excel or CSV file with your orders
2. **Configure** settings (service code, dimensions, weight, etc.)
3. **Validate** your data
4. **Generate** the XML file
5. **Download** or **Save to Supabase**
6. View your **History** anytime!

## 🎯 Sample Data

See `SAMPLE_TEMPLATE.md` for Excel/CSV format examples.

## 🆘 Troubleshooting

**Can't connect to Supabase?**
- Double-check your `.env` file
- Ensure your Supabase project is active

**Storage upload fails?**
- Verify buckets are created
- Check storage policies are set correctly

**Validation errors?**
- Ensure required fields are present: ContactName, AddressLine1, City, Province, PostalCode, Country

## 📚 Full Documentation

See `README.md` for complete documentation.

---

**Need Help?** Open an issue on GitHub or check the README for more details.
