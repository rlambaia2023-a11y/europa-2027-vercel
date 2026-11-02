import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, ArrowRight, CalendarDays, Pencil, Trash2, X, Loader2, Check } from "lucide-react";
import { useInvalidate } from "@/lib/useTrip";
import { base44 } from "@/api/base44Client";
import { toast } from "react-hot-toast";
import { formatarData } from "@/lib/tripData";
import { Image } from "@/components/ui/image";
import { cn } from "@/lib/utils";
import { usePermissao } from "@/lib/usePermissao";

export default function DiaCard({ dia, index, cidades, roteiro = "principal" }) {
  const invalidate = useInvalidate();
  const { podeEditar } = usePermissao();
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ titulo: dia.titulo, cidade: dia.cidade, destaque: dia.destaque || "" });
  const [salvando, setSalvando] = useState(false);
  const cidadeMap = (cidades || []).reduce((m, c) => (m[c.nome] = c, m), {});
  const cidade = cidadeMap[dia.cidade];

  async function salvar(e) {
    e.preventDefault();
    if (!form.titulo.trim() || !form.cidade) return;
    setSalvando(true);
    try {
      await base44.entities.Dia.update(dia.id, {
        titulo: form.titulo.trim(),
        cidade: form.cidade,
        destaque: form.destaque || undefined,
      });
      toast.success("Dia atualizado");
      invalidate([["dias"]]);
      setEditando(false);
    } catch {
      toast.error("Erro ao atualizar");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!confirm(`Excluir o dia "${dia.titulo}" (${formatarData(dia.data)})?`)) return;
    try {
      await base44.entities.Dia.delete(dia.id);
      toast.success("Dia excluído do roteiro");
      invalidate([["dias"]]);
    } catch {
      toast.error("Erro ao excluir");
    }
  }

  if (editando && podeEditar) {
    return (
      <motion.form
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        onSubmit={salvar}
        className="bg-card rounded-2xl border border-accent/40 shadow-soft p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
            <Pencil className="w-4 h-4 text-accent" /> Editar dia {index + 1} · {formatarData(dia.data, "longo")}
          </p>
          <button type="button" onClick={() => setEditando(false)} className="text-muted-foreground hover:text-foreground p-1" aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Cidade *</span>
          <select value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} required
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Selecione…</option>
            {cidades.map((c) => <option key={c.id} value={c.nome}>{c.nome} — {c.pais}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Título do dia *</span>
          <input type="text" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Destaque / resumo</span>
          <textarea value={form.destaque} onChange={(e) => setForm({ ...form, destaque: e.target.value })} rows={2}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
        </label>
        <div className="flex items-center gap-2">
          <button type="submit" disabled={salvando}
            className={cn("inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90", salvando && "opacity-60")}>
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Salvar
          </button>
          <button type="button" onClick={excluir}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/10">
            <Trash2 className="w-4 h-4" /> Excluir dia
          </button>
        </div>
      </motion.form>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className="group relative">
      <Link
        to={`/itinerario/${dia.data}${roteiro === "alternativo" ? "?roteiro=alternativo" : ""}`}
        className="flex gap-4 bg-card rounded-2xl border border-border shadow-soft p-3 sm:p-4 hover:border-accent transition-all"
      >
        <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-secondary">
          {cidade?.foto && (
            <Image src={cidade.foto} className="w-full h-full object-cover" alt={dia.cidade} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/70 to-transparent" />
          <div className="absolute bottom-1.5 left-2 text-primary-foreground">
            <span className="text-[10px] uppercase tracking-wide opacity-80 block leading-none">Dia</span>
            <span className="font-heading text-xl font-semibold leading-tight">{index + 1}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <CalendarDays className="w-3.5 h-3.5" />
            {formatarData(dia.data, "longo")}
          </div>
          <h2 className="font-heading text-lg font-semibold text-primary mt-0.5 leading-tight">{dia.titulo}</h2>
          <p className="text-sm text-foreground/75 mt-1 line-clamp-2">{dia.destaque}</p>
          <div className="flex items-center gap-1.5 text-xs text-accent font-medium mt-1.5">
            <MapPin className="w-3.5 h-3.5" /> {dia.cidade}, {cidade?.pais || ""}
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-muted-foreground self-center group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
      </Link>
      {podeEditar && <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button onClick={(e) => { e.preventDefault(); setEditando(true); }}
          className="w-8 h-8 rounded-lg bg-card border border-border shadow-soft flex items-center justify-center text-muted-foreground hover:text-accent hover:border-accent"
          aria-label="Editar dia">
          <Pencil className="w-4 h-4" />
        </button>
      </div>}
    </motion.div>
  );
}