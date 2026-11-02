import { useState } from "react";
import { Briefcase, FileText, Sparkles, Loader2 } from "lucide-react";
import { useChecklist, useViajantes, useInvalidate } from "@/lib/useTrip";
import { base44 } from "@/api/base44Client";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import ListaBagagem from "@/components/bagagem/ListaBagagem";

const CAT = { essenciais: "bagagem:essenciais", documentos: "bagagem:documentos" };
const CATS = [CAT.essenciais, CAT.documentos];

const SUGESTOES = {
  [CAT.essenciais]: [
    "Roupas para os 13 dias",
    "Casaco corta-vento e agasalho",
    "Calçado confortável para caminhar",
    "Adaptador de tomada europeu",
    "Carregadores e power bank",
    "Kit de higiene pessoal",
    "Remédios de uso contínuo",
    "Óculos de sol",
    "Roupa de banho",
    "Mochila pequena para passeios",
    "Guarda-chuva compacto",
  ],
  [CAT.documentos]: [
    "Passaporte válido",
    "RG",
    "CNH + Permissão Internacional para Dirigir",
    "Apólice do seguro-viagem",
    "Passagens aéreas e reservas impressas",
    "Cartão internacional habilitado",
    "Cópias digitais dos documentos",
  ],
};

export default function Bagagem() {
  const { data: itens, isLoading } = useChecklist();
  const { data: viajantes } = useViajantes();
  const invalidate = useInvalidate();
  const [aba, setAba] = useState("TODOS");
  const [semeando, setSemeando] = useState(false);

  const bagagem = (itens || []).filter((i) => CATS.includes(i.categoria));
  const isTodos = aba === "TODOS";
  const viajante = (viajantes || []).find((v) => v.nome === aba);
  const meusItens = isTodos ? bagagem : bagagem.filter((i) => i.viajante_nome === aba);
  const concluidos = meusItens.filter((i) => i.concluido).length;

  async function carregarSugestoes() {
    if (!viajante) return;
    setSemeando(true);
    try {
      await base44.entities.ChecklistItem.bulkCreate(
        CATS.flatMap((categoria) =>
          SUGESTOES[categoria].map((item) => ({ item, categoria, viajante_nome: viajante.nome, concluido: false }))
        )
      );
      toast.success(`Lista sugerida adicionada para ${viajante.nome}`);
      invalidate([["checklist"]]);
    } catch { toast.error("Erro ao adicionar as sugestões"); }
    finally { setSemeando(false); }
  }

  const secao = (categoria) => ({
    categoria,
    itens: meusItens.filter((i) => i.categoria === categoria),
    viajanteNome: isTodos ? null : aba,
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] tracking-[0.2em] uppercase text-accent font-medium">Antes de fechar a mala</p>
        <h1 className="font-heading text-3xl font-semibold text-primary mt-1">Checklist de bagagem</h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
          Cada viajante marca o que já colocou na mala, separado entre itens essenciais e documentos pessoais.
        </p>
      </header>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <button onClick={() => setAba("TODOS")}
          className={cn("flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm font-medium whitespace-nowrap transition-colors",
            isTodos ? "border-accent bg-accent/10 text-accent" : "border-border bg-card text-muted-foreground hover:border-accent/50")}>
          <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white bg-primary">✓</span>
          Todos
          <span className="text-[11px] text-muted-foreground">{bagagem.filter((i) => i.concluido).length}/{bagagem.length}</span>
        </button>
        {(viajantes || []).map((v) => {
          const itensV = bagagem.filter((i) => i.viajante_nome === v.nome);
          return (
            <button key={v.id} onClick={() => setAba(v.nome)}
              className={cn("flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm font-medium whitespace-nowrap transition-colors",
                aba === v.nome ? "border-accent bg-accent/10 text-accent" : "border-border bg-card text-muted-foreground hover:border-accent/50")}>
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white" style={{ background: v.cor }}>{v.iniciais}</span>
              {v.nome}
              <span className="text-[11px] text-muted-foreground">{itensV.filter((i) => i.concluido).length}/{itensV.length}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-soft p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{isTodos ? "Todos os viajantes" : `${viajante?.nome} · mala pronta`}</p>
          <p className="font-heading text-xl font-semibold text-primary">{concluidos} de {meusItens.length} itens na mala</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-28 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-green-600 rounded-full" style={{ width: meusItens.length ? `${(concluidos / meusItens.length) * 100}%` : "0%" }} />
          </div>
          {!isTodos && meusItens.length === 0 && (
            <button onClick={carregarSugestoes} disabled={semeando}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-60">
              {semeando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Usar lista sugerida
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">Carregando a bagagem…</div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4 items-start">
          <ListaBagagem key={`ess-${aba}`} titulo="Itens essenciais" Icon={Briefcase}
            descricao="Roupas, adaptadores, remédios e o que não pode faltar na mala." {...secao(CAT.essenciais)} viajantes={viajantes || []} />
          <ListaBagagem key={`doc-${aba}`} titulo="Documentos pessoais" Icon={FileText}
            descricao="Passaporte, habilitação, seguro e comprovantes de cada viajante." {...secao(CAT.documentos)} viajantes={viajantes || []} />
        </div>
      )}
    </div>
  );
}