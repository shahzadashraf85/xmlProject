# Setup Checklist

Use this checklist to ensure your EST XML Generator is properly configured.

## ✅ Initial Setup

- [ ] **Dependencies Installed**
  ```bash
  npm install
  ```

- [ ] **Build Test Passed**
  ```bash
  npm run build
  ```
  Should complete without errors.

## ✅ Supabase Configuration

- [ ] **Supabase Project Created**
  - Created at https://supabase.com
  - Project is active and running

- [ ] **Database Migration Executed**
  - Opened Supabase SQL Editor
  - Ran `supabase/migrations/001_initial_setup.sql`
  - No errors reported

- [ ] **Storage Buckets Created**
  - Created bucket: `imports`
  - Created bucket: `exports`

- [ ] **Storage Policies Set**
  - INSERT policy for `imports` bucket
  - INSERT policy for `exports` bucket
  - SELECT policy for `exports` bucket (user files)
  - SELECT policy for `exports` bucket (admin access)

- [ ] **Environment Variables Configured**
  - Copied `.env.example` to `.env`
  - Set `VITE_SUPABASE_URL`
  - Set `VITE_SUPABASE_ANON_KEY`

## ✅ Application Testing

- [ ] **Dev Server Runs**
  ```bash
  npm run dev
  ```
  Opens at http://localhost:5173

- [ ] **Login Page Loads**
  - Navigate to http://localhost:5173
  - Login/Register form displays

- [ ] **User Registration Works**
  - Create a new account
  - Check email for confirmation (if enabled)
  - Can sign in

- [ ] **Dashboard Accessible**
  - After login, redirects to dashboard
  - Upload section visible
  - Settings panel visible

- [ ] **File Upload Works**
  - Can select Excel/CSV file
  - File parses successfully
  - Data preview shows

- [ ] **Validation Works**
  - Click "Validate" button
  - Errors display for invalid data
  - Success message for valid data

- [ ] **XML Generation Works**
  - Click "Generate XML"
  - Success message appears
  - Download button appears

- [ ] **XML Download Works**
  - Click "Download XML"
  - File downloads as `est_shipping_entry.xml`
  - XML is valid and well-formed

- [ ] **Supabase Save Works**
  - Click "Save to Supabase"
  - Success message appears
  - No errors in console

- [ ] **History Page Works**
  - Navigate to History page
  - Previous conversion shows
  - Can download XML from history

- [ ] **Logout Works**
  - Click "Sign Out"
  - Redirects to login page
  - Cannot access protected routes

## ✅ Admin Features (Optional)

- [ ] **Admin User Created**
  - Promoted user to admin via SQL:
    ```sql
    UPDATE public.profiles 
    SET role = 'admin' 
    WHERE id = 'user-uuid';
    ```

- [ ] **Admin Can See All History**
  - Login as admin
  - History page shows all users' conversions

## ✅ Production Readiness

- [ ] **Build Succeeds**
  ```bash
  npm run build
  ```
  No TypeScript errors

- [ ] **Environment Variables Set**
  - Production Supabase URL configured
  - Production Supabase key configured

- [ ] **Deployment Platform Chosen**
  - Vercel / Netlify / Other
  - Environment variables set in platform

- [ ] **Domain Configured** (if applicable)
  - Custom domain added
  - DNS configured
  - SSL certificate active

## ✅ Security Verification

- [ ] **RLS Enabled**
  - Check in Supabase: Tables → profiles → RLS enabled
  - Check in Supabase: Tables → orders_imports → RLS enabled

- [ ] **Storage Policies Active**
  - Users can only access their own files
  - Admins can access all files

- [ ] **No Secrets in Code**
  - `.env` file in `.gitignore`
  - No hardcoded credentials

- [ ] **HTTPS Enabled**
  - Production site uses HTTPS
  - No mixed content warnings

## ✅ Documentation Review

- [ ] **README.md** - Read and understood
- [ ] **QUICKSTART.md** - Followed successfully
- [ ] **DEPLOYMENT.md** - Deployment strategy chosen
- [ ] **SAMPLE_TEMPLATE.md** - Excel format understood
- [ ] **PROJECT_SUMMARY.md** - Architecture understood

## 🎉 Ready to Use!

Once all items are checked, your EST XML Generator is ready for production use!

## 📝 Notes

Use this space for any custom notes or configurations:

```
Date Completed: _______________
Deployed URL: _______________
Admin Email: _______________
Notes:



```

---

**Need Help?** Refer to the documentation files or open an issue on GitHub.
