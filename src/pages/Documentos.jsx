import { useState } from "react";
import { motion } from "framer-motion";
import { FileCheck, Plus, CheckCircle2, Circle, Trash2, X, ShieldCheck, FileText, Car, CreditCard, Smartphone } from "lucide-react";
import { useChecklist, useViajantes, useInvalidate } from "@/lib/useTrip";
import { base44 } from "@/api/base44Client";
import { toast } from "react-hot-toast";
import { usePermissao } from "@/lib/usePermissao";
import { cn } from "@/lib/utils";
import InternetCelular from "@/components/InternetCelular";

const CAT_ICON = {
  Documentos: FileText,
  Seguros: ShieldCheck,
  Carro: Car,
  Finanças: CreditCard,
  Internet: Smartphone,
};

export default function Documentos() {
  const { data: itens, isLoading } = useChecklist();
  const { data: viajantes } = useViajantes();
  const invalidate = useInvalidate();
  const { podeMexerNoRegistro } = usePermissao();
  const [aba, setAba] = useState("TODOS");
  const [adicionando, setAdicionando] = useState(false);

  const isTodos = aba === "TODOS";
  const viajante = isTodos ? null : (viajantes || []).find((v) => v.nome === aba);
  const nomeSel = isTodos ? "TODOS" : viajante?.nome;
  const itensDoc = (itens || []).filter((i) => !String(i.categoria || "").startsWith("bagagem:"));
  const meusItens = isTodos ? itensDoc : itensDoc.filter((i) => i.viajante_nome === nomeSel);
  const categorias = [...new Set(meusItens.map((i) => i.categoria))];
  const concluidos = meusItens.filter((i) => i.concluido).length;

  async function toggle(item) {
    try {
      await base44.entities.ChecklistItem.update(item.id, { concluido: !item.concluido });
      invalidate([["checklist"]]);
    } catch { toast.error("Erro"); }
  }
  async function remover(id) {
    try { await base44.entities.ChecklistItem.delete(id); toast.success("Removido"); invalidate([["checklist"]]); }
    catch { toast.error("Erro"); }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] tracking-[0.2em] uppercase text-accent font-medium">Checklist</p>
        <h1 className="font-heading text-3xl font-semibold text-primary mt-1">Documentos e exigências</h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
          Passaportes, seguro-viagem, habilitação internacional e exigências de cada país. Marque por viajante.
        </p>
      </header>

      <InternetCelular />

      {/* Seletor de viajante */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <button onClick={() => setAba("TODOS")}
          className={cn("flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm font-medium whitespace-nowrap transition-colors",
            isTodos ? "border-accent bg-accent/10 text-accent" : "border-border bg-card text-muted-foreground hover:border-accent/50")}>
          <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white bg-primary">✓</span>
          Todos
          <span className="text-[11px] text-muted-foreground">{itensDoc.filter((i) => i.concluido).length}/{itensDoc.length}</span>
        </button>
        {(viajantes || []).map((v) => {
          const itensV = itensDoc.filter((i) => i.viajante_nome === v.nome);
          const ok = itensV.filter((i) => i.concluido).length;
          return (
            <button key={v.id} onClick={() => setAba(v.nome)}
              className={cn("flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm font-medium whitespace-nowrap transition-colors",
                nomeSel === v.nome ? "border-accent bg-accent/10 text-accent" : "border-border bg-card text-muted-foreground hover:border-accent/50")}>
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white" style={{ background: v.cor }}>{v.iniciais}</span>
              {v.nome}
              <span className="text-[11px] text-muted-foreground">{ok}/{itensV.length}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{isTodos ? "Todos os viajantes" : `${viajante.nome} · ${viajante.papel}`}</p>
            <p className="font-heading text-xl font-semibold text-primary">{concluidos} de {meusItens.length} concluídos</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-28 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-green-600 rounded-full" style={{ width: meusItens.length ? `${(concluidos / meusItens.length) * 100}%` : "0%" }} />
            </div>
            <button onClick={() => setAdicionando((v) => !v)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:border-accent">
              {adicionando ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {adicionando ? "Cancelar" : "Item"}
            </button>
          </div>
        </div>
      </div>

      {adicionando && <FormChecklist viajantes={viajantes || []} viajanteNome={isTodos ? "" : nomeSel} onDone={() => { setAdicionando(false); invalidate([["checklist"]]); }} />}

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">Carregando…</div>
      ) : (
        <div className="space-y-5">
          {categorias.map((cat) => {
            const Icon = CAT_ICON[cat] || FileCheck;
            const itensCat = meusItens.filter((i) => i.categoria === cat);
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-accent" />
                  <h2 className="font-heading text-base font-semibold text-primary">{cat}</h2>
                </div>
                <div className="space-y-2">
                  {itensCat.map((item, i) => (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      className="bg-card rounded-xl border border-border shadow-soft p-3.5 flex items-center gap-3">
                      <button onClick={() => toggle(item)} className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                        item.concluido ? "bg-green-600 border-green-600 text-white" : "border-border hover:border-accent")}>
                        {item.concluido ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3 opacity-0" />}
                      </button>
                      <span className={cn("text-sm flex-1", item.concluido && "text-muted-foreground line-through")}>{item.item}</span>
                      {isTodos && item.viajante_nome && (
                        <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full whitespace-nowrap">{item.viajante_nome}</span>
                      )}
                      {item.observacao && <span className="text-[11px] text-muted-foreground hidden sm:block">{item.observacao}</span>}
                      {podeMexerNoRegistro(item) && <button onClick={() => remover(item.id)} className="text-muted-foreground hover:text-destructive p-1" aria-label="Remover"><Trash2 className="w-4 h-4" /></button>}
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Exigências por país */}
      <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
        <h2 className="font-heading text-lg font-semibold text-primary mb-3">Exigências por país</h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          {[
            { pais: "🇮🇹 Itália", reqs: "Schengen · passaporte válido · seguro €30.000" },
            { pais: "🇭🇷 Croácia", reqs: "Schengen (desde 2023) · passaporte válido" },
            { pais: "🇲🇪 Montenegro", reqs: "Passaporte válido · sem visto p/ turismo até 90 dias" },
            { pais: "🇧🇦 Bósnia e Herzegovina", reqs: "Passaporte válido · sem visto p/ turismo até 90 dias" },
          ].map((p) => (
            <div key={p.pais} className="rounded-xl border border-border p-3">
              <p className="font-medium">{p.pais}</p>
              <p className="text-xs text-muted-foreground mt-1">{p.reqs}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">Confirme sempre as exigências atualizadas junto aos consulados antes da viagem.</p>
      </div>
    </div>
  );
}

function FormChecklist({ viajantes, viajanteNome, onDone }) {
  const [form, setForm] = useState({
    item: "", categoria: "Documentos", observacao: "",
    viajante_nome: viajanteNome || viajantes[0]?.nome || "",
  });
  async function salvar(e) {
    e.preventDefault();
    if (!form.item.trim() || !form.viajante_nome) return;
    try {
      await base44.entities.ChecklistItem.create({ item: form.item, categoria: form.categoria, viajante_nome: form.viajante_nome, observacao: form.observacao, concluido: false });
      toast.success("Item adicionado"); onDone();
    } catch { toast.error("Erro"); }
  }
  return (
    <motion.form initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} onSubmit={salvar}
      className="bg-card rounded-2xl border border-border shadow-soft p-4 space-y-3">
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Item</span>
          <input value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} placeholder="Ex.: Visto Schengen"
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></label>
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Viajante</span>
          <select value={form.viajante_nome} onChange={(e) => setForm({ ...form, viajante_nome: e.target.value })}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            {viajantes.map((v) => <option key={v.id} value={v.nome}>{v.nome}</option>)}
          </select></label>
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Categoria</span>
          <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            {["Documentos", "Seguros", "Carro", "Finanças"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select></label>
      </div>
      <button type="submit" className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">Adicionar item</button>
    </motion.form>
  );
}