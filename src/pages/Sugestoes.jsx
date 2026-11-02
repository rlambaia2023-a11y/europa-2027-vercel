import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, MapPin, Clock, Plus, Loader2, Compass, ExternalLink, Check,
  BookOpen, Save, User,
} from "lucide-react";
import { useCidades, useDias, useViajantes, useInvalidate, doRoteiro } from "@/lib/useTrip";
import { base44 } from "@/api/base44Client";
import { toast } from "react-hot-toast";
import { usePermissao } from "@/lib/usePermissao";
import LinkCompra, { InfoIngresso, linkDeCompra } from "@/components/LinkCompra";
import { formatarData } from "@/lib/tripData";
import { cn } from "@/lib/utils";

export default function Sugestoes() {
  const { data: cidades } = useCidades();
  const { data: todosDias } = useDias();
  const dias = doRoteiro(todosDias);
  const { data: viajantes = [] } = useViajantes();
  const invalidate = useInvalidate();
  const { podeEditar } = usePermissao();
  const [cidadeSel, setCidadeSel] = useState("");
  const [sugestoes, setSugestoes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [adicionadas, setAdicionadas] = useState({});
  const [salvasDiario, setSalvasDiario] = useState({});
  const [selecionadas, setSelecionadas] = useState({});
  const [viajanteSel, setViajanteSel] = useState("");
  const [diaDiario, setDiaDiario] = useState("");
  const [salvandoDiario, setSalvandoDiario] = useState(false);

  const cidadesRoteiro = (cidades || []).filter((c) => c.lat && c.lng);

  useEffect(() => {
    if (!cidadesRoteiro.length) return;
    if (!cidadeSel) setCidadeSel(cidadesRoteiro[0].nome);
  }, [cidadesRoteiro.length]);

  useEffect(() => {
    if (!viajantes.length) return;
    if (!viajanteSel) setViajanteSel(viajantes[0].nome);
  }, [viajantes.length]);

  const diasNaCidade = useMemo(
    () => (dias || []).filter((d) => d.cidade === cidadeSel),
    [dias, cidadeSel]
  );

  useEffect(() => {
    if (diasNaCidade.length) setDiaDiario(diasNaCidade[0].data);
    else setDiaDiario("");
  }, [cidadeSel, diasNaCidade.length]);

  useEffect(() => {
    if (!cidadeSel) return;
    let ativo = true;
    setSugestoes([]);
    setErro("");
    setAdicionadas({});
    setSalvasDiario({});
    setSelecionadas({});
    setCarregando(true);
    (async () => {
      try {
        const cidade = cidadesRoteiro.find((c) => c.nome === cidadeSel);
        const res = await base44.functions.invoke("SugerirAtracoes", {
          cidade: cidadeSel,
          pais: cidade?.pais || "",
        });
        if (!ativo) return;
        const data = res?.data ?? res;
        setSugestoes(data?.sugestoes || []);
      } catch (e) {
        if (!ativo) return;
        const msg = e?.response?.data?.error || e?.message || "";
        setErro(msg ? `Erro: ${msg}` : "Não foi possível carregar as sugestões agora. Tente novamente.");
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, [cidadeSel]);

  const selecionadasCount = Object.values(selecionadas).filter(Boolean).length;

  function toggleSelecao(nome) {
    setSelecionadas((p) => ({ ...p, [nome]: !p[nome] }));
  }

  async function adicionarSugestao(s, diaData) {
    const alvo = diaData || diasNaCidade[0]?.data || (dias || [])[0]?.data;
    if (!alvo) {
      toast.error("Nenhum dia disponível");
      return;
    }
    try {
      await base44.entities.Atividade.create({
        dia_data: alvo,
        nome: s.nome,
        endereco: s.endereco || "",
        tempo_visita: s.tempo_visita || "",
        lat: s.lat || undefined,
        lng: s.lng || undefined,
        categoria: "atração",
        link: linkDeCompra(s) || undefined,
      });
      setAdicionadas((p) => ({ ...p, [s.nome]: alvo }));
      invalidate([["atividades", alvo], ["atividades", "all"]]);
      toast.success(`Adicionado a ${formatarData(alvo)}`);
    } catch {
      toast.error("Erro ao adicionar");
    }
  }

  function montarTexto(s) {
    return [
      s.nome,
      s.endereco ? s.endereco : "",
      s.descricao ? s.descricao : "",
      s.motivo ? `Por que visitar: ${s.motivo}` : "",
      s.tempo_visita ? `Tempo de visita: ${s.tempo_visita}` : "",
      s.ingresso ? `Ingresso: ${s.ingresso}` : "",
      linkDeCompra(s) ? `${s.link_oficial ? "Comprar / reservar" : "Site oficial"}: ${linkDeCompra(s)}` : "",
    ].filter(Boolean).join("\n");
  }

  async function salvarTodasDiario() {
    if (!sugestoes.length) return;
    if (!viajanteSel) { toast.error("Selecione um viajante"); return; }
    if (!diaDiario) { toast.error("Selecione um dia"); return; }
    setSalvandoDiario(true);
    let ok = 0;
    for (const s of sugestoes) {
      try {
        await base44.entities.DiarioEntrada.create({
          dia_data: diaDiario,
          viajante_nome: viajanteSel,
          texto: `📍 ${montarTexto(s)}`,
          fotos: [],
          comprovantes: [],
        });
        setSalvasDiario((p) => ({ ...p, [s.nome]: diaDiario }));
        ok++;
      } catch { /* segue */ }
    }
    invalidate([["diario", diaDiario], ["diario", "all"]]);
    setSalvandoDiario(false);
    setSelecionadas({});
    if (ok) toast.success(`${ok} atração(ões) salva(s) no diário de ${viajanteSel}`);
    else toast.error("Erro ao salvar no diário");
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] tracking-[0.2em] uppercase text-accent font-medium">Inspiração</p>
        <h1 className="font-heading text-3xl font-semibold text-primary mt-1 flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-gold" /> Pontos turísticos sugeridos
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
          A IA sugere atrações imperdíveis para cada cidade. Selecione as que gostar e salve direto no diário de viagem ou no itinerário.
        </p>
      </header>

      {/* Seletor de cidade */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {cidadesRoteiro.map((c) => (
          <button key={c.id} onClick={() => setCidadeSel(c.nome)}
            className={cn("px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors",
              cidadeSel === c.nome ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground hover:border-accent/50")}>
            {c.nome}
          </button>
        ))}
      </div>

      {diasNaCidade.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {diasNaCidade.length} dia(s) neste destino: {diasNaCidade.map((d) => formatarData(d.data)).join(" · ")}
        </p>
      )}

      {/* Barra de salvamento no diário */}
      {!carregando && !erro && sugestoes.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-soft p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-primary">Salvar no diário</span>
            </div>
            <label className="flex items-center gap-1.5 text-xs">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <select value={viajanteSel} onChange={(e) => setViajanteSel(e.target.value)}
                className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring">
                {viajantes.map((v) => <option key={v.id} value={v.nome}>{v.nome}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <select value={diaDiario} onChange={(e) => setDiaDiario(e.target.value)}
                className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring">
                {diasNaCidade.length === 0 && <option value="">Sem dia nesta cidade</option>}
                {diasNaCidade.map((d) => <option key={d.id} value={d.data}>{formatarData(d.data)}</option>)}
              </select>
            </label>
            <button onClick={salvarTodasDiario} disabled={!sugestoes.length || salvandoDiario || !diaDiario}
              className={cn("ml-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-opacity",
                sugestoes.length && !salvandoDiario ? "bg-accent text-accent-foreground hover:opacity-90" : "bg-secondary text-muted-foreground cursor-not-allowed")}>
              {salvandoDiario ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {salvandoDiario ? "Salvando…" : `Salvar TODAS no diário`}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {sugestoes.length} atração(ões) serão salvas para {viajanteSel || "—"} em {diaDiario ? formatarData(diaDiario) : "—"}.
          </p>
        </div>
      )}

      {carregando ? (
        <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-7 h-7 animate-spin text-accent" />
          <p className="text-sm">Buscando atrações em {cidadeSel}…</p>
        </div>
      ) : erro ? (
        <div className="py-12 text-center bg-card rounded-2xl border border-border">
          <p className="text-sm text-muted-foreground">{erro}</p>
        </div>
      ) : sugestoes.length === 0 ? (
        <div className="py-12 text-center bg-card rounded-2xl border border-border">
          <Compass className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma sugestão disponível.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {sugestoes.map((s, i) => {
            const adicionadaEm = adicionadas[s.nome];
            const salvaEm = salvasDiario[s.nome];
            const sel = !!selecionadas[s.nome];
            return (
              <motion.div key={s.nome + i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className={cn("bg-card rounded-2xl border shadow-soft p-4 flex flex-col transition-colors",
                  sel ? "border-accent ring-1 ring-accent/30" : "border-border")}>
                <div className="flex items-start gap-3">
                  <button onClick={() => toggleSelecao(s.nome)}
                    className={cn("mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                      sel ? "bg-accent border-accent text-white" : "border-border hover:border-accent")}
                    aria-label="Selecionar">
                    {sel && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-foreground leading-tight">{s.nome}</h3>
                      {s.tempo_visita && (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" /> {s.tempo_visita}
                        </span>
                      )}
                    </div>
                    {s.descricao && <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{s.descricao}</p>}
                    {s.motivo && <p className="text-xs text-accent mt-2 italic leading-relaxed">{s.motivo}</p>}
                    <InfoIngresso sugestao={s} className="mt-2" />
                    {s.endereco && (
                      <p className="text-[11px] text-muted-foreground mt-2 flex items-start gap-1">
                        <MapPin className="w-3 h-3 mt-0.5 shrink-0" /> {s.endereco}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 flex-wrap">
                  {adicionadaEm ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-green-600 font-medium">
                      <Check className="w-4 h-4" /> No itinerário · {formatarData(adicionadaEm)}
                    </span>
                  ) : podeEditar && (
                    <button onClick={() => adicionarSugestao(s)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">
                      <Plus className="w-3.5 h-3.5" /> Itinerário
                    </button>
                  )}
                  <LinkCompra sugestao={s} />
                  {salvaEm && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-accent font-medium">
                      <BookOpen className="w-3.5 h-3.5" /> No diário · {formatarData(salvaEm)}
                    </span>
                  )}
                  {s.lat && s.lng && (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`} target="_blank" rel="noreferrer"
                      className="ml-auto text-muted-foreground hover:text-accent p-1" aria-label="Ver no mapa">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}