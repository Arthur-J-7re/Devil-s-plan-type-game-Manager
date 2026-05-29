#!/bin/bash
# Start ngrok tunnel only (points to client port 5173)

echo ""
echo "[NGROK] Starting tunnel on port 5173 (client)..."
echo ""

if ! command -v ngrok &> /dev/null; then
    echo "[ERROR] ngrok not found. Please run: ./ngrok-setup.sh"
    exit 1
fi

echo "Save this URL - you'll use it from your phone!"
echo ""
echo "================================================"
echo ""

# Kill any existing ngrok on 5173
pkill -f "ngrok http 5173" 2>/dev/null || true
sleep 1

ngrok http 5173
