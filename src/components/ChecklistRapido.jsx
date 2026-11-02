import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, CheckCircle2, Circle, Trash2, ListChecks } from "lucide-react";
import { useChecklist, useInvalidate } from "@/lib/useTrip";
import { base44 } from "@/api/base44Client";
import { toast } from "react-hot-toast";
import { usePermissao } from "@/lib/usePermissao";
import { cn } from "@/lib/utils";

export default function ChecklistRapido({ diaData }) {
  const { data: itens, isLoading } = useChecklist();
  const invalidate = useInvalidate();
  const { podeMexerNoRegistro } = usePermissao();
  const [novo, setNovo] = useState("");
  const [adicionando, setAdicionando] = useState(false);

  // Itens deste dia: usamos a categoria para associar ao dia (formato "dia:YYYY-MM-DD")
  const categoriaDia = `dia:${diaData}`;
  const meusItens = (itens || []).filter((i) => i.categoria === categoriaDia);
  const concluidos = meusItens.filter((i) => i.concluido).length;

  async function toggle(item) {
    try {
      await base44.entities.ChecklistItem.update(item.id, { concluido: !item.concluido });
      invalidate([["checklist"]]);
    } catch {
      toast.error("Erro");
    }
  }

  async function remover(id) {
    try {
      await base44.entities.ChecklistItem.delete(id);
      toast.success("Removido");
      invalidate([["checklist"]]);
    } catch {
      toast.error("Erro");
    }
  }

  async function adicionar(e) {
    e.preventDefault();
    if (!novo.trim()) return;
    try {
      await base44.entities.ChecklistItem.create({
        item: novo.trim(),
        categoria: categoriaDia,
        viajante_nome: "Grupo",
        concluido: false,
      });
      setNovo("");
      setAdicionando(false);
      invalidate([["checklist"]]);
    } catch {
      toast.error("Erro");
    }
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4.5 h-4.5 text-accent" />
          <h2 className="font-heading text-lg font-semibold text-primary">Checklist do dia</h2>
        </div>
        <div className="flex items-center gap-3">
          {meusItens.length > 0 && (
            <span className="text-xs text-muted-foreground font-medium">{concluidos}/{meusItens.length}</span>
          )}
          <button
            onClick={() => setAdicionando((v) => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium hover:border-accent hover:text-accent transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> {adicionando ? "Cancelar" : "Item"}
          </button>
        </div>
      </div>

      {adicionando && (
        <motion.form
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          onSubmit={adicionar}
          className="flex gap-2 mb-3 overflow-hidden"
        >
          <input
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            placeholder="Ex.: Carregar carregador, levar casaco, confirmar reserva..."
            autoFocus
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button type="submit" className="px-3 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90">
            Adicionar
          </button>
        </motion.form>
      )}

      {isLoading ? (
        <div className="py-4 text-center text-muted-foreground text-sm">Carregando…</div>
      ) : meusItens.length === 0 ? (
        <div className="py-4 text-center text-muted-foreground text-xs">
          Nenhum item ainda. Adicione o que precisa conferir antes de sair.
        </div>
      ) : (
        <div className="space-y-1.5">
          {meusItens.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className="flex items-center gap-2.5 py-1.5"
            >
              <button
                onClick={() => toggle(item)}
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                  item.concluido ? "bg-green-600 border-green-600 text-white" : "border-border hover:border-accent"
                )}
              >
                {item.concluido ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3 opacity-0" />}
              </button>
              <span className={cn("text-sm flex-1", item.concluido && "text-muted-foreground line-through")}>
                {item.item}
              </span>
              {podeMexerNoRegistro(item) && (
                <button onClick={() => remover(item.id)} className="text-muted-foreground hover:text-destructive p-0.5" aria-label="Remover">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}