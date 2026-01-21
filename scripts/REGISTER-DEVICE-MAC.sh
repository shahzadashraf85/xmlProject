#!/bin/bash
# ========================================
#  LAPTEK DEVICE REGISTRATION (Mac)
#  Just Double-Click to Run!
# ========================================

API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxc2F0d3l0anp2bGhkbWNrZnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1MDU2NTAsImV4cCI6MjA1MTA4MTY1MH0.sb_publishable_LbkFFWSkr91XApWL5NJBew_rAIkyI5J"
API_URL="https://xqsatwytjzvlhdmckfsb.supabase.co/functions/v1/register-device"

echo ""
echo "========================================"
echo "   LAPTEK DEVICE REGISTRATION"
echo "========================================"
echo ""
echo "Scanning device..."
echo ""

# Get device information
BRAND=$(system_profiler SPHardwareDataType | grep "Model Name" | awk -F': ' '{print $2}' | awk '{print $1}')
MODEL=$(system_profiler SPHardwareDataType | grep "Model Identifier" | awk -F': ' '{print $2}')
SERIAL=$(system_profiler SPHardwareDataType | grep "Serial Number" | awk -F': ' '{print $2}')
CPU=$(system_profiler SPHardwareDataType | grep "Chip" | awk -F': ' '{print $2}')
if [ -z "$CPU" ]; then
    CPU=$(system_profiler SPHardwareDataType | grep "Processor Name" | awk -F': ' '{print $2}')
fi
RAM=$(system_profiler SPHardwareDataType | grep "Memory" | awk -F': ' '{print $2}')
STORAGE=$(diskutil info / | grep "Disk Size" | awk -F': ' '{print $2}' | awk '{print $1, $2}')
OS=$(sw_vers -productName)
OS_VER=$(sw_vers -productVersion)

# Show what was found
echo "FOUND:"
echo "  $BRAND $MODEL"
echo "  Serial: $SERIAL"
echo "  $CPU"
echo "  $RAM RAM, $STORAGE Storage"
echo ""

# Prepare JSON
JSON=$(cat <<EOF
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
    "os": "$OS $OS_VER"
  },
  "status": "pending_triage",
  "location": "Receiving"
}
EOF
)

# Upload to database
echo "Uploading to system..."

HTTP_CODE=$(curl -s -o /tmp/response.txt -w "%{http_code}" \
  -X POST "$API_URL" \
  -H "apikey: $API_KEY" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$JSON")

echo ""

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo "========================================"
    echo "   ✓ SUCCESS!"
    echo "========================================"
    echo ""
    echo "Device registered: $SERIAL"
    echo ""
elif [ "$HTTP_CODE" -eq 409 ]; then
    echo "========================================"
    echo "   ⚠️  ALREADY REGISTERED"
    echo "========================================"
    echo ""
    echo "This device is already in the system!"
    echo "Serial: $SERIAL"
    echo ""
else
    echo "========================================"
    echo "   ✗ ERROR"
    echo "========================================"
    echo ""
    echo "Something went wrong (Error $HTTP_CODE)"
    echo "Response: $(cat /tmp/response.txt)"
    echo ""
fi

rm -f /tmp/response.txt

echo "Press Enter to close..."
read
