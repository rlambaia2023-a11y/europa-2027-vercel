import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Images } from "lucide-react";
import SignedImage from "@/components/SignedImage";
import { formatarData } from "@/lib/tripData";
import PhotoLightbox from "./PhotoLightbox";

export default function GaleriaFotos({ entradas, dias }) {
  const [aberta, setAberta] = useState(null);

  const grupos = useMemo(() => {
    const mapa = new Map();
    (entradas || []).forEach((e) => {
      (e.fotos || []).forEach((uri) => {
        if (!uri) return;
        if (!mapa.has(e.dia_data)) mapa.set(e.dia_data, []);
        mapa.get(e.dia_data).push({ uri, viajante: e.viajante_nome });
      });
    });
    let deslocamento = 0;
    return [...mapa.entries()]
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      .map(([data, fotos]) => {
        const grupo = {
          data,
          fotos,
          inicio: deslocamento,
          titulo: (dias || []).find((d) => d.data === data)?.titulo || "",
        };
        deslocamento += fotos.length;
        return grupo;
      });
  }, [entradas, dias]);

  const lista = useMemo(
    () => grupos.flatMap((g) => g.fotos.map((f) => ({ ...f, data: g.data, titulo: g.titulo }))),
    [grupos]
  );

  if (!lista.length) return null;

  const anterior = () => setAberta((i) => (i - 1 + lista.length) % lista.length);
  const proxima = () => setAberta((i) => (i + 1) % lista.length);

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-xl font-semibold text-primary">Galeria de fotos</h2>
        <span className="text-[11px] text-muted-foreground">
          {lista.length} foto(s) em {grupos.length} dia(s)
        </span>
      </div>

      {grupos.map((g, gi) => (
        <motion.div
          key={g.data}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: gi * 0.04 }}
          className="bg-card rounded-2xl border border-border shadow-soft p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Images className="w-4 h-4 text-accent shrink-0" />
            <p className="text-sm font-semibold text-primary">{formatarData(g.data, "longo")}</p>
            {g.titulo && <span className="text-xs text-muted-foreground truncate">· {g.titulo}</span>}
            <span className="ml-auto text-[11px] text-muted-foreground shrink-0">{g.fotos.length}</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {g.fotos.map((f, i) => (
              <button
                key={i}
                onClick={() => setAberta(g.inicio + i)}
                className="group relative aspect-square rounded-lg overflow-hidden bg-secondary focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label={`Abrir foto ${i + 1} de ${formatarData(g.data)}`}
              >
                <SignedImage
                  fileUri={f.uri}
                  alt={`Foto de ${formatarData(g.data)}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        </motion.div>
      ))}

      {aberta !== null && (
        <PhotoLightbox
          fotos={lista}
          index={aberta}
          onPrev={anterior}
          onNext={proxima}
          onClose={() => setAberta(null)}
        />
      )}
    </section>
  );
}