import { useMemo } from "react";
import { X, Images, Check } from "lucide-react";
import { Image } from "@/components/ui/image";
import { formatarData } from "@/lib/tripData";
import { cn } from "@/lib/utils";

export default function SeletorFotosGaleria({ aoFechar, entradas = [], selecionadas = [], onAlternar, limite = 3 }) {
  const grupos = useMemo(() => {
    const mapa = new Map();
    (entradas || []).forEach((e) => {
      (e.fotos || []).forEach((url) => {
        if (!/^https?:\/\//i.test(url)) return;
        if (!mapa.has(e.dia_data)) mapa.set(e.dia_data, []);
        const lista = mapa.get(e.dia_data);
        if (!lista.includes(url)) lista.push(url);
      });
    });
    return [...mapa.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  }, [entradas]);

  return (
    <div className="rounded-xl border border-border bg-background p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
          <Images className="w-3.5 h-3.5 text-accent" /> Fotos da galeria
          <span className="text-muted-foreground font-normal">({selecionadas.length}/{limite})</span>
        </p>
        <button onClick={aoFechar} className="text-muted-foreground hover:text-foreground p-1" aria-label="Fechar galeria">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {grupos.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Nenhuma foto na galeria ainda. Envie fotos na página Álbum HMAA para poder analisá-las aqui.
        </p>
      ) : (
        <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
          {grupos.map(([data, urls]) => (
            <div key={data}>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{formatarData(data)}</p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {urls.map((url) => {
                  const sel = selecionadas.includes(url);
                  const bloqueada = !sel && selecionadas.length >= limite;
                  return (
                    <button
                      key={url}
                      onClick={() => onAlternar(url)}
                      disabled={bloqueada}
                      className={cn(
                        "relative aspect-square rounded-lg overflow-hidden border-2 transition-colors",
                        sel ? "border-accent" : "border-transparent hover:border-accent/50",
                        bloqueada && "opacity-40"
                      )}
                      aria-label={sel ? "Remover foto" : "Escolher foto"}
                    >
                      <Image src={url} className="w-full h-full object-cover" alt="Foto da galeria" />
                      {sel && (
                        <span className="absolute inset-0 bg-accent/40 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}