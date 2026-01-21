# 🔒 Security Guide for Auto-Registration Scripts

## ✅ Safety Features

### 1. **Read-Only Operations**
- Scripts **ONLY READ** system information
- **NO modifications** to files, registry, or settings
- **NO installation** of software
- **NO network changes**

### 2. **What the Scripts Access**
✅ Hardware specs (CPU, RAM, Storage)  
✅ Serial number from BIOS  
✅ Operating system version  
✅ Computer name  
✅ Current username  

❌ **NEVER accesses:**
- Personal files or documents
- Passwords or credentials
- Browser history
- Installed applications
- Network credentials

### 3. **Data Transmission**
- All data sent over **HTTPS** (encrypted)
- Only sends to **YOUR Supabase database**
- No third-party services
- No telemetry or tracking

---

## 🔐 Secure Version Features

The **`windows-register-secure.ps1`** script includes:

### 1. **PIN Authentication**
```powershell
Enter Technician PIN (4 digits): ****
```
- Prevents unauthorized use
- Change the PIN in the script (line 35)
- Default PIN: `1234` ⚠️ **CHANGE THIS!**

### 2. **Environment Variable for API Key**
Instead of hardcoding the key in the script:
```powershell
# Set once per computer:
$env:LAPTEK_API_KEY = "your-key-here"

# Or run with the script:
$env:LAPTEK_API_KEY="your-key"; .\windows-register-secure.ps1
```

### 3. **Duplicate Detection**
- Checks if serial number already exists
- Prevents accidental re-registration
- Shows existing device info

### 4. **Confirmation Prompt**
```
Register this device? (Y/N):
```
- Gives technician final review
- Prevents accidental submissions

### 5. **Audit Logging**
Tracks every registration:
- Who registered it (username)
- When it was registered (timestamp)
- Which computer ran the script
- Success or failure

Log location: `C:\Users\[User]\AppData\Local\Temp\laptek-registration.log`

### 6. **Serial Number Validation**
Detects and rejects generic/fake serial numbers:
- "To Be Filled By O.E.M."
- "Default String"
- "123456"
- "000000"

Prompts for manual entry if detected.

---

## 🚨 Security Best Practices

### For IT Administrators:

1. **Change the Default PIN**
   ```powershell
   # Line 35 in windows-register-secure.ps1
   $VALID_PIN = "YOUR_SECURE_PIN_HERE"  # Use 6+ digits
   ```

2. **Use Environment Variables**
   ```powershell
   # Set system-wide (requires admin):
   [System.Environment]::SetEnvironmentVariable('LAPTEK_API_KEY', 'your-key', 'Machine')
   
   # Or per-user:
   [System.Environment]::SetEnvironmentVariable('LAPTEK_API_KEY', 'your-key', 'User')
   ```

3. **Restrict Script Access**
   - Store on encrypted USB drive
   - Use NTFS permissions to limit access
   - Don't email or share publicly

4. **Monitor the Audit Log**
   ```powershell
   # View recent registrations:
   Get-Content "$env:TEMP\laptek-registration.log" -Tail 20
   ```

5. **Rotate API Keys Regularly**
   - Generate new Supabase anon key monthly
   - Update environment variable
   - Old scripts will stop working

---

## 🛡️ Additional Security Layers

### Option A: IP Whitelist (Recommended for Fixed Location)
In Supabase Edge Function, add:
```typescript
const allowedIPs = ['203.0.113.1', '203.0.113.2'] // Your office IPs
const clientIP = req.headers.get('x-forwarded-for')
if (!allowedIPs.includes(clientIP)) {
    return new Response('Unauthorized', { status: 403 })
}
```

### Option B: Time-Based Access
Only allow registrations during business hours:
```typescript
const hour = new Date().getHours()
if (hour < 9 || hour > 17) {
    return new Response('Outside business hours', { status: 403 })
}
```

### Option C: Rate Limiting
Prevent abuse by limiting registrations:
```typescript
// Max 10 devices per hour from same IP
```

---

## 🔍 How to Verify Script Safety

### Before Running:
1. **Open the script in Notepad**
2. **Read the code** - it's plain text
3. **Look for:**
   - ✅ Only `Get-ComputerInfo`, `Get-CimInstance` (read-only)
   - ✅ Only sends to YOUR Supabase URL
   - ❌ No `Remove-Item`, `Set-Item` (delete/modify)
   - ❌ No `Invoke-Expression` (run arbitrary code)
   - ❌ No downloads or installations

### After Running:
1. **Check the log file:**
   ```powershell
   notepad "$env:TEMP\laptek-registration.log"
   ```

2. **Verify in your database:**
   - Go to Supabase Dashboard
   - Check `inventory_items` table
   - Confirm the device appears

---

## 📋 Comparison: Basic vs Secure

| Feature | Basic Script | Secure Script |
|---------|-------------|---------------|
| Hardware Detection | ✅ | ✅ |
| API Key in Script | ⚠️ Hardcoded | ✅ Environment Var |
| Authentication | ❌ None | ✅ PIN Required |
| Duplicate Check | ❌ | ✅ |
| Audit Trail | ❌ | ✅ |
| Confirmation | ❌ | ✅ |
| Serial Validation | ❌ | ✅ |

---

## 🆘 What If Script is Compromised?

If someone gets your script:

### Immediate Actions:
1. **Revoke the API Key**
   - Go to Supabase Dashboard
   - Project Settings > API
   - Generate new anon key
   - Update your scripts

2. **Check Audit Logs**
   ```sql
   SELECT * FROM inventory_items 
   WHERE specs->>'audit'->>'timestamp' > NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC;
   ```

3. **Enable RLS (Row Level Security)**
   ```sql
   ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Only authenticated inserts"
   ON inventory_items FOR INSERT
   WITH CHECK (auth.role() = 'authenticated');
   ```

### Prevention:
- ✅ Use secure script with PIN
- ✅ Store on encrypted drive
- ✅ Don't commit to public Git repos
- ✅ Use `.gitignore` for scripts folder

---

## ✅ Final Verdict: Is It Safe?

**YES**, when used properly:

✅ **Safe for your computers** - Read-only operations  
✅ **Safe for your data** - Encrypted transmission  
✅ **Safe for your business** - Audit trail included  
✅ **Safe from abuse** - PIN + duplicate detection  

**Recommended Setup:**
1. Use **`windows-register-secure.ps1`**
2. Set **environment variable** for API key
3. Change **default PIN** to something secure
4. Store on **encrypted USB** drive
5. Monitor **audit logs** weekly

---

## 📞 Support

Questions about security?
- Review the code yourself (it's open source)
- Test on a non-critical device first
- Check Supabase logs for any suspicious activity

**Remember:** You have full control. You can:
- Modify the scripts
- Add more security checks
- Disable the Edge Function anytime
- Delete registered devices from database

---

**Made with 🔒 Security in Mind**
