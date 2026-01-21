#!/bin/bash
# ========================================
#  LAPTEK DEVICE REGISTRATION (macOS/Linux)
#  Enhanced for Full Spec Scanner
# ========================================
# Usage:
# 1. chmod +x mac-register.sh
# 2. ./mac-register.sh

echo "========================================"
echo "  LAPTEK FULL DEVICE SCANNER (Mac/Linux)"
echo "========================================"
echo ""

# Configuration
# Configuration
SUPABASE_URL="https://xqsatwytjzvlhdmckfsb.supabase.co"
API_URL="${SUPABASE_URL}/functions/v1/register-device"
API_KEY="sb_publishable_LbkFFWSkr91XApWL5NJBew_rAIkyI5J"

# --- AUTHENTICATION ---
echo "🔒 AUTHENTICATION REQUIRED"
echo "Please enter your LapTek credentials to proceed."
read -p "Email: " AUTH_EMAIL
read -s -p "Password: " AUTH_PASSWORD
echo ""
echo ""

echo "Authenticating..."
AUTH_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$AUTH_EMAIL\",\"password\":\"$AUTH_PASSWORD\"}")

# Extract Access Token (Simple grep hack to avoid jq dependency)
ACCESS_TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"access_token":"[^"]*' | grep -o '[^"]*$')
REFRESH_TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"refresh_token":"[^"]*' | grep -o '[^"]*$')

if [[ -z "$ACCESS_TOKEN" ]]; then
    echo "❌ Authentication Failed!"
    echo "Check your email/password and try again."
    # echo "Debug: $AUTH_RESPONSE"
    exit 1
fi

echo "✅ Authenticated as $AUTH_EMAIL"
echo ""

echo "Scanning detailed hardware specs..."
echo "(This may take a few seconds)"
echo ""

if [[ "$OSTYPE" == "darwin"* ]]; then
    # ==================== macOS SCANNER ====================
    
    # --- System Info ---
    BRAND="Apple"
    MODEL=$(sysctl -n hw.model)
    MODEL_NAME=$(system_profiler SPHardwareDataType | awk -F': ' '/Model Name/ {print $2}')
    SERIAL=$(system_profiler SPHardwareDataType | awk -F': ' '/Serial Number/ {print $2}')
    UUID=$(system_profiler SPHardwareDataType | awk -F': ' '/Hardware UUID/ {print $2}')
    
    # --- Processor ---
    CPU_NAME=$(sysctl -n machdep.cpu.brand_string)
    CPU_CORES=$(sysctl -n hw.physicalcpu)
    CPU_THREADS=$(sysctl -n hw.logicalcpu)
    CPU_ARCH="64-bit" # Apple Silicon/Intel recent are all 64
    
    # --- Memory ---
    RAM_BYTES=$(sysctl -n hw.memsize)
    RAM_GB=$((RAM_BYTES / 1024 / 1024 / 1024))
    RAM_TYPE=$(system_profiler SPMemoryDataType | awk -F': ' '/Type/ {print $2}' | head -1)
    RAM_SPEED=$(system_profiler SPMemoryDataType | awk -F': ' '/Speed/ {print $2}' | head -1)
    
    # --- Storage ---
    # Get main disk info
    DISK_SIZE_BYTES=$(diskutil info / | grep "Disk Size" | awk -F'(' '{print $2}' | awk '{print $1}')
    STORAGE_GB=$((DISK_SIZE_BYTES / 1000 / 1000 / 1000))
    STORAGE_MODEL=$(diskutil info / | grep "Device / Media Name" | awk -F': ' '{print $2}' | xargs)
    STORAGE_TYPE="SSD" # Most Macs have SSDs now, checking protocol for NVMe/SATA
    PROTOCOL=$(diskutil info / | grep "Protocol" | awk -F': ' '{print $2}' | xargs)
    if [[ "$PROTOCOL" == *"SATA"* ]] && [[ "$STORAGE_MODEL" != *"SSD"* ]]; then
        STORAGE_TYPE="HDD"
    fi
    
    # --- Graphics ---
    GPU_NAME=$(system_profiler SPDisplaysDataType | awk -F': ' '/Chipset Model/ {print $2}' | head -1)
    VRAM=$(system_profiler SPDisplaysDataType | awk -F': ' '/VRAM/ {print $2}' | head -1)
    # Convert VRAM to pure MB number if needed, simple grep for now
    DISPLAY_RES=$(system_profiler SPDisplaysDataType | awk -F': ' '/Resolution/ {print $2}' | head -1)
    
    # --- OS ---
    OS_NAME="macOS"
    OS_VERSION=$(sw_vers -productVersion)
    OS_BUILD=$(sw_vers -buildVersion)
    
    # --- Network ---
    MAC_ADDR=$(ifconfig en0 | awk '/ether/ {print $2}')
    WIFI_NAME=$(networksetup -listallhardwareports | grep -A 1 Wi-Fi | tail -1 | awk '{print $2}')
    
    # --- Battery ---
    HAS_BATTERY="false"
    BATTERY_STATUS="No Battery"
    if system_profiler SPPowerDataType | grep -q "Battery Information"; then
        HAS_BATTERY="true"
        cycle_count=$(system_profiler SPPowerDataType | grep "Cycle Count" | awk -F': ' '{print $2}')
        condition=$(system_profiler SPPowerDataType | grep "Condition" | awk -F': ' '{print $2}')
        BATTERY_STATUS="Cycle: $cycle_count, Condition: $condition"
    fi

else
    # ==================== LINUX SCANNER ====================
    # Fallback for Linux (simplified)
    BRAND=$(sudo dmidecode -s system-manufacturer 2>/dev/null || echo "Unknown")
    MODEL=$(sudo dmidecode -s system-product-name 2>/dev/null || echo "Unknown")
    SERIAL=$(sudo dmidecode -s system-serial-number 2>/dev/null || echo "Unknown")
    
    CPU_NAME=$(lscpu | grep "Model name" | awk -F': ' '{print $2}' | xargs)
    RAM_GB=$(free -g | grep "Mem:" | awk '{print $2}')
    STORAGE_GB=$(df -bg / | tail -1 | awk '{print $2}' | tr -d 'G')
    
    OS_NAME=$(lsb_release -d 2>/dev/null | awk -F'\t' '{print $2}' || echo "Linux")
    MAC_ADDR=$(cat /sys/class/net/*/address | head -1)
fi

# ==================== DISPLAY DETECTED INFO ====================
echo "DETECTED SPECIFICATIONS:"
echo "----------------------------------------"
echo "  Model:        $BRAND $MODEL ($MODEL_NAME)"
echo "  Serial:       $SERIAL"
echo "  CPU:          $CPU_NAME ($CPU_CORES Cores)"
echo "  RAM:          ${RAM_GB}GB $RAM_TYPE"
echo "  Storage:      ${STORAGE_GB}GB $STORAGE_TYPE"
echo "  GPU:          $GPU_NAME ($VRAM)"
echo "  Display:      $DISPLAY_RES"
echo "  OS:           $OS_NAME $OS_VERSION ($OS_BUILD)"
echo "  Battery:      $BATTERY_STATUS"
echo "----------------------------------------"
echo ""

# Validation for generic serials
if [[ "$SERIAL" == *"System Serial"* ]] || [[ "$SERIAL" == *"To Be Filled"* ]] || [[ -z "$SERIAL" ]]; then
    echo "⚠️  WARNING: Generic/Empty serial number detected!"
    read -p "Enter REAL Serial Number from sticker: " SERIAL
fi

# Prepare JSON Payload with simplified structure to match PS1 logic manually
# Note: Bash JSON construction can be messy, manual string building here
JSON_PAYLOAD=$(cat <<EOF
{
  "brand": "$BRAND",
  "model": "$MODEL_NAME",
  "serial_number": "$SERIAL",
  "device_type": "LAPTOP",
  "grade": "B",
  "specs": {
    "manufacturer": "$BRAND",
    "model_number": "$MODEL",
    "processor": "$CPU_NAME",
    "processor_cores": $CPU_CORES,
    "processor_threads": $CPU_THREADS,
    "ram_gb": $RAM_GB,
    "ram_type": "$RAM_TYPE",
    "storage_gb": $STORAGE_GB,
    "storage_type": "$STORAGE_TYPE",
    "storage_model": "$STORAGE_MODEL",
    "graphics_card": "$GPU_NAME",
    "graphics_vram_mb": 0,
    "screen_resolution": "$DISPLAY_RES",
    "os_name": "$OS_NAME",
    "os_version": "$OS_VERSION",
    "os_build": "$OS_BUILD",
    "mac_address": "$MAC_ADDR",
    "has_battery": $HAS_BATTERY,
    "battery_status": "$BATTERY_STATUS",
    "scanned_by": "$USER",
    "computer_name": "$(hostname)"
  },
  "status": "pending_triage",
  "location": "Receiving"
}
EOF
)

echo "Uploading to LapTek Inventory..."
echo ""

# Send to API (Using the authenticated token)
HTTP_CODE=$(curl -s -o /tmp/laptek_response.txt -w "%{http_code}" \
  -X POST "$API_URL" \
  -H "apikey: $API_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD")

RESPONSE_BODY=$(cat /tmp/laptek_response.txt)

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo "========================================"
    echo "   ✓ SUCCESS!"
    echo "========================================"
    echo "Device registered: $SERIAL"
    echo ""
    
    # Open in browser with auto-login tokens
    OPEN_URL="https://xmlproject.vercel.app/inventory?search=$SERIAL&access_token=$ACCESS_TOKEN&refresh_token=$REFRESH_TOKEN"
    echo "Opening in browser..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$OPEN_URL"
    else
        xdg-open "$OPEN_URL" 2>/dev/null || echo "Please visit: $OPEN_URL"
    fi
else
    echo "========================================"
    echo "   ✗ ERROR (Code: $HTTP_CODE)"
    echo "========================================"
    echo ""
    echo "Server Response:"
    echo "$RESPONSE_BODY"
    echo ""
    if [[ "$HTTP_CODE" -eq 409 ]]; then
        echo "This device is ALREADY registered!"
    fi
fi

# Cleanup
rm -f /tmp/laptek_response.txt

echo ""
echo "Press Enter to exit..."
read
