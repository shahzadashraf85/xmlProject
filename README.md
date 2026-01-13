# EST XML Generator

A production-ready React web application that converts Excel/CSV order files into Canada Post EST Desktop 2.0 Shipping Entry XML files.

## Features

- 🔐 **Authentication**: Supabase-based email/password authentication with role-based access control (Admin/Employee)
- 📊 **Excel/CSV Parsing**: Intelligent column mapping and data parsing using the `xlsx` library
- ✅ **Validation**: Comprehensive row-level validation with error reporting
- 🎯 **XML Generation**: Generates Canada Post EST Desktop 2.0 compliant XML files
- ⚙️ **Customizable Settings**: Configure service codes, dimensions, weights, notifications, and quantity handling
- 💾 **Cloud Storage**: Automatic upload of source files and generated XML to Supabase Storage
- 📜 **History Tracking**: View past conversions with role-based access (employees see their own, admins see all)
- 🎨 **Clean UI**: Modern, responsive interface built with Tailwind CSS

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Excel Parsing**: xlsx library

## Prerequisites

- Node.js 18+ and npm
- A Supabase account and project

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd /Users/sh/Documents/Laptekexport
npm install
```

### 2. Supabase Setup

#### Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to finish setting up

#### Run Database Migration
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/001_initial_setup.sql`
4. Paste and run the SQL script

#### Create Storage Buckets
1. Navigate to **Storage** in your Supabase dashboard
2. Create two buckets:
   - **imports** (for uploaded Excel/CSV files)
   - **exports** (for generated XML files)

#### Set Storage Policies
For the **imports** bucket:
- Add policy: **INSERT** - Allow authenticated users to upload to their own folder
  ```sql
  auth.uid() = (storage.foldername(name))[1]
  ```

For the **exports** bucket:
- Add policy: **INSERT** - Allow authenticated users to upload to their own folder
  ```sql
  auth.uid() = (storage.foldername(name))[1]
  ```
- Add policy: **SELECT** - Allow users to read their own files
  ```sql
  auth.uid() = (storage.foldername(name))[1]
  ```
- Add policy: **SELECT** - Allow admins to read all files
  ```sql
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  ```

### 3. Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Supabase credentials in `.env`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

   You can find these in your Supabase project settings under **API**.

### 4. Run the Application

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 5. Create Admin User (Optional)

After registering your first user, you can promote them to admin:

1. Go to Supabase SQL Editor
2. Run:
   ```sql
   UPDATE public.profiles 
   SET role = 'admin' 
   WHERE id = 'your-user-uuid-here';
   ```

## Usage Guide

### 1. Login/Register
- Navigate to the login page
- Register a new account or sign in with existing credentials

### 2. Upload File
- Click "Choose File" and select an Excel (.xlsx, .xls) or CSV file
- The app will automatically parse and detect columns

### 3. Configure Settings
- **Service Code**: Select the default Canada Post service (DOM.EP, DOM.RP, DOM.XP, DOM.PC)
- **Default Dimensions**: Set default length, width, height in cm
- **Default Weight**: Set default weight in grams
- **Notifications**: Toggle email notifications on/off
- **Duplicate by Quantity**: If enabled, creates multiple shipments for orders with quantity > 1

### 4. Validate Data
- Click "Validate" to check for errors
- Fix any validation errors in your source file and re-upload

### 5. Generate XML
- Click "Generate XML" (only enabled if validation passes)
- The XML will be generated according to Canada Post EST Desktop 2.0 specifications

### 6. Download and Save
- Click "Download XML" to download the file locally
- Click "Save to Supabase" to store both the source file and XML in the cloud

### 7. View History
- Navigate to the History page to see past conversions
- Download previously generated XML files
- Admins can see all conversions; employees see only their own

## Expected Excel/CSV Format

The app intelligently maps columns. Supported headers (case-insensitive):

