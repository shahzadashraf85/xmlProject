# 📋 TECHNICIAN QUICK GUIDE
## Device Registration - 3 Easy Steps

---

## ⚡ QUICK START

### Step 1: Open the Device
Turn on the laptop/PC you want to register.

### Step 2: Run the Script
**Double-click:** `REGISTER-DEVICE.ps1`

### Step 3: Wait
The script will:
- ✅ Scan the device automatically
- ✅ Upload to the system
- ✅ Show "SUCCESS!" when done

**That's it!** ✨

---

## 🖥️ What You'll See

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

---

## ⚠️ Common Issues

### "Execution Policy" Error
**First time only:**
1. Right-click PowerShell
2. Select "Run as Administrator"
3. Type: `Set-ExecutionPolicy RemoteSigned`
4. Press Enter
5. Type `Y` and press Enter

**Now try the script again.**

---

### "Generic Serial Number" Warning
If you see:
```
⚠️  WARNING: Generic serial number detected!
Please type the REAL serial number from the sticker:
```

**What to do:**
1. Find the serial number sticker on the device (usually on bottom)
2. Type it exactly as shown
3. Press Enter

---

### "Already Registered" Message
```
✗ ERROR
This device is ALREADY registered!
```

**What to do:**
- This is normal! The device is already in the system.
- Just move to the next device.

---

### "No Internet Connection" Error
```
✗ ERROR
No internet connection!
```

**What to do:**
1. Connect the device to WiFi
2. Run the script again

---

## 📦 Batch Processing (Multiple Devices)

**For 10+ devices:**

1. Copy `REGISTER-DEVICE.ps1` to a USB stick
2. For each device:
   - Plug in USB
   - Double-click the script
   - Wait for "SUCCESS!"
   - Move to next device

**Average time:** 15 seconds per device

---

## 🆘 Need Help?

**Script not working?**
- Check WiFi connection
- Make sure device is fully booted
- Try restarting the device

**Still stuck?**
Contact IT Support

---

## ✅ Checklist

Before registering a device:
- [ ] Device is powered on
- [ ] Windows/Mac is fully loaded
- [ ] Connected to internet (WiFi or Ethernet)
- [ ] USB stick with script is ready

After registration:
- [ ] Saw "SUCCESS!" message
- [ ] Serial number was displayed
- [ ] Device can be powered off

---

**That's all you need to know!** 🎉
