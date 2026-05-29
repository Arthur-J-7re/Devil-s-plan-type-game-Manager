#!/bin/bash
# Network connectivity test

echo ""
echo "[TEST] Local Connectivity Tests"
echo ""

test_url() {
    local name=$1
    local url=$2
    
    echo "Testing: $name"
    echo "URL: $url"
    
    if curl -s --connect-timeout 2 "$url" > /dev/null 2>&1; then
        echo "[OK] SUCCESS"
    else
        echo "[FAIL] Connection failed"
    fi
    echo ""
}

test_url "1. Local HTTP API" "http://localhost:3001/api/health"
test_url "2. Local WebSocket Debug" "http://localhost:3001/test-ws"
test_url "3. Vite Dev Server" "http://localhost:5173"

echo ""
echo "[INFO] Summary:"
echo "- If tests 1-2 fail: Node server not running"
echo "- If test 3 fails: Vite dev server not running"
echo "- If all pass but phone fails: Check firewall"
echo ""

echo "[CHECK] Checking if ports are listening..."
echo ""

for port in 3001 5173; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "[OK] Port $port: LISTENING"
    else
        echo "[FAIL] Port $port: NOT LISTENING"
    fi
done

echo ""
