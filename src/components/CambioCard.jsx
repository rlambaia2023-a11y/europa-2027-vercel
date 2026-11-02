import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightLeft, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "react-hot-toast";
import { base44, supabase } from "@/api/base44Client";
import { useCambio, useInvalidate } from "@/lib/useTrip";
import { cn } from "@/lib/utils";

const DOZE_HORAS = 12 * 3600 * 1000;
// o banco de dados dispara a atualização às 02h e às 14h (Brasília)
const HORARIOS_AGENDADOS = [2, 14];

const brl = (v, casas = 2) => v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

function haQuanto(ms) {
  const min = Math.round(ms / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  return h < 48 ? `há ${h} h` : `há ${Math.floor(h / 24)} dias`;
}

function proximaAtualizacao(agora = new Date()) {
  // horário de Brasília (UTC−3), sem horário de verão
  const brasilia = new Date(agora.getTime() - 3 * 3600 * 1000);
  const hora = brasilia.getUTCHours() + brasilia.getUTCMinutes() / 60;
  const proxima = HORARIOS_AGENDADOS.find((h) => h > hora) ?? HORARIOS_AGENDADOS[0];
  return `${String(proxima).padStart(2, "0")}:00`;
}

function useUltimaExecucao() {
  return useQuery({
    queryKey: ["cambio-execucao"],
    queryFn: async () => {
      const { data } = await supabase.from("cambio_execucoes").select("*").order("executado_em", { ascending: false }).limit(1);
      return data?.[0] || null;
    },
  });
}

export default function CambioCard() {
  const { data: cambio } = useCambio();
  const { data: execucao } = useUltimaExecucao();
  const invalidate = useInvalidate();
  const [atualizando, setAtualizando] = useState(false);
  const jaTentou = useRef(false);

  const taxa = cambio?.taxa || 0;
  const idade = cambio?.atualizado_em ? Date.now() - new Date(cambio.atualizado_em).getTime() : Infinity;
  const vencida = idade > DOZE_HORAS;
  const falhou = execucao && !execucao.ok && (!cambio?.atualizado_em || new Date(execucao.executado_em) > new Date(cambio.atualizado_em));

  async function atualizar(agora) {
    setAtualizando(true);
    try {
      const res = await base44.functions.invoke("AtualizarCambio", agora ? { agora: true } : {});
      if (agora) toast.success(res.data?.atualizado ? "Câmbio atualizado" : "O câmbio já está atualizado");
    } catch {
      if (agora) toast.error("Não deu para atualizar agora; mantida a última cotação.");
    } finally {
      invalidate([["cambio"], ["cambio-execucao"], ["despesas"]]);
      setAtualizando(false);
    }
  }

  // segunda garantia: se o agendamento não rodou, quem abrir o app atualiza
  useEffect(() => {
    if (cambio !== undefined && vencida && !jaTentou.current && navigator.onLine) {
      jaTentou.current = true;
      atualizar(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cambio, vencida]);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading text-lg font-semibold text-primary flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-accent" /> Câmbio euro ⇄ real
        </h2>
        <button onClick={() => atualizar(true)} disabled={atualizando}
          className="inline-flex items-center gap-1 text-xs text-accent font-medium hover:underline disabled:opacity-50"
          aria-label="Atualizar câmbio agora">
          {atualizando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {atualizando ? "Atualizando…" : "Atualizar agora"}
        </button>
      </div>

      {taxa > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-secondary/60 p-3">
            <p className="text-[11px] text-muted-foreground">€ 1 euro vale</p>
            <p className="font-heading text-2xl font-semibold text-primary">R$ {brl(taxa)}</p>
          </div>
          <div className="rounded-xl bg-secondary/60 p-3">
            <p className="text-[11px] text-muted-foreground">R$ 1 real vale</p>
            <p className="font-heading text-2xl font-semibold text-primary">€ {brl(1 / taxa, 3)}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Buscando a cotação…</p>
      )}

      <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
        <p>{cambio?.fonte || "—"}{cambio?.data ? ` · cotação de ${cambio.data.split("-").reverse().join("/")}` : ""}</p>
        <p className="flex items-center gap-1.5">
          <span className={cn("w-2 h-2 rounded-full", vencida ? "bg-amber-500" : "bg-green-600")} />
          {cambio?.atualizado_em ? `Atualizado ${haQuanto(idade)}` : "Ainda não atualizado automaticamente"}
          {" · "}atualiza sozinho a cada 12 h (próxima às {proximaAtualizacao()})
        </p>
        {falhou && (
          <p className="flex items-start gap-1.5 text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            A última tentativa de atualizar falhou; os valores usam a cotação acima até a próxima.
          </p>
        )}
      </div>
    </div>
  );
}
