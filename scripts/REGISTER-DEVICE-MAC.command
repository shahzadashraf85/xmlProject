#!/bin/bash
# Double-click this file to register a Mac device!

# Get the directory where this script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if the main script exists next to this file
if [ -f "$DIR/mac-register.sh" ]; then
    # Make sure it's executable
    chmod +x "$DIR/mac-register.sh"
    # Run it
    "$DIR/mac-register.sh"
else
    # Fallback: Run the code directly if the other file is missing
    echo "Starting LapTek Registration..."
    # ... (content of mac-register.sh allows standalone execution here too if we wanted, but calling the other script is cleaner for updates)
    
    # Let's try to verify if we can find it
    echo "Looking for script in: $DIR/mac-register.sh"
    echo "Error: mac-register.sh not found!"
    echo "Please make sure both files are in the same folder."
    read -p "Press Enter to exit..."
fi
