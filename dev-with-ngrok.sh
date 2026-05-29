#!/bin/bash
# Start development with ngrok tunnel

set -e  # Exit on any error (so we see the error)

echo ""
echo "[START] Launching development with ngrok..."
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "[ERROR] ngrok not found in PATH"
    echo ""
    echo "Please install ngrok:"
    echo "  ./ngrok-setup.sh"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo "[OK] ngrok found: $(which ngrok)"
ngrok --version
echo ""

# Kill any existing ngrok processes
echo "[1] Cleaning up old ngrok processes..."
pkill -f "ngrok http" 2>/dev/null || true
sleep 1

echo "[2] Starting ngrok tunnel for CLIENT (port 5173)..."
echo ""
echo "Note: ngrok free tier allows ONE tunnel. This exposes the CLIENT."
echo "The app will auto-detect server URL via /api/connection-url"
echo ""

# Create ngrok log file
NGROK_LOG="/tmp/ngrok-client-$(date +%s).log"

# Start ngrok for client (5173)
ngrok http 5173 --log=stdout --log-level=error > "$NGROK_LOG" 2>&1 &
NGROK_PID_CLIENT=$!

echo "    Client ngrok PID: $NGROK_PID_CLIENT"

# Wait for ngrok to be ready
echo "    Waiting for ngrok tunnel to be ready..."
sleep 3

MAX_WAIT=10
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
        echo "[OK] ngrok tunnel is ready!"
        break
    fi
    WAIT_COUNT=$((WAIT_COUNT + 1))
    sleep 1
done

# Get ngrok URL
CLIENT_NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o 'https://[^"]*' | head -1 || echo "")

if [ -n "$CLIENT_NGROK_URL" ]; then
    echo ""
    echo "[OK] Your app is live at:"
    echo "    $CLIENT_NGROK_URL"
    echo ""
    echo "    QR Code will show this URL automatically!"
fi

echo ""
echo "[3] Starting development servers..."
echo ""

# Run dev servers (no ngrok in npm dev now)
npm run dev

# Cleanup
EXIT_CODE=$?
echo ""
echo "[INFO] Stopping ngrok..."
kill $NGROK_PID_CLIENT 2>/dev/null || true
wait $NGROK_PID_CLIENT 2>/dev/null || true

echo "[INFO] Done"
exit $EXIT_CODE
