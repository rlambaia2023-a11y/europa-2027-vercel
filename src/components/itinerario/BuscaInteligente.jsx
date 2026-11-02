import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Search, Loader2, MapPin, Clock, Plus, Check, ExternalLink, Images, X, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useDiario, useInvalidate } from "@/lib/useTrip";
import { formatarData } from "@/lib/tripData";
import LinkCompra, { InfoIngresso, linkDeCompra, tipoDoLink, avisoDoLink, AvisoLink, ResumoLinks } from "@/components/LinkCompra";
import SeletorFotosGaleria from "./SeletorFotosGaleria";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

const EXEMPLOS = ["Atrações para crianças", "Comida típica e mercados", "Museus para dia de chuva"];

export default function BuscaInteligente({ roteiro = "principal", dias = [], cidades = [] }) {
  const { data: entradas } = useDiario(null);
  const invalidate = useInvalidate();
  const [termo, setTermo] = useState("");
  const [cidadeSel, setCidadeSel] = useState("");
  const [fotos, setFotos] = useState([]);
  const [galeriaAberta, setGaleriaAberta] = useState(false);
  const [sugestoes, setSugestoes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [diaSel, setDiaSel] = useState("");
  const [adicionadas, setAdicionadas] = useState({});

  const diaAlvo = diaSel || dias[0]?.data || "";

  async function buscar(e) {
    e?.preventDefault();
    const pedido = termo.trim();
    if (!pedido && !fotos.length) {
      setErro("Descreva o que você procura ou escolha fotos da galeria.");
      return;
    }
    setCarregando(true);
    setErro("");
    setSugestoes([]);
    setAdicionadas({});
    try {
      const cidade = (cidades || []).find((c) => c.nome === cidadeSel);
      const res = await base44.functions.invoke("SugerirAtracoes", {
        cidade: cidadeSel || undefined,
        pais: cidade?.pais || undefined,
        consulta: pedido || undefined,
        fotos: fotos.length ? fotos : undefined,
      });
      const data = res?.data ?? res;
      const lista = data?.sugestoes || [];
      setSugestoes(lista);
      if (!lista.length) setErro("Não encontrei sugestões. Tente descrever de outra forma.");
    } catch (err) {
      setErro(err?.response?.data?.error || err?.message || "Não foi possível buscar sugestões agora.");
    } finally {
      setCarregando(false);
    }
  }

  function alternarFoto(url) {
    setFotos((prev) => (prev.includes(url) ? prev.filter((f) => f !== url) : [...prev, url]));
  }

  async function adicionar(s) {
    if (!diaAlvo) {
      toast.error("Nenhum dia no roteiro");
      return;
    }
    try {
      await base44.entities.Atividade.create({
        dia_data: diaAlvo,
        nome: s.nome,
        endereco: s.endereco || "",
        tempo_visita: s.tempo_visita || "",
        lat: s.lat || undefined,
        lng: s.lng || undefined,
        categoria: "atração",
        roteiro,
        link: linkDeCompra(s) || undefined,
        link_tipo: linkDeCompra(s) ? tipoDoLink(s) : undefined,
      });
      setAdicionadas((p) => ({ ...p, [s.nome]: diaAlvo }));
      invalidate([["atividades", diaAlvo], ["atividades", "all"]]);
      toast.success(`Adicionado a ${formatarData(diaAlvo)}`);
      if (avisoDoLink(tipoDoLink(s))) toast(`${s.nome}: ${avisoDoLink(tipoDoLink(s))}`, { icon: "⚠️", duration: 6000 });
    } catch {
      toast.error("Erro ao adicionar");
    }
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-4 space-y-3">
      <div className="flex items-start gap-2">
        <div className="w-9 h-9 rounded-xl bg-gold/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-gold" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">Busca inteligente</p>
          <p className="text-[11px] text-muted-foreground">
            Peça atrações do jeito que quiser ou use fotos da galeria — a IA pesquisa e sugere lugares reais para este roteiro.
          </p>
        </div>
      </div>

      <form onSubmit={buscar} className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={termo}
              onChange={(e) => { setTermo(e.target.value); setErro(""); }}
              placeholder="Ex.: o que fazer com crianças em Split"
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={cidadeSel}
            onChange={(e) => setCidadeSel(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring sm:w-44"
          >
            <option value="">Toda a viagem</option>
            {(cidades || []).map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </select>
          <button
            type="submit"
            disabled={carregando}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 shrink-0"
          >
            {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {carregando ? "Buscando…" : "Buscar"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setGaleriaAberta((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors",
              galeriaAberta ? "border-accent text-accent bg-accent/5" : "border-border text-muted-foreground hover:border-accent/60"
            )}
          >
            <Images className="w-3.5 h-3.5" /> Fotos da galeria{fotos.length > 0 ? ` (${fotos.length})` : ""}
          </button>
          {!termo && EXEMPLOS.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setTermo(ex)}
              className="px-2.5 py-1.5 rounded-lg bg-secondary text-[11px] text-muted-foreground hover:text-foreground"
            >
              {ex}
            </button>
          ))}
        </div>

        {fotos.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {fotos.map((url, i) => (
              <span key={url} className="inline-flex items-center gap-1 text-[11px] bg-secondary rounded-lg pl-2 pr-1 py-1">
                Foto {i + 1}
                <button type="button" onClick={() => alternarFoto(url)} aria-label="Remover foto">
                  <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                </button>
              </span>
            ))}
          </div>
        )}
      </form>

      {galeriaAberta && (
        <SeletorFotosGaleria
          aoFechar={() => setGaleriaAberta(false)}
          entradas={entradas || []}
          selecionadas={fotos}
          onAlternar={alternarFoto}
        />
      )}

      {erro && (
        <p className="flex items-start gap-1.5 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {erro}
        </p>
      )}

      {sugestoes.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-primary flex-1">{sugestoes.length} sugestão(ões) encontradas</p>
            <ResumoLinks lista={sugestoes} className="w-full order-last" />
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              Adicionar ao dia
              <select
                value={diaAlvo}
                onChange={(e) => setDiaSel(e.target.value)}
                className="rounded-lg border border-input bg-background px-2 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {dias.length === 0 && <option value="">Sem dias</option>}
                {dias.map((d) => <option key={d.id} value={d.data}>{formatarData(d.data)} · {d.cidade}</option>)}
              </select>
            </label>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {sugestoes.map((s, i) => {
              const adicionadaEm = adicionadas[s.nome];
              return (
                <motion.div
                  key={`${s.nome}-${i}`}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="rounded-xl border border-border p-3 flex flex-col"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium text-foreground leading-tight">{s.nome}</h3>
                    {s.tempo_visita && (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
                        <Clock className="w-2.5 h-2.5" /> {s.tempo_visita}
                      </span>
                    )}
                  </div>
                  {s.descricao && <p className="text-xs text-foreground/80 mt-1.5 leading-relaxed">{s.descricao}</p>}
                  {s.motivo && <p className="text-[11px] text-accent mt-1.5 italic leading-relaxed">{s.motivo}</p>}
                  <InfoIngresso sugestao={s} className="mt-1.5" />
                  {s.endereco && (
                    <p className="text-[11px] text-muted-foreground mt-1.5 flex items-start gap-1">
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0" /> {s.endereco}
                    </p>
                  )}
                  <div className="mt-2.5 pt-2.5 border-t border-border flex items-center gap-2 flex-wrap">
                    {adicionadaEm ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-green-600 font-medium">
                        <Check className="w-3.5 h-3.5" /> No itinerário · {formatarData(adicionadaEm)}
                      </span>
                    ) : (
                      <button
                        onClick={() => adicionar(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent text-accent-foreground text-[11px] font-semibold hover:opacity-90"
                      >
                        <Plus className="w-3 h-3" /> Adicionar
                      </button>
                    )}
                    <LinkCompra sugestao={s} compacto />
                    <AvisoLink tipo={tipoDoLink(s)} className="w-full" />
                    {s.lat && s.lng && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto text-muted-foreground hover:text-accent p-1"
                        aria-label="Ver no mapa"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}