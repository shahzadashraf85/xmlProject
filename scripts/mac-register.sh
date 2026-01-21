#!/bin/bash
# LapTek Device Auto-Registration Script for macOS/Linux
# Make executable: chmod +x mac-register.sh
# Run: ./mac-register.sh

echo "========================================"
echo "  LapTek Device Auto-Registration"
echo "========================================"
echo ""

# Configuration
API_URL="https://xqsatwytjzvlhdmckfsb.supabase.co/functions/v1/register-device"
API_KEY="YOUR_SUPABASE_ANON_KEY_HERE"  # Replace with your actual key

echo "Detecting hardware specifications..."
echo ""

# Detect OS Type
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    BRAND=$(system_profiler SPHardwareDataType | grep "Model Name" | awk -F': ' '{print $2}' | awk '{print $1}')
    MODEL=$(system_profiler SPHardwareDataType | grep "Model Identifier" | awk -F': ' '{print $2}')
    SERIAL=$(system_profiler SPHardwareDataType | grep "Serial Number" | awk -F': ' '{print $2}')
    CPU=$(system_profiler SPHardwareDataType | grep "Chip" | awk -F': ' '{print $2}')
    if [ -z "$CPU" ]; then
        CPU=$(system_profiler SPHardwareDataType | grep "Processor Name" | awk -F': ' '{print $2}')
    fi
    RAM=$(system_profiler SPHardwareDataType | grep "Memory" | awk -F': ' '{print $2}')
    STORAGE=$(diskutil info / | grep "Disk Size" | awk -F': ' '{print $2}' | awk '{print $1, $2}')
    OS_NAME=$(sw_vers -productName)
    OS_VERSION=$(sw_vers -productVersion)
    
else
    # Linux
    BRAND=$(sudo dmidecode -s system-manufacturer 2>/dev/null || echo "Unknown")
    MODEL=$(sudo dmidecode -s system-product-name 2>/dev/null || echo "Unknown")
    SERIAL=$(sudo dmidecode -s system-serial-number 2>/dev/null || echo "Unknown")
    CPU=$(lscpu | grep "Model name" | awk -F': ' '{print $2}' | xargs)
    RAM=$(free -h | grep "Mem:" | awk '{print $2}')
    STORAGE=$(df -h / | tail -1 | awk '{print $2}')
    OS_NAME=$(lsb_release -d 2>/dev/null | awk -F'\t' '{print $2}' || cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)
    OS_VERSION=$(uname -r)
fi

# Display Detected Info
echo "Detected Information:"
echo "  Brand:        $BRAND"
echo "  Model:        $MODEL"
echo "  Serial:       $SERIAL"
echo "  CPU:          $CPU"
echo "  RAM:          $RAM"
echo "  Storage:      $STORAGE"
echo "  OS:           $OS_NAME $OS_VERSION"
echo ""

# Prepare JSON Payload
JSON_PAYLOAD=$(cat <<EOF
{
  "brand": "$BRAND",
  "model": "$MODEL",
  "serial_number": "$SERIAL",
  "device_type": "LAPTOP",
  "grade": "B",
  "specs": {
    "processor": "$CPU",
    "ram": "$RAM",
    "storage": "$STORAGE",
    "os": "$OS_NAME $OS_VERSION"
  },
  "status": "pending_triage",
  "location": "Receiving"
}
EOF
)

echo "Uploading to LapTek Inventory System..."
echo ""

# Send to API
HTTP_CODE=$(curl -s -o /tmp/laptek_response.txt -w "%{http_code}" \
  -X POST "$API_URL" \
  -H "apikey: $API_KEY" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD")

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo "========================================"
    echo "  ✓ REGISTRATION SUCCESSFUL!"
    echo "========================================"
    echo ""
    echo "Device has been added to inventory."
    echo "Serial Number: $SERIAL"
    echo ""
else
    echo "========================================"
    echo "  ✗ REGISTRATION FAILED"
    echo "========================================"
    echo ""
    echo "HTTP Status Code: $HTTP_CODE"
    echo "Response: $(cat /tmp/laptek_response.txt)"
    echo ""
    echo "Please check:"
    echo "  1. Internet connection is active"
    echo "  2. API_KEY is configured in the script"
    echo "  3. Supabase Edge Function is deployed"
    echo ""
fi

# Cleanup
rm -f /tmp/laptek_response.txt

echo "Press Enter to exit..."
read
