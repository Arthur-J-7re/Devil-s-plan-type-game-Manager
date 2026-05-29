# 🎯 Quick Start Guide

## Vous êtes sur un **WiFi local** (même réseau MJ/Joueurs)

Double-cliquez sur : **`dev.bat`**

→ Le QR code s'affiche automatiquement dans l'app

---

## Vous êtes sur un **hotspot téléphone** (réseaux différents)

### Option 1: Setup rapide (conseillé)

1. **Première fois seulement** :
   ```
   Double-cliquez : ngrok-setup.bat
   ```
   (Copiez votre auth token ngrok)

2. **À chaque session** :
   ```
   Double-cliquez : dev-with-ngrok.bat
   ```

3. **Les joueurs** scannent le QR code (il contient l'URL ngrok)

### Option 2: Manuel (plus de contrôle)

```powershell
# Ouvrez une nouvelle fenêtre PowerShell pour chaque commande

# Terminal 1: Lancez ngrok
ngrok http 3001

# Terminal 2: Lancez les serveurs
npm run dev:ngrok
```

---

## 📱 Flux pour les joueurs

1. **Scannez le QR code** avec votre téléphone
2. Acceptez les permissions
3. Entrez votre pseudo
4. C'est bon ! 🎮

---

## 🔧 Troubleshooting

| Problème | Solution |
|----------|----------|
| QR code pas visible | Vérifiez que vous êtes sur l'écran "Dashboard" |
| Connexion impossible | Vérifiez que les serveurs tournent (logs bleus/magentas) |
| ngrok ne démarre pas | Vérifiez que ngrok est installé et dans PATH |
| Connexion lente | C'est normal avec ngrok, la latence réseau augmente un peu |

---

## 📚 Fichiers disponibles

```
dev.bat                    # Lanceur simple (WiFi local)
dev-with-ngrok.bat         # Lanceur avec ngrok (hotspot)
ngrok-setup.bat            # Configuration initiale ngrok
ngrok-start.bat            # Démarrer ngrok seul
firewall-open.bat          # Ouvrir les ports
firewall-close.bat         # Fermer les ports
diagnostic.bat             # Diagnostic réseau complet
DEV_WORKFLOW.md            # Documentation technique
```

---

## ⚡ Commands NPM disponibles

```bash
npm run dev              # Local dev (WiFi required)
npm run dev:ngrok        # Dev with ngrok tunnel
npm run dev:server       # Server only
npm run dev:client       # Client only
npm run build            # Build both
npm start                # Production server
```

---

## 🌐 URLs

- **Dev Server**: http://localhost:3001
- **Vite Client**: http://localhost:5173
- **ngrok API**: http://localhost:4040 (si ngrok active)
- **WebSocket**: ws://[HOST]:3001/ws
