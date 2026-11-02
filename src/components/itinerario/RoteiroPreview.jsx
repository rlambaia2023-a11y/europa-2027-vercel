import { motion } from "framer-motion";
import { CalendarDays, MapPin } from "lucide-react";
import { formatarData } from "@/lib/tripData";
import { cn } from "@/lib/utils";

export default function RoteiroPreview({ dias, selecionados, onToggle }) {
  return (
    <div className="space-y-2">
      {dias.map((d, i) => {
        const sel = !!selecionados[i];
        return (
          <motion.div
            key={`${d.data}-${i}`}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
            className={cn("rounded-xl border p-3 transition-colors",
              sel ? "border-accent/50 bg-accent/5" : "border-border bg-background")}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => onToggle(i)}
                className={cn("mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                  sel ? "bg-accent border-accent text-white" : "border-border hover:border-accent")}
                aria-label="Selecionar dia"
              >
                {sel && <span className="text-[11px] leading-none">✓</span>}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <CalendarDays className="w-3.5 h-3.5" /> {d.data ? formatarData(d.data, "longo") : "sem data"}
                  <span className="inline-flex items-center gap-1 text-accent font-medium">
                    <MapPin className="w-3 h-3" /> {d.cidade}{d.pais ? `, ${d.pais}` : ""}
                  </span>
                </div>
                <p className="text-sm font-semibold text-primary mt-0.5">{d.titulo}</p>
                {d.destaque && <p className="text-xs text-foreground/70 mt-0.5">{d.destaque}</p>}
                {(d.atividades || []).length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {(d.atividades || []).map((a, j) => (
                      <li key={j} className="text-[11px] text-muted-foreground flex gap-1.5">
                        <span className="text-accent font-medium shrink-0">{a.horario || "—"}</span>
                        <span className="truncate">{a.nome}</span>
                        {a.link_oficial && <span className="shrink-0 text-green-600" title="Tem link oficial de compra">🎟</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">{(d.atividades || []).length} ativ.</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}