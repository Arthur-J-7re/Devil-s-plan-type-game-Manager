#!/bin/bash
# Open firewall ports on macOS

echo ""
echo "[FIREWALL] Opening ports 3001 and 5173"
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "[INFO] This script is for macOS"
    echo "On Linux, use your distribution's firewall tools (ufw, firewall-cmd, etc.)"
    exit 1
fi

# Note: macOS doesn't require explicit firewall rules for localhost/127.0.0.1
# But we can document the process

echo "On macOS, local development doesn't require firewall exceptions."
echo ""
echo "However, if you want to allow access from your phone over network:"
echo "1. System Preferences → Security & Privacy → Firewall Options"
echo "2. Add node and npm to allowed apps"
echo ""
echo "Or use:"
echo "  sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node"
echo ""
