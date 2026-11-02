import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarPlus, X, Loader2 } from "lucide-react";
import { useCidades, useInvalidate } from "@/lib/useTrip";
import { base44 } from "@/api/base44Client";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function NovoDia() {
  const { data: cidades = [] } = useCidades();
  const invalidate = useInvalidate();
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({ data: "", titulo: "", cidade: "", destaque: "" });
  const [salvando, setSalvando] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    if (!form.data || !form.titulo.trim() || !form.cidade) return;
    setSalvando(true);
    try {
      const ordem = new Date(form.data).getTime();
      await base44.entities.Dia.create({
        data: form.data,
        titulo: form.titulo.trim(),
        cidade: form.cidade,
        destaque: form.destaque || undefined,
        ordem,
      });
      toast.success("Dia adicionado ao roteiro");
      invalidate([["dias"]]);
      setForm({ data: "", titulo: "", cidade: "", destaque: "" });
      setAberto(false);
    } catch {
      toast.error("Erro ao adicionar dia");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-heading text-lg font-semibold text-primary">Novo dia de roteiro</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Crie um novo dia da viagem associando a uma cidade.</p>
        </div>
        <button onClick={() => setAberto((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          {aberto ? <X className="w-4 h-4" /> : <CalendarPlus className="w-4 h-4" />} {aberto ? "Cancelar" : "Adicionar dia"}
        </button>
      </div>

      <AnimatePresence>
        {aberto && (
          <motion.form initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            onSubmit={salvar} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Data *</span>
                <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </label>
              <label className="block">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Cidade *</span>
                <select value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} required
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Selecione…</option>
                  {cidades.map((c) => <option key={c.id} value={c.nome}>{c.nome} — {c.pais}</option>)}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Título do dia *</span>
              <input type="text" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required placeholder="Chegada em Roma"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Destaque / resumo</span>
              <textarea value={form.destaque} onChange={(e) => setForm({ ...form, destaque: e.target.value })} rows={2} placeholder="Coliseu, Fórum Romano e jantar em Trastevere"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </label>
            {cidades.length === 0 && (
              <p className="text-xs text-accent">Cadastre uma cidade acima antes de criar um dia.</p>
            )}
            <button type="submit" disabled={salvando || cidades.length === 0}
              className={cn("inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90", (salvando || cidades.length === 0) && "opacity-60")}>
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
              Adicionar ao roteiro
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}