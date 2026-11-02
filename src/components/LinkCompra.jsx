import { Ticket, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// Link de compra/reserva vindo da IA: o oficial (já conferido no servidor) ou uma busca pelo site oficial.
export function linkDeCompra(s) {
  return s?.link_oficial || s?.link_busca || "";
}

function dominio(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export default function LinkCompra({ sugestao, compacto = false }) {
  const oficial = sugestao?.link_oficial;
  const url = linkDeCompra(sugestao);
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={oficial ? `Site oficial: ${dominio(oficial)}` : "Procurar o site oficial de venda"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors",
        compacto ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-1.5 text-xs",
        oficial
          ? "bg-green-600 text-white hover:bg-green-700"
          : "border border-border text-muted-foreground hover:border-accent hover:text-accent"
      )}
    >
      {oficial ? <Ticket className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
      {oficial ? "Comprar / reservar" : "Procurar site oficial"}
      {oficial && !compacto && <span className="hidden sm:inline font-normal opacity-80">· {dominio(oficial)}</span>}
    </a>
  );
}

export function InfoIngresso({ sugestao, className }) {
  if (!sugestao?.ingresso) return null;
  return (
    <p className={cn("text-[11px] text-foreground/70 flex items-center gap-1", className)}>
      <Ticket className="w-3 h-3 text-accent shrink-0" /> {sugestao.ingresso}
    </p>
  );
}
