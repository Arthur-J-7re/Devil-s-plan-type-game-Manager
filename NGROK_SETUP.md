# How to Use ngrok for Development

## Quick Start

### 1. Install ngrok
- Download: https://ngrok.com/download
- Extract to a known location (e.g., `C:\Program Files\ngrok`)

### 2. Get your auth token
- Sign up: https://ngrok.com/signup (free)
- Get token: https://dashboard.ngrok.com/get-started/your-authtoken
- Copy it

### 3. Setup ngrok
```powershell
cd C:\Users\arthu\Documents\dev_projet\jds
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\ngrok-setup.ps1
```
- Paste your auth token when prompted

### 4. Start ngrok
```powershell
.\ngrok-start.ps1
```

You'll see:
```
Forwarding   https://abc123.ngrok.io -> http://localhost:3001
```

### 5. Start your servers (new terminals)
```bash
# Terminal 1
cd server
npm run dev

# Terminal 2
cd client
npm run dev
```

### 6. Connect from phone

**Method 1: Query parameter**
```
https://abc123.ngrok.io/?wsServer=https://abc123.ngrok.io
```

**Method 2: Set in .env.local**
```
VITE_SERVER_URL=https://abc123.ngrok.io
```

Then restart Vite client and open:
```
https://abc123.ngrok.io
```

---

## How it works

The client WebSocket connection now supports:
1. Query parameter: `?wsServer=https://abc123.ngrok.io`
2. Environment variable: `VITE_SERVER_URL` in `.env.local`
3. localStorage: Automatically stored from query param
4. Default: localhost:3001

Choose any method, they all work!

---

## Important Notes

- ngrok generates a **new URL each time** you restart
- Update your phone's URL each time you restart ngrok
- Keep ngrok terminal running while developing
- The connection is encrypted (https/wss)

## If you have issues

1. Make sure both servers are running (3001 and 5173)
2. Check ngrok is forwarding correctly
3. Verify port 3001 traffic reaches ngrok
4. Try a fresh browser window on your phone (clear cache)

---

## Alternative: Static ngrok subdomain

Get ngrok Pro ($5/month) for static subdomains - URL stays the same across restarts.
More info: https://ngrok.com/docs/agentless-architecture/
