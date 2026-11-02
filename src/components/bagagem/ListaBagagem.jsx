import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, CheckCircle2, Circle, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useInvalidate } from "@/lib/useTrip";
import { toast } from "react-hot-toast";
import { usePermissao } from "@/lib/usePermissao";
import { cn } from "@/lib/utils";

export default function ListaBagagem({ titulo, descricao, Icon, itens, categoria, viajanteNome, viajantes }) {
  const invalidate = useInvalidate();
  const { podeMexerNoRegistro } = usePermissao();
  const [novo, setNovo] = useState("");
  const [paraQuem, setParaQuem] = useState((viajantes || [])[0]?.nome || "");
  const [salvando, setSalvando] = useState(false);

  const concluidos = itens.filter((i) => i.concluido).length;

  async function toggle(item) {
    try {
      await base44.entities.ChecklistItem.update(item.id, { concluido: !item.concluido });
      invalidate([["checklist"]]);
    } catch { toast.error("Erro"); }
  }

  async function remover(id) {
    try {
      await base44.entities.ChecklistItem.delete(id);
      invalidate([["checklist"]]);
    } catch { toast.error("Erro"); }
  }

  async function adicionar(e) {
    e.preventDefault();
    const nome = viajanteNome || paraQuem;
    if (!novo.trim() || !nome) return;
    setSalvando(true);
    try {
      await base44.entities.ChecklistItem.create({
        item: novo.trim(),
        categoria,
        viajante_nome: nome,
        concluido: false,
      });
      setNovo("");
      invalidate([["checklist"]]);
    } catch { toast.error("Erro ao adicionar"); }
    finally { setSalvando(false); }
  }

  return (
    <section className="bg-card rounded-2xl border border-border shadow-soft p-4">
      <header className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-accent shrink-0" />
        <h2 className="font-heading text-base font-semibold text-primary">{titulo}</h2>
        <span className="ml-auto text-[11px] text-muted-foreground shrink-0">{concluidos}/{itens.length}</span>
      </header>
      <p className="text-[11px] text-muted-foreground mb-3">{descricao}</p>

      {itens.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {itens.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
              className="flex items-center gap-2.5 py-1.5">
              <button onClick={() => toggle(item)} aria-label={item.concluido ? "Desmarcar" : "Marcar como na mala"}
                className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                  item.concluido ? "bg-green-600 border-green-600 text-white" : "border-border hover:border-accent")}>
                {item.concluido ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3 opacity-0" />}
              </button>
              <span className={cn("text-sm flex-1", item.concluido && "text-muted-foreground line-through")}>{item.item}</span>
              {!viajanteNome && item.viajante_nome && (
                <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full whitespace-nowrap">{item.viajante_nome}</span>
              )}
              {podeMexerNoRegistro(item) && (
                <button onClick={() => remover(item.id)} className="text-muted-foreground hover:text-destructive p-1" aria-label="Remover item">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <form onSubmit={adicionar} className="flex flex-wrap gap-2 pt-2 border-t border-border">
        <input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Adicionar item…"
          className="flex-1 min-w-[140px] rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        {!viajanteNome && (
          <select value={paraQuem} onChange={(e) => setParaQuem(e.target.value)}
            className="rounded-lg border border-input bg-background px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            {(viajantes || []).map((v) => <option key={v.id} value={v.nome}>{v.nome}</option>)}
          </select>
        )}
        <button type="submit" disabled={salvando}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60">
          <Plus className="w-4 h-4" /> Adicionar
        </button>
      </form>
    </section>
  );
}