| Standard Name | Accepted Variants |
|--------------|-------------------|
| CustomerReference | Order Number, OrderId, Order Id, Ref |
| Company | Business, Organization |
| ContactName | Contact Name, Name, Recipient |
| Phone | Telephone, Tel, PhoneNumber |
| Email | E-mail, EmailAddress |
| AddressLine1 | Address Line 1, Address1, Address, Street |
| AddressLine2 | Address Line 2, Address2, Suite, Unit |
| City | Town |
| Province | Prov, State, Prov-State |
| PostalCode | Postal Code, ZipCode, Zip, Postal |
| Country | CountryCode |
| Weight | Wt, Mass |
| Length | Len, L |
| Width | W |
| Height | H, Ht |
| ServiceCode | Service Code, Service, ProductId |
| Quantity | Qty, Count |

### Required Fields
- ContactName
- AddressLine1
- City
- Province
- PostalCode
- Country

## Validation Rules

- **Phone**: Digits only, max 25 characters
- **PostalCode**: Uppercase, no spaces, max 14 characters
- **Country**: Converted to 2-letter code (CAN/CA/Canada → CA)
- **Weight**: Values ≤50 treated as kg and converted to grams; >50 treated as grams
- **Dimensions**: In centimeters
- **Field Truncation**:
  - Contact Name: 44 chars
  - Company: 44 chars
  - Address Lines: 44 chars
  - City: 40 chars
  - Postal Code: 14 chars
  - Email: 70 chars
  - Customer Reference: 35 chars

## XML Output Structure

The generated XML follows Canada Post EST Desktop 2.0 format:

```xml
<?xml version="1.0" encoding="utf-8"?>
<delivery-requests>
  <delivery-request>
    <delivery-spec>
      <destination>
        <recipient>
          <client-id>...</client-id>
          <contact-name>...</contact-name>
          <company>...</company>
          <address-line-1>...</address-line-1>
          <address-line-2>...</address-line-2>
          <city>...</city>
          <prov-state>...</prov-state>
          <postal-zip-code>...</postal-zip-code>
          <country-code>CA</country-code>
          <client-voice-number>...</client-voice-number>
        </recipient>
      </destination>
      <product-id>DOM.EP</product-id>
      <item-specification>
        <physical-characteristics>
          <length>40</length>
          <width>30</width>
          <height>10</height>
          <weight>2000</weight>
        </physical-characteristics>
      </item-specification>
      <notification>
        <client-notif-email>
          <email>...</email>
          <on-shipment>true</on-shipment>
          <on-exception>true</on-exception>
          <on-delivery>true</on-delivery>
        </client-notif-email>
      </notification>
      <reference>
        <customer-ref1>...</customer-ref1>
      </reference>
    </delivery-spec>
  </delivery-request>
</delivery-requests>
```

## Project Structure

```
├── src/
│   ├── components/
│   │   └── ProtectedRoute.tsx      # Auth guard component
│   ├── contexts/
│   │   └── AuthContext.tsx         # Authentication context
│   ├── lib/
│   │   └── supabase.ts             # Supabase client config
│   ├── pages/
│   │   ├── Login.tsx               # Login/Register page
│   │   ├── Dashboard.tsx           # Main upload/generation page
│   │   └── History.tsx             # Conversion history page
│   ├── types/
│   │   └── index.ts                # TypeScript types
│   ├── utils/
│   │   ├── excelParser.ts          # Excel/CSV parsing logic
│   │   └── xmlGenerator.ts         # XML generation logic
│   ├── App.tsx                     # Main app with routing
│   └── main.tsx                    # Entry point
├── supabase/
│   └── migrations/
│       └── 001_initial_setup.sql   # Database schema
├── .env.example                    # Environment variables template
└── README.md                       # This file
```

## Building for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

## Deployment

You can deploy this app to:
- **Vercel**: `vercel deploy`
- **Netlify**: `netlify deploy`
- **Any static hosting**: Upload the `dist/` folder

Make sure to set the environment variables in your hosting platform.

## Troubleshooting

### "Session check timed out" error
- Verify your Supabase URL and anon key are correct in `.env`
- Check that your Supabase project is active

### Storage upload fails
- Ensure storage buckets are created
- Verify storage policies are set correctly
- Check that RLS is enabled

### Validation errors
- Review the required fields in your Excel/CSV
- Check that column headers match expected variants
- Ensure data types are correct (numbers for weight/dimensions)

## License

MIT

## Support

For issues or questions, please open an issue on the GitHub repository.
