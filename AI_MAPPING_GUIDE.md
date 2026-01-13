# AI-Powered Column Mapping Setup

## 🤖 Overview

The EST XML Generator now includes **AI-powered intelligent column mapping** using Google Gemini API. This feature automatically maps your Excel columns to the required XML fields, even if your headers don't match the standard format.

## ✨ Benefits

- **Works with any column names** - No need to rename your Excel headers
- **Intelligent mapping** - AI understands context and variations
- **Free tier available** - Google Gemini offers generous free usage
- **Handles messy data** - Works with unorganized spreadsheets

---

## 🔑 Getting Your Free Gemini API Key

### Step 1: Visit Google AI Studio

Go to: **https://makersuite.google.com/app/apikey**

(Or search for "Google AI Studio API Key")

### Step 2: Sign In

- Sign in with your Google account
- Accept the terms of service

### Step 3: Create API Key

1. Click **"Create API Key"**
2. Select **"Create API key in new project"** (or use existing project)
3. Copy the generated API key

### Step 4: Add to Your .env File

Open `/Users/sh/Documents/Laptekexport/.env` and update:

```bash
VITE_GEMINI_API_KEY=YOUR_ACTUAL_API_KEY_HERE
```

Replace `YOUR_ACTUAL_API_KEY_HERE` with the key you copied.

---

## 🚀 Using AI Mapping

### In the Application

1. **Open** the Dashboard
2. **Check** the "🤖 Use AI-Powered Column Mapping" checkbox
3. **Upload** your Excel/CSV file
4. **Wait** for AI to analyze and map columns (takes 2-5 seconds)
5. **Review** the AI mapping results shown in purple box
6. **Validate** and generate XML as usual

### Example

If your Excel has columns like:
- "Customer Full Name"
- "Shipping Street"
- "Town/City"
- "Province/State"
- "ZIP/Postal"
- "Country"

The AI will automatically map them to:
- ContactName
- AddressLine1
- City
- Province
- PostalCode
- Country

---

## 📊 Free Tier Limits

Google Gemini Free Tier includes:
- ✅ **15 requests per minute**
- ✅ **1 million tokens per day**
- ✅ **No credit card required**

This is more than enough for typical usage (hundreds of files per day).

---

## 🔒 Privacy & Security

- Your API key is stored locally in `.env` (never committed to git)
- Excel data is sent to Google Gemini API for column mapping only
- No data is stored by Google (ephemeral processing)
- All file data remains in your browser and Supabase

---

## 🛠️ Troubleshooting

### "Please set VITE_GEMINI_API_KEY in your .env file"

**Solution**: 
1. Make sure you created the `.env` file
2. Add `VITE_GEMINI_API_KEY=your_key_here`
3. Restart the dev server: `npm run dev`

### "AI mapping failed"

**Possible causes**:
- Invalid API key
- Rate limit exceeded (wait 1 minute)
- Network connection issue

**Solution**: 
- Verify your API key is correct
- Try again in a few seconds
- Check your internet connection

### AI Maps Columns Incorrectly

**Solution**:
- Uncheck the AI toggle
- Use manual mapping instead
- Or rename your Excel headers to match standard names

---

## 💡 When to Use AI Mapping

### ✅ Use AI When:
- Your Excel has non-standard column names
- You receive files from different sources
- Column names vary between files
- You want to save time renaming columns

### ⚠️ Use Manual Mapping When:
- Your columns already match standard names
- You want faster processing (no API call)
- You don't want to set up an API key
- You're offline

---

## 📝 Manual Mapping (No API Key Needed)

If you don't want to use AI, the app still supports automatic mapping for common column name variations:

**Supported variations** (case-insensitive):
- **ContactName**: "Contact Name", "Name", "Recipient", "Customer Name", "Full Name"
- **AddressLine1**: "Address Line 1", "Address1", "Address", "Street", "Shipping Address"
- **City**: "City", "Town", "Municipality"
- **Province**: "Province", "Prov", "State", "Region"
- **PostalCode**: "Postal Code", "ZIP Code", "ZIP", "Postal", "Post Code"
- **Country**: "Country", "Country Code"

And many more! See `src/utils/excelParser.ts` for the full list.

---

## 🎯 Summary

1. **Get free API key**: https://makersuite.google.com/app/apikey
2. **Add to .env**: `VITE_GEMINI_API_KEY=your_key`
3. **Restart server**: `npm run dev`
4. **Enable AI toggle** in the app
5. **Upload and enjoy** automatic mapping! 🎉

---

**Questions?** Check the main README.md or open an issue on GitHub.
