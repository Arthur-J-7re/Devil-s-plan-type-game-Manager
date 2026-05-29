import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Monitor, Wifi, WifiOff, Zap } from 'lucide-react';
import { useStore } from '@/lib/store';

async function detectConnectionInfo(path: string): Promise<{ url: string; isNgrok: boolean }> {
  const fallback = { url: `${location.protocol}//${location.host}${path}`, isNgrok: false };
  const currentHost = location.hostname;
  
  // Try to get optimal connection URL from server
  try {
    const r = await fetch('/api/connection-url');
    const data = (await r.json()) as { 
      url?: string;
      isNgrok?: boolean;
      type?: string;
    };
    
    if (data.url) {
      // Use the URL from server (ngrok or local IP)
      return {
        url: `${data.url}${path}`,
        isNgrok: data.isNgrok ?? false,
      };
    }
  } catch {
    // ignore
  }

  // Si le MJ est déjà sur une IP LAN (pas localhost), on garde tel quel
  if (currentHost && currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
    return fallback;
  }
  
  // Fallback to local IP detection
  try {
    const r = await fetch('/api/network');
    const { ips } = (await r.json()) as { ips: string[] };
    if (ips && ips.length > 0) {
      return {
        url: `${location.protocol}//${ips[0]}:${location.port || '5173'}${path}`,
        isNgrok: false,
      };
    }
  } catch {
    // ignore
  }
  
  return fallback;
}

export function QRPanel() {
  const tournament = useStore((s) => s.tournament);
  const [url, setUrl] = useState<string>('');
  const [showUrl, setShowUrl] = useState<string>('');
  const [isNgrok, setIsNgrok] = useState(false);

  useEffect(() => {
    detectConnectionInfo('/play').then((info) => {
      setUrl(info.url);
      setIsNgrok(info.isNgrok);
    });
    detectConnectionInfo('/show').then((info) => {
      setShowUrl(info.url);
    });
  }, []);

  const connected = tournament?.players.filter((p) => p.connected).length ?? 0;
  const total = tournament?.players.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Connexion joueurs</CardTitle>
        <CardDescription>
          Les joueurs scannent ce QR depuis leur téléphone.
          {isNgrok && ' (Connecté via ngrok - marche partout)'}
          {!isNgrok && ' (Même Wi-Fi requis)'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isNgrok && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-2 flex items-center gap-2 text-xs">
            <Zap className="h-4 w-4 text-amber-600" />
            <span className="text-amber-700">
              <strong>ngrok activé :</strong> Vos joueurs peuvent se connecter depuis n'importe quel réseau
            </span>
          </div>
        )}
        <div className="rounded-md bg-white p-3 flex justify-center">
          {url && (
            <QRCodeSVG
              value={url}
              size={200}
              level="M"
              includeMargin={false}
            />
          )}
        </div>
        <div className="text-center text-xs text-muted-foreground break-all">{url}</div>
        <div className="flex items-center justify-center gap-2 text-sm">
          {isNgrok && <Zap className="h-4 w-4 text-amber-500" />}
          {connected > 0 ? (
            <Wifi className="h-4 w-4 text-emerald-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-muted-foreground" />
          )}
          <span>
            {connected} / {total} connectés
          </span>
          {connected > 0 && (
            <Badge variant="secondary" className="ml-1">
              live
            </Badge>
          )}
        </div>
        {showUrl && (
          <div className="border-t pt-3 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Monitor className="h-3.5 w-3.5" />
              <span>Écran projection (lecture seule) :</span>
            </div>
            <a
              href={showUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 break-all text-primary hover:underline"
            >
              {showUrl}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
