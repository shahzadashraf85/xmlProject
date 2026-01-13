# 🚀 Quick Start - AI Column Mapping

## Get Your Free Google Gemini API Key (2 minutes)

1. **Visit**: https://makersuite.google.com/app/apikey
2. **Sign in** with your Google account
3. **Click**: "Create API Key"
4. **Copy** the generated key

## Add API Key to Your App

Run this command (replace `YOUR_API_KEY` with your actual key):

```bash
echo 'VITE_GEMINI_API_KEY=YOUR_API_KEY' >> .env
```

Or manually edit `.env` file and add:
```
VITE_GEMINI_API_KEY=YOUR_API_KEY
```

## Restart the Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Use AI Mapping

1. Open http://localhost:5173
2. ✅ Check "🤖 Use AI-Powered Column Mapping"
3. Upload your Excel file
4. AI will automatically map your columns!

---

**That's it!** Your Excel columns will be intelligently mapped to the required XML fields, no matter what they're named! 🎉
