#!/bin/bash
# Network connectivity test

echo ""
echo "[DIAGNOSTIC] Complete Network & Server Diagnostic"
echo ""

echo "=== PART 1: Server Status ==="

# Check port 3001
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "[OK] Port 3001: LISTENING (Server is running)"
else
    echo "[FAIL] Port 3001: NOT LISTENING (Server is NOT running)"
fi

# Check port 5173
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "[OK] Port 5173: LISTENING (Vite is running)"
else
    echo "[FAIL] Port 5173: NOT LISTENING (Vite is NOT running)"
fi

echo ""
echo "=== PART 2: Network Interfaces ==="

# Get non-loopback IPv4 addresses
IPS=$(ipconfig getifaddr en0 en1 en2 eth0 wlan0 2>/dev/null | grep -v 127)

if [ -z "$IPS" ]; then
    echo "[FAIL] No network interfaces found!"
else
    for ip in $IPS; do
        echo "[OK] Network IP: $ip"
    done
fi

echo ""
echo "=== PART 3: Local Server Test ==="

# Test Node server
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "[OK] Node server responds"
else
    echo "[FAIL] Node server not responding"
fi

# Test Vite server
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "[OK] Vite server responds"
else
    echo "[FAIL] Vite server not responding"
fi

echo ""
echo "=== PART 4: Phone Connection Instructions ==="
echo ""
if [ -n "$IPS" ]; then
    for ip in $IPS; do
        echo "Test these URLs from your phone on the same WiFi:"
        echo "  1. http://${ip}:3001/api/health"
        echo "  2. http://${ip}:5173/"
    done
else
    echo "[ERROR] Could not detect network IP"
fi

echo ""
