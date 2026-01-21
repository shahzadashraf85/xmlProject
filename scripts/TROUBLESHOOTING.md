# 🚀 QUICK FIX - PowerShell Closes Too Fast

## ✅ SOLUTION: Use the .BAT File Instead!

### **Instead of double-clicking:**
❌ `REGISTER-DEVICE.ps1` (PowerShell file)

### **Double-click this:**
✅ `REGISTER-DEVICE.bat` (Batch file)

---

## Why This Works:

The `.bat` file automatically:
- ✅ Bypasses Windows security restrictions
- ✅ Keeps the window open so you can read errors
- ✅ No admin rights needed
- ✅ No setup required

---

## 📋 Step-by-Step Instructions

### 1. Download Both Files:
- `REGISTER-DEVICE.bat` ⭐ (Use this one!)
- `REGISTER-DEVICE.ps1` (Helper file, don't delete)

### 2. Put Both on USB Stick
Keep them in the same folder.

### 3. On Each Device:
**Double-click:** `REGISTER-DEVICE.bat`

That's it! ✨

---

## 🔧 If You Still See Errors

### Error: "Execution Policy"
**Fix:**
1. Right-click `REGISTER-DEVICE.bat`
2. Select "Run as Administrator"
3. Try again

### Error: "Cannot find REGISTER-DEVICE.ps1"
**Fix:**
Make sure both files are in the same folder:
```
USB Drive/
  ├── REGISTER-DEVICE.bat  ← Double-click this
  └── REGISTER-DEVICE.ps1  ← Keep this with it
```

### Error: "No Internet Connection"
**Fix:**
1. Connect device to WiFi
2. Run the script again

### Error: "Already Registered"
**Fix:**
This is normal! The device is already in the system.
Just move to the next device.

---

## 📱 Alternative Method (If .bat Doesn't Work)

### Manual PowerShell Method:
1. Right-click on `REGISTER-DEVICE.ps1`
2. Select "Run with PowerShell"
3. If you see a security warning, type `R` and press Enter

---

## ✅ What Success Looks Like

```
========================================
   LAPTEK DEVICE REGISTRATION
========================================

Scanning device...

FOUND:
  Dell Latitude 5420
  Serial: ABC123XYZ
  Intel Core i7-1185G7
  16 GB RAM, 512 GB Storage

Uploading to system...

========================================
   ✓ SUCCESS!
========================================

Device registered: ABC123XYZ

Press any key to close...
```

**When you see this, the device is registered!** ✅

---

## 🆘 Still Not Working?

### Check PowerShell Version:
1. Press `Windows Key + R`
2. Type `powershell`
3. Press Enter
4. Type: `$PSVersionTable.PSVersion`
5. You should see version **5.1 or higher**

If version is too old:
- Update Windows
- Or contact IT support

---

## 📞 Need Help?

**Common Issues:**
- ✅ 95% of problems = Use `.bat` file instead of `.ps1`
- ✅ 4% of problems = No internet connection
- ✅ 1% of problems = Old PowerShell version

**If none of these help:**
Contact IT Support with:
- Screenshot of the error
- Device model
- Windows version

---

**Remember: Always use `REGISTER-DEVICE.bat` (not the .ps1 file)** 🎯
