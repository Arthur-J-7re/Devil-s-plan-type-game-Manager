#!/bin/bash
# Close firewall ports on macOS

echo ""
echo "[FIREWALL] Closing firewall for development servers"
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "[INFO] This script is for macOS"
    echo "On Linux, use your distribution's firewall tools (ufw, firewall-cmd, etc.)"
    exit 1
fi

echo "On macOS, you can remove rules using:"
echo "  sudo /usr/libexec/ApplicationFirewall/socketfilterfw --remove /usr/local/bin/node"
echo ""
