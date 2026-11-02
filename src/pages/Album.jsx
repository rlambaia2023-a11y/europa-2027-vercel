import { useState } from "react";
import { Camera, Plus, X } from "lucide-react";
import { useDiario, useDias, useViajantes, useInvalidate, doRoteiro } from "@/lib/useTrip";
import FormFoto from "@/components/album/FormFoto";
import AlbumPorDia from "@/components/album/AlbumPorDia";

export default function Album() {
  const { data: todosDias } = useDias();
  const dias = doRoteiro(todosDias);
  const { data: viajantes } = useViajantes();
  const { data: entradas, isLoading } = useDiario(null);
  const invalidate = useInvalidate();
  const [adicionando, setAdicionando] = useState(false);
  const [viajanteSel, setViajanteSel] = useState("TODOS");

  const lista = (entradas || []).filter(
    (e) => viajanteSel === "TODOS" || e.viajante_nome === viajanteSel
  );
  const totalFotos = lista.reduce((n, e) => n + (e.fotos || []).length, 0);
  const diasComFotos = new Set(lista.filter((e) => (e.fotos || []).length).map((e) => e.dia_data)).size;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.2em] uppercase text-accent font-medium">Memórias da família</p>
          <h1 className="font-heading text-3xl font-semibold text-primary mt-1">Álbum da Família HMAA</h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Suba as fotos, marque o lugar de cada registro e tudo fica organizado por dia no diário.
          </p>
        </div>
        <button
          onClick={() => setAdicionando((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 shrink-0"
        >
          {adicionando ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {adicionando ? "Fechar" : "Adicionar fotos"}
        </button>
      </header>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setViajanteSel("TODOS")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${
            viajanteSel === "TODOS" ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground"
          }`}
        >
          Todos os viajantes
        </button>
        {(viajantes || []).map((v) => (
          <button
            key={v.id}
            onClick={() => setViajanteSel(v.nome)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${
              viajanteSel === v.nome ? "bg-accent text-accent-foreground border-accent" : "border-border bg-card text-muted-foreground"
            }`}
          >
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-semibold text-white" style={{ background: v.cor }}>
              {v.iniciais}
            </span>
            {v.nome}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl border border-border shadow-soft p-3 text-center">
          <p className="font-heading text-2xl font-semibold text-primary">{totalFotos}</p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">fotos</p>
        </div>
        <div className="bg-card rounded-2xl border border-border shadow-soft p-3 text-center">
          <p className="font-heading text-2xl font-semibold text-primary">{diasComFotos}</p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">dias</p>
        </div>
        <div className="bg-card rounded-2xl border border-border shadow-soft p-3 text-center">
          <p className="font-heading text-2xl font-semibold text-primary">{lista.length}</p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">registros</p>
        </div>
      </div>

      {adicionando && (
        <FormFoto
          dias={dias || []}
          viajantes={viajantes || []}
          onSaved={() => {
            invalidate([["diario", "all"]]);
            setAdicionando(false);
          }}
        />
      )}

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
          <Camera className="w-4 h-4 animate-pulse" /> Carregando o álbum…
        </div>
      ) : lista.length === 0 ? (
        <div className="py-16 text-center bg-card rounded-2xl border border-border">
          <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {viajanteSel === "TODOS"
              ? "Nenhum registro no álbum ainda."
              : `Nenhum registro de ${viajanteSel} no álbum ainda.`}
          </p>
        </div>
      ) : (
        <AlbumPorDia entradas={lista} dias={dias || []} />
      )}
    </div>
  );
}