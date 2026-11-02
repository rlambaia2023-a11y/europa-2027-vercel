import { useEffect, useRef, useState } from "react";
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { estadoOffline, aoMudarEstado, descartarFalhas } from "@/lib/offline";
import { sincronizarAgora } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

const quando = (ms) =>
  ms ? new Date(ms).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : null;

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// Mostra se está sem internet, quantas alterações esperam envio e quando sincronizou.
export default function OfflineBanner() {
  const [estado, setEstado] = useState(estadoOffline);
  const [acabouDeSincronizar, setAcabouDeSincronizar] = useState(false);
  const tinhaPendentes = useRef(estado.pendentes > 0);
  const queryClient = useQueryClient();

  useEffect(() => {
    const atualizar = () => setEstado(estadoOffline());
    const tirar = aoMudarEstado(atualizar);
    window.addEventListener("online", atualizar);
    window.addEventListener("offline", atualizar);
    return () => {
      tirar();
      window.removeEventListener("online", atualizar);
      window.removeEventListener("offline", atualizar);
    };
  }, []);

  // confirmação rápida quando a fila termina de subir
  useEffect(() => {
    if (tinhaPendentes.current && estado.pendentes === 0 && !estado.sincronizando && estado.online) {
      setAcabouDeSincronizar(true);
      const t = setTimeout(() => setAcabouDeSincronizar(false), 5000);
      tinhaPendentes.current = false;
      return () => clearTimeout(t);
    }
    if (estado.pendentes > 0) tinhaPendentes.current = true;
  }, [estado]);

  async function tentarAgora() {
    if (await sincronizarAgora()) queryClient.invalidateQueries();
  }

  const falhas = estado.falhas || [];

  if (falhas.length) {
    return (
      <div className="mb-5 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2.5 flex items-start gap-2 text-xs">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-destructive" />
        <div className="flex-1">
          <p className="font-semibold text-destructive">{plural(falhas.length, "alteração feita sem internet não pôde ser salva", "alterações feitas sem internet não puderam ser salvas")}</p>
          <p className="text-muted-foreground mt-0.5">
            O servidor recusou ({falhas[0].erro}). Confira e faça de novo, se precisar.
          </p>
        </div>
        <button onClick={descartarFalhas} className="shrink-0 p-1 text-muted-foreground hover:text-foreground" aria-label="Fechar aviso">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (!estado.online) {
    return (
      <div className="mb-5 rounded-xl border border-gold/50 bg-gold/10 px-3 py-2.5 flex items-start gap-2 text-xs text-primary">
        <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Sem internet — pode continuar usando</p>
          <p className="text-muted-foreground mt-0.5">
            {estado.pendentes
              ? `${plural(estado.pendentes, "alteração espera", "alterações esperam")} a conexão para ser enviada${estado.pendentes === 1 ? "" : "s"} automaticamente.`
              : "O que você criar ou mudar fica guardado no aparelho e é enviado quando a conexão voltar."}
            {estado.ultimaSync ? ` Dados da família atualizados em ${quando(estado.ultimaSync)}.` : ""}
          </p>
        </div>
      </div>
    );
  }

  if (estado.pendentes > 0 || estado.sincronizando) {
    return (
      <div className="mb-5 rounded-xl border border-border bg-secondary/60 px-3 py-2.5 flex items-center gap-2 text-xs text-primary">
        <RefreshCw className={`w-4 h-4 shrink-0 ${estado.sincronizando ? "animate-spin" : ""}`} />
        <p className="flex-1">
          {estado.sincronizando
            ? estado.pendentes ? `Enviando ${plural(estado.pendentes, "alteração", "alterações")} feitas sem internet…` : "Atualizando com o que a família mudou…"
            : `${plural(estado.pendentes, "alteração espera", "alterações esperam")} para ser enviada${estado.pendentes === 1 ? "" : "s"}.`}
        </p>
        {!estado.sincronizando && (
          <button onClick={tentarAgora} className="font-medium hover:opacity-80 shrink-0">Enviar agora</button>
        )}
      </div>
    );
  }

  if (acabouDeSincronizar) {
    return (
      <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 flex items-center gap-2 text-xs text-green-800">
        <CheckCircle2 className="w-4 h-4 shrink-0" /> Tudo sincronizado — o que você fez sem internet já está salvo para a família.
      </div>
    );
  }

  return null;
}
