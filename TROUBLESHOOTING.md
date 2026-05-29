# Troubleshooting WebSocket Connection

## Step 1: Redémarrer les serveurs

Assurez-vous que les deux serveurs tournent :

```bash
# Terminal 1: Serveur Node
cd server
npm run dev

# Terminal 2: Vite (client)
cd client
npm run dev
```

Vérifiez que vous voyez ces logs du serveur :

```
[server] ✓ Server started on port 3001
[server] HTTP:      http://localhost:3001
[server] WebSocket: ws://localhost:3001/ws
[server] Health:    http://localhost:3001/api/health
[server] WS Test:   http://localhost:3001/test-ws
[server] Network:   http://192.168.x.x:3001  (...)
```

## Step 2: Tester depuis votre téléphone

### Test 1: HTTP Health Check (simplest test)
Ouvrez dans votre navigateur mobile:
```
http://192.168.x.x:3001/api/health
```
(remplacez 192.168.x.x par l'adresse IP affichée par le serveur)

**Résultat attendu**: Vous devriez voir du JSON avec `{"ok":true}`

Si ça ne marche pas → **Problema réseau / firewall**

### Test 2: WebSocket Debug Page
Ouvrez dans votre navigateur mobile:
```
http://192.168.x.x:3001/test-ws
```

**Résultat attendu**: Vous devriez voir `✓ WebSocket OPEN` et des messages reçus

Si ça marche → Le problème vient du client React

### Test 3: Vite dev server
Ouvrez dans votre navigateur mobile:
```
http://192.168.x.x:5173
```

**Résultat attendu**: L'app React charge

Vérifiez la console du navigateur (F12) pour voir si une erreur de connexion WebSocket apparaît.

## Diagnostics possibles

### "Pas de connexion au serveur HTTP"
- **Cause**: Le pare-feu/antivirus bloque le port 3001
- **Solution**: Vérifiez votre firewall Windows, ajoutez une exception pour Node.js

### "WebSocket Debug marche mais Vite ne marche pas"
- **Cause**: Problème avec le client React
- **Solution**: Vérifiez la console du navigateur pour les erreurs JavaScript

### "Rien ne marche"
- **Cause**: Les deux appareils ne sont pas sur le même réseau
- **Solution**: 
  - Assurez-vous que le téléphone est connecté au même WiFi que le PC
  - Vérifiez avec `ipconfig` (Windows) que l'adresse IP correspond au réseau
