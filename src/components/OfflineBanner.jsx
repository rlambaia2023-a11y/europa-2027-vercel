import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { ultimaSincronizacao } from "@/lib/offlineCache";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const ir = () => setOffline(false);
    const vir = () => setOffline(true);
    window.addEventListener("online", ir);
    window.addEventListener("offline", vir);
    return () => {
      window.removeEventListener("online", ir);
      window.removeEventListener("offline", vir);
    };
  }, []);

  if (!offline) return null;

  const ultima = ultimaSincronizacao();
  const texto = ultima
    ? new Date(ultima).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="mb-5 rounded-xl border border-gold/50 bg-gold/10 px-3 py-2.5 flex items-start gap-2 text-xs text-primary">
      <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold">Modo offline</p>
        <p className="text-muted-foreground">
          Sem conexão. O itinerário e os documentos salvos no aparelho continuam disponíveis
          {texto ? ` — última sincronização em ${texto}.` : "."}
        </p>
      </div>
      <button onClick={() => window.location.reload()} className="ml-auto inline-flex items-center gap-1 font-medium hover:opacity-80 shrink-0">
        <RefreshCw className="w-3.5 h-3.5" /> Tentar
      </button>
    </div>
  );
}