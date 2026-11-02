import { useState } from "react";
import { Smartphone, ExternalLink, CheckCircle2, AlertTriangle, ChevronDown, ListPlus, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { base44 } from "@/api/base44Client";
import { useChecklist, useViajantes, useInvalidate } from "@/lib/useTrip";
import { RECOMENDACAO, ALTERNATIVAS, DICAS, PAISES, TAREFAS_ESIM } from "@/lib/conectividade";
import { cn } from "@/lib/utils";

function LinkExterno({ href, children, className }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={cn("inline-flex items-center gap-1 hover:underline", className)}>
      {children} <ExternalLink className="w-3 h-3" />
    </a>
  );
}

// Cartão da página Documentos: como ter internet nos 4 países e onde comprar chip/eSIM.
export default function InternetCelular() {
  const { data: itens } = useChecklist();
  const { data: viajantes } = useViajantes();
  const invalidate = useInvalidate();
  const [aberto, setAberto] = useState(false);
  const [criando, setCriando] = useState(false);

  const jaTem = (tarefa, nome) => (itens || []).some((i) => i.item === tarefa && i.viajante_nome === nome);
  const faltando = (viajantes || []).flatMap((v) => TAREFAS_ESIM.filter((t) => !jaTem(t, v.nome)).map((t) => ({ item: t, viajante_nome: v.nome })));

  async function criarTarefas() {
    setCriando(true);
    try {
      await base44.entities.ChecklistItem.bulkCreate(faltando.map((t) => ({ ...t, categoria: "Internet", concluido: false })));
      invalidate([["checklist"]]);
      toast.success(`${faltando.length} tarefa(s) de internet adicionadas à checklist`);
    } catch {
      toast.error("Não deu para adicionar as tarefas");
    } finally {
      setCriando(false);
    }
  }

  return (
    <section className="bg-card rounded-2xl border border-border shadow-soft p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1">
          <h2 className="font-heading text-lg font-semibold text-primary">Internet no celular (eSIM)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Itália e Croácia são União Europeia. <strong className="text-foreground">Montenegro e Bósnia não</strong> — um eSIM "Europa" comum para de funcionar na fronteira.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-green-200 bg-green-50 p-3.5">
        <p className="text-xs font-semibold text-green-800 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" /> Recomendado: {RECOMENDACAO.titulo}
        </p>
        <p className="text-xs text-green-900/80 mt-1">{RECOMENDACAO.texto}</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <a href={RECOMENDACAO.link} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700">
            {RECOMENDACAO.rotuloLink} <ExternalLink className="w-3.5 h-3.5" />
          </a>
          {faltando.length > 0 ? (
            <button onClick={criarTarefas} disabled={criando}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-300 text-green-800 text-xs font-semibold hover:bg-green-100 disabled:opacity-50">
              {criando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ListPlus className="w-3.5 h-3.5" />}
              Pôr na checklist de todos
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-green-800">
              <CheckCircle2 className="w-3.5 h-3.5" /> Tarefas de eSIM já estão na checklist
            </span>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2.5">
        {Object.entries(PAISES).map(([pais, info]) => (
          <div key={pais} className={cn("rounded-xl border p-3", info.ue ? "border-border" : "border-amber-300 bg-amber-50/60")}>
            <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
              {!info.ue && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />} {pais}
              <span className={cn("ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full", info.ue ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900")}>
                {info.ue ? "UE" : "fora da UE"}
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">{info.resumo}</p>
            <p className="text-[11px] mt-2"><span className="font-medium text-foreground">Chip local:</span>{" "}
              {info.operadoras.map((o, i) => (
                <span key={o.nome}>
                  {i > 0 && " · "}
                  {o.url ? <LinkExterno href={o.url} className="text-accent">{o.nome}</LinkExterno> : o.nome}
                  {o.destaque && <span className="text-muted-foreground"> ({o.destaque})</span>}
                </span>
              ))}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1"><span className="font-medium text-foreground">Onde comprar:</span> {info.ondeComprar}</p>
          </div>
        ))}
      </div>

      <button onClick={() => setAberto((v) => !v)} className="text-xs font-medium text-accent inline-flex items-center gap-1">
        <ChevronDown className={cn("w-4 h-4 transition-transform", aberto && "rotate-180")} />
        {aberto ? "Esconder" : "Ver"} outras opções e dicas
      </button>
      {aberto && (
        <div className="space-y-3">
          {ALTERNATIVAS.map((a) => (
            <div key={a.titulo} className="rounded-xl bg-secondary/50 p-3">
              <p className="text-xs font-semibold text-primary">{a.titulo}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{a.texto}</p>
              {a.links && (
                <div className="mt-1.5 flex flex-wrap gap-3 text-[11px]">
                  {a.links.map((l) => <LinkExterno key={l.url} href={l.url} className="text-accent font-medium">{l.rotulo}</LinkExterno>)}
                </div>
              )}
            </div>
          ))}
          <ul className="space-y-1.5">
            {DICAS.map((d) => (
              <li key={d} className="text-[11px] text-foreground/80 flex gap-1.5"><span className="text-accent">•</span>{d}</li>
            ))}
          </ul>
          <p className="text-[10px] text-muted-foreground">Pesquisa de novembro/2026. Preços aproximados — confira no site antes de comprar.</p>
        </div>
      )}
    </section>
  );
}

// Aviso no dia do itinerário quando a cidade fica fora da UE
export function AvisoInternetDia({ pais, cidade }) {
  const info = PAISES[pais];
  if (!info || info.ue) return null;
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-xs text-amber-900 flex gap-2">
      <Smartphone className="w-4 h-4 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold">Internet em {pais}: fora da União Europeia</p>
        <p className="mt-0.5">
          eSIM "Europa" comum não funciona aqui — só Eurolink, eSIM Bálcãs ou chip local.
          Em {cidade}: {info.ondeComprar.charAt(0).toLowerCase() + info.ondeComprar.slice(1)}
        </p>
      </div>
    </div>
  );
}
