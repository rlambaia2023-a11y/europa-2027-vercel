import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Plus, Pencil, Trash2, X, Loader2, Globe } from "lucide-react";
import { useCidades, useInvalidate } from "@/lib/useTrip";
import { base44 } from "@/api/base44Client";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

const PAISES_ROTAS = ["Itália", "Croácia", "Montenegro", "Bósnia", "Eslovênia", "Áustria", "Hungria", "Outro"];

export default function GerenciarCidades() {
  const { data: cidades = [], isLoading } = useCidades();
  const invalidate = useInvalidate();
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nome: "", pais: "Itália", lat: "", lng: "", foto: "", descricao: "", ordem: "" });
  const [salvando, setSalvando] = useState(false);

  function abrirNovo() {
    setEditando(null);
    const proximaOrdem = cidades.length ? Math.max(...cidades.map((c) => c.ordem || 0)) + 1 : 1;
    setForm({ nome: "", pais: "Itália", lat: "", lng: "", foto: "", descricao: "", ordem: String(proximaOrdem) });
    setAberto(true);
  }

  function abrirEdicao(c) {
    setEditando(c);
    setForm({
      nome: c.nome || "",
      pais: c.pais || "Itália",
      lat: c.lat != null ? String(c.lat) : "",
      lng: c.lng != null ? String(c.lng) : "",
      foto: c.foto || "",
      descricao: c.descricao || "",
      ordem: c.ordem != null ? String(c.ordem) : "",
    });
    setAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.nome.trim() || !form.pais.trim()) return;
    setSalvando(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        pais: form.pais.trim(),
        lat: form.lat ? parseFloat(form.lat) : undefined,
        lng: form.lng ? parseFloat(form.lng) : undefined,
        foto: form.foto || undefined,
        descricao: form.descricao || undefined,
        ordem: form.ordem ? parseInt(form.ordem, 10) : undefined,
      };
      if (editando) {
        await base44.entities.Cidade.update(editando.id, payload);
        toast.success("Cidade atualizada");
      } else {
        await base44.entities.Cidade.create(payload);
        toast.success("Cidade adicionada");
      }
      invalidate([["cidades"]]);
      setAberto(false);
    } catch {
      toast.error("Erro ao salvar cidade");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(c) {
    if (!confirm(`Excluir "${c.nome}"? Dias associados ficarão sem cidade.`)) return;
    try {
      await base44.entities.Cidade.delete(c.id);
      toast.success("Cidade excluída");
      invalidate([["cidades"]]);
    } catch {
      toast.error("Erro ao excluir");
    }
  }

  const ordem = (c) => (c.ordem != null ? c.ordem : 999);
  const lista = [...cidades].sort((a, b) => ordem(a) - ordem(b));

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-accent" />
          <h2 className="font-heading text-lg font-semibold text-primary">Cidades do roteiro</h2>
        </div>
        <button onClick={abrirNovo} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> Nova cidade
        </button>
      </div>

      {isLoading ? (
        <div className="py-6 text-center text-muted-foreground text-sm">Carregando…</div>
      ) : lista.length === 0 ? (
        <div className="py-6 text-center text-muted-foreground text-sm">Nenhuma cidade cadastrada.</div>
      ) : (
        <div className="space-y-2">
          {lista.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
              className="flex items-center gap-3 rounded-xl border border-border p-3">
              <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                {c.ordem ?? i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-accent shrink-0" /> {c.nome}
                </p>
                <p className="text-[11px] text-muted-foreground">{c.pais}{c.lat && c.lng ? ` · ${c.lat.toFixed(3)}, ${c.lng.toFixed(3)}` : ""}</p>
              </div>
              <button onClick={() => abrirEdicao(c)} className="text-muted-foreground hover:text-accent p-1.5" aria-label="Editar cidade">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => excluir(c)} className="text-muted-foreground hover:text-destructive p-1.5" aria-label="Excluir cidade">
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {aberto && (
          <motion.form
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            onSubmit={salvar} className="mt-4 rounded-xl border border-accent/30 bg-secondary/30 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-primary">{editando ? "Editar cidade" : "Nova cidade"}</p>
              <button type="button" onClick={() => setAberto(false)} className="text-muted-foreground hover:text-foreground p-1" aria-label="Fechar">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Campo label="Nome" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} placeholder="Roma" required />
              <label className="block">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">País</span>
                <select value={form.pais} onChange={(e) => setForm({ ...form, pais: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {PAISES_ROTAS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Campo label="Latitude" value={form.lat} onChange={(v) => setForm({ ...form, lat: v })} tipo="number" placeholder="41.9028" />
              <Campo label="Longitude" value={form.lng} onChange={(v) => setForm({ ...form, lng: v })} tipo="number" placeholder="12.4964" />
              <Campo label="Ordem" value={form.ordem} onChange={(v) => setForm({ ...form, ordem: v })} tipo="number" placeholder="1" />
            </div>
            <Campo label="URL da foto" value={form.foto} onChange={(v) => setForm({ ...form, foto: v })} placeholder="https://images.unsplash.com/…" />
            <label className="block">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Descrição</span>
              <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </label>
            <button type="submit" disabled={salvando}
              className={cn("inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90", salvando && "opacity-60")}>
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editando ? "Salvar alterações" : "Adicionar cidade"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function Campo({ label, value, onChange, placeholder, tipo = "text", required }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}{required ? " *" : ""}</span>
      <input type={tipo} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
    </label>
  );
}