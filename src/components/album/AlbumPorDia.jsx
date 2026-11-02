import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Images, MapPin, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { base44 } from "@/api/base44Client";
import SignedImage from "@/components/SignedImage";
import PhotoLightbox from "@/components/diario/PhotoLightbox";
import { formatarData } from "@/lib/tripData";

export default function AlbumPorDia({ entradas, dias, onChange }) {
  const [aberta, setAberta] = useState(null);

  const grupos = useMemo(() => {
    const mapa = new Map();
    (entradas || []).forEach((e) => {
      if (!(e.fotos || []).length) return;
      if (!mapa.has(e.dia_data)) mapa.set(e.dia_data, []);
      mapa.get(e.dia_data).push(e);
    });

    return [...mapa.entries()]
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      .map(([data, bruto]) => {
        const titulo = (dias || []).find((d) => d.data === data)?.titulo || "";
        let deslocamento = 0;
        const lista = bruto.map((e) => {
          const inicio = deslocamento;
          deslocamento += (e.fotos || []).length;
          return { ...e, inicio };
        });
        const fotos = bruto.flatMap((e) =>
          (e.fotos || []).map((uri) => ({
            uri,
            viajante: e.viajante_nome,
            local: e.local,
            data,
            titulo,
          }))
        );
        return { data, titulo, lista, fotos };
      });
  }, [entradas, dias]);

  if (!grupos.length) {
    return (
      <div className="py-16 text-center bg-card rounded-2xl border border-border">
        <Images className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nenhuma foto no álbum ainda.</p>
      </div>
    );
  }

  // tira uma foto do registro; registro sem fotos e sem texto some
  async function removerFoto(e, uri) {
    if (!window.confirm("Remover esta foto do álbum?")) return;
    const restantes = (e.fotos || []).filter((u) => u !== uri);
    try {
      if (!restantes.length && !e.texto) await base44.entities.DiarioEntrada.delete(e.id);
      else await base44.entities.DiarioEntrada.update(e.id, { fotos: restantes });
      // o registro já foi salvo sem a foto; se o arquivo não sair agora, só sobra espaço ocupado
      base44.integrations.Core.DeleteFile({ file_uri: uri }).catch(() => {});
      toast.success("Foto removida");
      onChange?.();
    } catch {
      toast.error("Não foi possível remover");
    }
  }

  const prev = () => setAberta((a) => a && { ...a, index: (a.index - 1 + a.fotos.length) % a.fotos.length });
  const next = () => setAberta((a) => a && { ...a, index: (a.index + 1) % a.fotos.length });

  return (
    <div className="space-y-5">
      {grupos.map((g, gi) => (
        <motion.section
          key={g.data}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.04 }}
          className="bg-card rounded-2xl border border-border shadow-soft p-4"
        >
          <header className="flex items-center gap-2 mb-3">
            <Images className="w-4 h-4 text-accent shrink-0" />
            <p className="text-sm font-semibold text-primary">{formatarData(g.data, "longo")}</p>
            {g.titulo && <span className="text-xs text-muted-foreground truncate">· {g.titulo}</span>}
            <span className="ml-auto text-[11px] text-muted-foreground shrink-0">{g.fotos.length} foto(s)</span>
          </header>

          <div className="space-y-4">
            {g.lista.map((e) => (
              <div key={e.id} className="space-y-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span className="font-medium text-accent">{e.viajante_nome}</span>
                  {(e.local || e.lat) && (
                    <a
                      href={
                        e.lat != null && e.lng != null
                          ? `https://www.google.com/maps?q=${e.lat},${e.lng}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.local || "")}`
                      }
                      target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-accent"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      {e.local || `${Number(e.lat).toFixed(4)}, ${Number(e.lng).toFixed(4)}`}
                    </a>
                  )}
                </div>
                {e.texto && <p className="text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed">{e.texto}</p>}
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {(e.fotos || []).map((uri, i) => (
                    <div key={i} className="group relative aspect-square rounded-lg overflow-hidden bg-secondary">
                      <button
                        onClick={() => setAberta({ fotos: g.fotos, index: e.inicio + i })}
                        className="w-full h-full focus:outline-none focus:ring-2 focus:ring-ring"
                        aria-label={`Abrir foto ${i + 1} de ${formatarData(g.data)}`}
                      >
                        <SignedImage fileUri={uri} alt={`Foto de ${formatarData(g.data)}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      </button>
                      <button onClick={() => removerFoto(e, uri)}
                        className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/55 text-white flex items-center justify-center opacity-80 sm:opacity-0 group-hover:opacity-100 focus:opacity-100"
                        aria-label="Remover foto">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      ))}

      {aberta && (
        <PhotoLightbox
          fotos={aberta.fotos}
          index={aberta.index}
          onPrev={prev}
          onNext={next}
          onClose={() => setAberta(null)}
        />
      )}
    </div>
  );
}