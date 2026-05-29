#!/bin/bash
# Setup ngrok for development

echo ""
echo "[NGROK] Setup ngrok Tunnel"
echo ""

# Check if ngrok is already installed
if command -v ngrok &> /dev/null; then
    echo "[OK] ngrok is already installed"
    ngrok --version
    echo ""
fi

# Check if running on Linux
if [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "linux"* ]]; then
    echo "[INFO] Linux detected - installing ngrok from source"
    echo ""
    
    # Install unzip if needed
    if ! command -v unzip &> /dev/null; then
        echo "[1] Installing unzip..."
        sudo apt update
        sudo apt install -y unzip
    fi
    
    # Download and install ngrok
    echo "[2] Downloading ngrok..."
    cd /tmp
    wget -q https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.zip
    
    echo "[3] Extracting ngrok..."
    unzip -o ngrok-v3-stable-linux-amd64.zip > /dev/null
    
    echo "[4] Installing to /usr/local/bin..."
    sudo mv ngrok /usr/local/bin/
    
    echo "[OK] ngrok installed!"
    ngrok --version
    echo ""
fi

# Get auth token
echo "[INFO] You need an ngrok auth token:"
echo ""
echo "1. Go to: https://dashboard.ngrok.com/get-started/your-authtoken"
echo "2. Copy your auth token"
echo ""

read -p "Paste your ngrok auth token: " authToken

if [ -z "$authToken" ]; then
    echo "[ERROR] No auth token provided"
    exit 1
fi

echo ""
echo "[SETUP] Configuring ngrok with your auth token..."
echo ""

ngrok config add-authtoken "$authToken"

echo ""
echo "[OK] ngrok configured!"
echo ""
echo "To start development with ngrok, run:"
echo "  ./dev-with-ngrok.sh"
echo ""
