# Development Workflow

## Local Development (same WiFi required)

```bash
npm run dev
```

Clients connect from phone using local IP:
- QR code automatically detects your IP
- Phone must be on the same WiFi

## Development with ngrok (any network)

### Setup (first time only)

1. Install ngrok: https://ngrok.com/download
2. Create account: https://ngrok.com/signup (free)
3. Get auth token: https://dashboard.ngrok.com/get-started/your-authtoken

### Run with ngrok

```bash
npm run dev:ngrok
```

This will start:
- ngrok tunnel (cyan)
- Node server (blue)
- Vite client (magenta)

The QR code in the app will automatically update with the ngrok URL.

Clients can now connect from ANY network!

### Important Notes

- ngrok generates a new URL each restart
- The URL shows in the ngrok terminal window
- Share the QR code or URL from the app dashboard
- Connection is encrypted (wss://)

---

## How it Works

### Automatic URL Detection

1. Client requests `/api/connection-url` from server
2. Server checks if ngrok is running on `localhost:4040`
3. If ngrok detected → returns tunnel URL
4. If not → returns local IP address
5. QR code generates with the optimal URL

### Connection Flow

```
[Phone with hotspot]
       ↓
   [ngrok tunnel]  ← if running
       ↓
   [Server:3001]
       ↓
   [WebSocket connection]
```

---

## Troubleshooting

- `npm run dev` won't work if phone is on a hotspot
- Use `npm run dev:ngrok` for hotspot/external networks
- Make sure ngrok is installed and configured
- Check ngrok status at http://localhost:4040

---

## Scripts Available

```bash
npm run dev          # Local development
npm run dev:ngrok    # With ngrok tunnel
npm run dev:server   # Server only
npm run dev:client   # Client only
npm run build        # Build both
npm start            # Start production server
```
