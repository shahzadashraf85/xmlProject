# LapTek Auto-Registration Scripts

Automatically register devices into your inventory system with a single double-click!

## 📥 Setup (One-Time)

### 1. Configure API Key

Edit the script for your platform and replace `YOUR_SUPABASE_ANON_KEY_HERE` with your actual key:

**Your Supabase Anon Key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxc2F0d3l0anp2bGhkbWNrZnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1MDU2NTAsImV4cCI6MjA1MTA4MTY1MH0.sb_publishable_LbkFFWSkr91XApWL5NJBew_rAIkyI5J
```

### 2. Download Scripts

**Windows Users:**
- Download: `scripts/windows-register.ps1`
- Save to Desktop or USB drive

**Mac/Linux Users:**
- Download: `scripts/mac-register.sh`
- Make executable: `chmod +x mac-register.sh`

---

## 🚀 Usage

### Windows:
1. **Right-click** `windows-register.ps1`
2. Select **"Run with PowerShell"**
3. Wait 5-10 seconds
4. See "✓ REGISTRATION SUCCESSFUL!"

**First Time?** You may need to allow script execution:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### macOS:
1. **Double-click** `mac-register.sh` (or run `./mac-register.sh` in Terminal)
2. Wait 5-10 seconds
3. See "✓ REGISTRATION SUCCESSFUL!"

**First Time?** You may need to allow the script:
```bash
chmod +x mac-register.sh
```

### Linux:
1. Run `./mac-register.sh` in Terminal
2. Enter sudo password (needed to read serial number)
3. See "✓ REGISTRATION SUCCESSFUL!"

---

## 📊 What Gets Detected

✅ **Brand** (Dell, HP, Apple, etc.)  
✅ **Model** (Latitude 5420, MacBook Pro, etc.)  
✅ **Serial Number**  
✅ **Exact CPU Model** (Intel Core i7-1185G7, Apple M1, etc.)  
✅ **RAM Size** (16 GB, 32 GB, etc.)  
✅ **Storage Size** (512 GB, 1 TB, etc.)  
✅ **Operating System** (Windows 11, macOS Sonoma, etc.)  

---

## 🔧 Troubleshooting

### "Execution Policy" Error (Windows)
Run PowerShell as Administrator:
```powershell
Set-ExecutionPolicy RemoteSigned
```

### "Permission Denied" (Mac/Linux)
Make the script executable:
```bash
chmod +x mac-register.sh
```

### "Registration Failed"
Check:
1. ✅ Internet connection is active
2. ✅ API key is correctly configured in the script
3. ✅ Supabase Edge Function is deployed

### Serial Number Shows "To Be Filled By O.E.M."
Some manufacturers don't set BIOS serial numbers. You'll need to manually enter the serial from the device label.

---

## 📦 Deployment Workflow

**For High-Volume Operations:**

1. **Prepare USB Drive**
   - Copy the script to a USB stick
   - Label it "LapTek Registration Tool"

2. **Technician Workflow**
   - Plug USB into device
   - Double-click script
   - Wait for confirmation
   - Move to next device

**Time per device:** ~10 seconds

---

## 🔐 Security Notes

- Scripts only **read** system information (no modifications)
- Data is sent over HTTPS to your Supabase database
- API key has limited permissions (can only insert to inventory_items table)
- Scripts are open-source and can be audited

---

## 📝 Customization

### Change Default Grade
Edit the script and modify:
```powershell
"grade" = "A"  # Change from "B" to "A" or "C"
```

### Change Default Location
```powershell
"location" = "Warehouse B"  # Change from "Receiving"
```

### Add Custom Notes
```powershell
"notes" = "Batch 2024-01"
```

---

## 🆘 Support

If you encounter issues:
1. Check the error message displayed
2. Verify internet connectivity
3. Ensure API key is correct
4. Check Supabase dashboard for function logs

**Edge Function URL:**
https://xqsatwytjzvlhdmckfsb.supabase.co/functions/v1/register-device

---

## ✨ Features

- ✅ Zero typing required
- ✅ Works offline (queues for later upload)
- ✅ Handles duplicates gracefully
- ✅ Cross-platform (Windows, Mac, Linux)
- ✅ Portable (run from USB stick)
- ✅ Fast (~10 seconds per device)

---

**Made with ❤️ for LapTek Systems**
