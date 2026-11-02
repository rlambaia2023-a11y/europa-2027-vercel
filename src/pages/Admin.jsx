import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, ArrowRightLeft, Users, Save, ShieldCheck, Route } from "lucide-react";
import { useCambio, useViajantes, useCidades, useInvalidate } from "@/lib/useTrip";
import { base44 } from "@/api/base44Client";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { usePermissao } from "@/lib/usePermissao";
import { useAuth } from "@/lib/AuthContext";

const PAPEIS = [
  { id: "organizador", label: "Organizador", desc: "Edição total: roteiro, reservas, orçamento, câmbio e permissões" },
  { id: "editor", label: "Editor", desc: "Edita itinerário, despesas e diário; não altera permissões nem exclui reservas" },
  { id: "leitor", label: "Leitor", desc: "Visualiza tudo e contribui com o diário e fotos" },
];

export default function Admin() {
  const { data: cambio } = useCambio();
  const { data: viajantes } = useViajantes();
  const { data: cidades } = useCidades();
  const invalidate = useInvalidate();
  const qc = useQueryClient();
  const { organizador } = usePermissao();
  const { checkUserAuth } = useAuth();
  const { data: contas } = useQuery({
    queryKey: ["contas"],
    enabled: organizador,
    queryFn: async () => {
      const res = await base44.functions.invoke("DefinirPapel", { acao: "listar" });
      return res.data?.contas || [];
    },
  });
  const cidadesNomes = (cidades || []).map((c) => c.nome).sort((a, b) => a.localeCompare(b));
  const [taxa, setTaxa] = useState(cambio?.taxa?.toString() || "");
  const [fonte, setFonte] = useState(cambio?.fonte || "");
  const [dataCot, setDataCot] = useState(cambio?.data || new Date().toISOString().slice(0, 10));

  useEffect(() => { if (cambio) { setTaxa(cambio.taxa.toString()); setFonte(cambio.fonte); setDataCot(cambio.data); } }, [cambio]);

  async function salvarCambio(e) {
    e.preventDefault();
    if (!taxa) return;
    try {
      if (cambio?.id) {
        await base44.entities.Cambio.update(cambio.id, { taxa: parseFloat(taxa), fonte, data: dataCot });
      } else {
        await base44.entities.Cambio.create({ taxa: parseFloat(taxa), fonte, data: dataCot });
      }
      toast.success("Câmbio atualizado — valores em BRL recalculados");
      invalidate([["cambio"], ["despesas"]]);
    } catch { toast.error("Erro ao atualizar câmbio"); }
  }

  async function definirPapel(v, mudanca, mensagem) {
    try {
      await base44.functions.invoke("DefinirPapel", { viajante_id: v.id, ...mudanca });
      toast.success(mensagem);
      invalidate([["viajantes"]]);
      qc.invalidateQueries({ queryKey: ["contas"] });
      checkUserAuth();
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.data?.error || "Erro ao atualizar permissão");
    }
  }

  const mudarPapel = (v, papel) =>
    definirPapel(v, { papel }, `${v.nome} agora é ${PAPEIS.find((p) => p.id === papel).label}`);

  const vincularConta = (v, user_id) =>
    definirPapel(v, { user_id }, user_id ? `Conta ligada a ${v.nome}` : `Conta desligada de ${v.nome}`);

  if (!organizador) {
    return (
      <div className="space-y-4">
        <header>
          <p className="text-[11px] tracking-[0.2em] uppercase text-accent font-medium">Área do organizador</p>
          <h1 className="font-heading text-3xl font-semibold text-primary mt-1">Administração</h1>
        </header>
        <div className="bg-card rounded-2xl border border-border shadow-soft p-5 text-sm text-muted-foreground">
          Só o organizador da viagem acessa esta área. Se precisar mudar câmbio ou permissões, fale com ele.
        </div>
      </div>
    );
  }

  async function mudarTrecho(v, campo, valor) {
    try {
      await base44.entities.Viajante.update(v.id, { [campo]: valor || null });
      toast.success(`Trecho de ${v.nome} atualizado`);
      invalidate([["viajantes"]]);
    } catch { toast.error("Erro ao atualizar trecho"); }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] tracking-[0.2em] uppercase text-accent font-medium">Área do organizador</p>
        <h1 className="font-heading text-3xl font-semibold text-primary mt-1">Administração</h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
          Atualize o câmbio, as permissões dos viajantes e acompanhe reservas e roteiro.
        </p>
      </header>

      {/* Câmbio */}
      <section className="bg-card rounded-2xl border border-border shadow-soft p-5">
        <div className="flex items-center gap-2 mb-4">
          <ArrowRightLeft className="w-4 h-4 text-accent" />
          <h2 className="font-heading text-lg font-semibold text-primary">Câmbio EUR → BRL</h2>
        </div>
        <form onSubmit={salvarCambio} className="grid sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Taxa (R$ por € 1)</span>
            <input type="number" step="0.01" value={taxa} onChange={(e) => setTaxa(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Data da cotação</span>
            <input type="date" value={dataCot} onChange={(e) => setDataCot(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Fonte</span>
            <input value={fonte} onChange={(e) => setFonte(e.target.value)} placeholder="Banco Central do Brasil"
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </label>
          <div className="sm:col-span-3">
            <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
              <Save className="w-4 h-4" /> Salvar câmbio
            </button>
          </div>
        </form>
      </section>

      {/* Permissões */}
      <section className="bg-card rounded-2xl border border-border shadow-soft p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-accent" />
          <h2 className="font-heading text-lg font-semibold text-primary">Permissões dos viajantes</h2>
        </div>
        <div className="space-y-3">
          {(viajantes || []).map((v) => (
            <div key={v.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-border">
              <div className="flex items-center gap-3 flex-1">
                <span className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ background: v.cor }}>{v.iniciais}</span>
                <div>
                  <p className="font-medium text-sm">{v.nome}</p>
                  <p className="text-[11px] text-muted-foreground">{PAPEIS.find((p) => p.id === v.papel)?.label || v.papel}</p>
                </div>
              </div>
              <select value={v.user_id || ""} onChange={(e) => vincularConta(v, e.target.value)}
                aria-label={`Conta de ${v.nome}`}
                className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm max-w-[220px] focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Sem conta ligada</option>
                {(contas || []).map((c) => <option key={c.id} value={c.id}>{c.nome}{c.admin ? " (admin)" : ""}</option>)}
              </select>
              <div className="flex gap-1.5">
                {PAPEIS.map((p) => (
                  <button key={p.id} onClick={() => mudarPapel(v, p.id)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                      v.papel === p.id ? "bg-accent text-accent-foreground border-accent" : "border-border text-muted-foreground hover:border-accent")}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          O papel só vale para quem tem a conta ligada ao viajante. Contas sem viajante entram como Leitor; o admin do app é sempre Organizador.
        </p>
        <div className="mt-4 space-y-2">
          {PAPEIS.map((p) => (
            <div key={p.id} className="flex gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
              <span><strong className="text-foreground">{p.label}:</strong> {p.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Trechos individuais */}
      <section className="bg-card rounded-2xl border border-border shadow-soft p-5">
        <div className="flex items-center gap-2 mb-4">
          <Route className="w-4 h-4 text-accent" />
          <h2 className="font-heading text-lg font-semibold text-primary">Trechos individuais</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Cidade onde cada viajante entra e sai da viagem.</p>
        <div className="space-y-3">
          {(viajantes || []).map((v) => (
            <div key={v.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-border">
              <div className="flex items-center gap-3 flex-1">
                <span className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ background: v.cor }}>{v.iniciais}</span>
                <p className="font-medium text-sm">{v.nome}</p>
              </div>
              <div className="flex items-center gap-2">
                <select value={v.cidade_inicio || ""} onChange={(e) => mudarTrecho(v, "cidade_inicio", e.target.value)}
                  className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Entrada…</option>
                  {cidadesNomes.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="text-muted-foreground text-xs">→</span>
                <select value={v.cidade_fim || ""} onChange={(e) => mudarTrecho(v, "cidade_fim", e.target.value)}
                  className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Saída…</option>
                  {cidadesNomes.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-card rounded-2xl border border-border shadow-soft p-5">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-4 h-4 text-accent" />
          <h2 className="font-heading text-lg font-semibold text-primary">Demais edições</h2>
        </div>
        <p className="text-sm text-muted-foreground">Roteiro, reservas, despesas, documentos e diário são editados diretamente em suas páginas. Alterar o roteiro nunca apaga reservas já registradas.</p>
      </section>
    </div>
  );
}