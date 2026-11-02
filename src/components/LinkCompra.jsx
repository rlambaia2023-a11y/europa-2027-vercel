import { Ticket, Search, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// Link de compra/reserva vindo da IA: o oficial (já conferido no servidor) ou uma busca pelo site oficial.
export function linkDeCompra(s) {
  return s?.link_oficial || s?.link_busca || "";
}

// oficial | revendedor | busca (o servidor não achou site oficial)
export function tipoDoLink(s) {
  if (!s?.link_oficial) return "busca";
  return s.link_tipo === "revendedor" ? "revendedor" : "oficial";
}

const AVISOS = {
  revendedor: "Site oficial não encontrado. Este link é de um revendedor — confira preço e condições antes de pagar.",
  busca: "Site oficial não encontrado. O botão abre uma busca para você conferir onde comprar.",
};

export function avisoDoLink(tipo) {
  return AVISOS[tipo] || "";
}

// Aviso logo abaixo do item quando não há site oficial
export function AvisoLink({ tipo, className }) {
  if (!AVISOS[tipo]) return null;
  return (
    <p className={cn("text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5", className)}>
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" /> {AVISOS[tipo]}
    </p>
  );
}

// Resumo no topo da lista: quantos itens ficaram sem site oficial
export function ResumoLinks({ lista, className }) {
  const total = (lista || []).length;
  const sem = (lista || []).filter((s) => tipoDoLink(s) !== "oficial").length;
  if (!total) return null;
  if (!sem) {
    return (
      <p className={cn("text-[11px] text-green-700 flex items-center gap-1.5", className)}>
        <Ticket className="w-3.5 h-3.5" /> Todos os {total} itens têm link oficial de compra ou reserva.
      </p>
    );
  }
  return (
    <p className={cn("text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-1.5", className)}>
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span><strong>{sem} de {total}</strong> sem site oficial encontrado. Nesses itens o botão leva a um revendedor ou a uma busca — confira antes de pagar.</span>
    </p>
  );
}

function dominio(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export default function LinkCompra({ sugestao, compacto = false }) {
  const revendedor = sugestao?.link_tipo === "revendedor";
  const oficial = sugestao?.link_oficial;
  const url = linkDeCompra(sugestao);
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={oficial ? `${revendedor ? "Revendedor (não é o site oficial)" : "Site oficial"}: ${dominio(oficial)}` : "Procurar o site oficial de venda"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors",
        compacto ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-1.5 text-xs",
        oficial && !revendedor && "bg-green-600 text-white hover:bg-green-700",
        oficial && revendedor && "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200",
        !oficial && "border border-border text-muted-foreground hover:border-accent hover:text-accent"
      )}
    >
      {oficial ? <Ticket className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
      {!oficial ? "Procurar site oficial" : revendedor ? "Comprar (revendedor)" : "Comprar / reservar"}
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
