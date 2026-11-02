import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, ChevronDown, FileText, Loader2, Save, X, Check, AlertCircle, Globe, Images,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useCidades, useDias, useInvalidate } from "@/lib/useTrip";
import { parseRoteiroTexto } from "@/lib/parseRoteiroTexto";
import RoteiroPreview from "./RoteiroPreview";
import { formatarData } from "@/lib/tripData";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

const CATEGORIAS = ["atração", "refeição", "transporte", "hospedagem", "estacionamento", "outro"];
const normalizar = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export default function ImportarRoteiro() {
  const { data: cidades } = useCidades();
  const { data: dias } = useDias();
  const invalidate = useInvalidate();
  const [aberto, setAberto] = useState(false);
  const [iniciado, setIniciado] = useState(false);
  const [texto, setTexto] = useState("");
  const [arquivos, setArquivos] = useState([]);
  const [busca, setBusca] = useState("");
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState("");
  const [resumo, setResumo] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [selecionados, setSelecionados] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [perguntando, setPerguntando] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (iniciado || dias === undefined) return;
    if (!dias.length) setAberto(true);
    setIniciado(true);
  }, [dias, iniciado]);

  async function pedirIA({ texto: textoBase, fileUrls, busca: termo }) {
    const res = await base44.functions.invoke("ImportarRoteiroIA", {
      texto: textoBase || undefined,
      file_urls: fileUrls?.length ? fileUrls : undefined,
      busca: termo || undefined,
    });
    const lista = res?.data?.dias || res?.dias || [];
    return Array.isArray(lista) ? lista : [];
  }

  async function prepararArquivos(textoBase) {
    let textoFinal = textoBase;
    const fileUrls = [];
    for (const f of arquivos) {
      if (/\.(txt|md)$/i.test(f.name)) {
        const lido = await f.text();
        textoFinal = [textoFinal, lido].filter(Boolean).join("\n\n");
      } else {
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: f });
        const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 900 });
        fileUrls.push(signed_url);
      }
    }
    return { textoFinal, fileUrls };
  }

  async function gravar(entrada, roteiro) {
    const porData = new Map();
    entrada.forEach((d) => { if (d?.data) porData.set(d.data, d); });
    const lista = [...porData.values()];

    const res = await base44.functions.invoke("SalvarRoteiro", { dias: lista, roteiro });
    const r = res?.data || {};
    if (r?.error) throw new Error(r.error);

    invalidate([["dias"], ["cidades"], ["atividades"]]);
    return {
      lista,
      roteiro,
      criados: r.criados || 0,
      atualizados: r.atualizados || 0,
      atividades: r.atividades || 0,
    };
  }

  async function executar(montarPayload) {
    setProcessando(true);
    setErro("");
    setResumo(null);
    setResultado(null);
    try {
      const payload = await montarPayload();
      let lista = [];
      try {
        lista = await pedirIA(payload);
      } catch {
        lista = [];
      }
      if (!lista.length && payload.texto) {
        lista = parseRoteiroTexto(payload.texto, (cidades || []).map((c) => c.nome));
      }
      lista = lista.filter((d) => d?.data);
      if (!lista.length) {
        setErro('Não consegui identificar os dias. Inclua linhas como "Dia 1 – 24/03/2027 – Roma".');
        return;
      }

      setResultado(lista);
      setSelecionados(Object.fromEntries(lista.map((_, i) => [i, true])));
      toast.success(`${lista.length} dia(s) mapeados. Confira a prévia e salve.`);
    } catch (e) {
      setErro(e?.response?.data?.error || e?.data?.error || e?.message || "Erro ao mapear os dias do roteiro.");
    } finally {
      setProcessando(false);
    }
  }

  async function analisar() {
    const base = texto.trim();
    if (!base && !arquivos.length) {
      setErro("Cole o texto do roteiro, anexe um print/foto ou use a busca na internet.");
      return;
    }
    await executar(async () => {
      const { textoFinal, fileUrls } = await prepararArquivos(base);
      return { texto: textoFinal, fileUrls };
    });
  }

  async function buscar() {
    const termo = busca.trim();
    if (termo.length < 5) {
      setErro("Descreva o roteiro que você quer pesquisar (ex.: 3 dias em Roma em março de 2027).");
      return;
    }
    await executar(async () => ({ busca: termo }));
  }

  function pedirDestino() {
    const escolhidos = (resultado || []).filter((_, i) => selecionados[i]);
    if (!escolhidos.length) {
      setErro("Selecione ao menos um dia para salvar.");
      return;
    }
    setErro("");
    setPerguntando(escolhidos.length);
  }

  async function salvar(roteiro) {
    const escolhidos = (resultado || []).filter((_, i) => selecionados[i]);
    if (!escolhidos.length) {
      setPerguntando(null);
      setErro("Selecione ao menos um dia para salvar.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const r = await gravar(escolhidos, roteiro);
      setResumo(r);
      setPerguntando(null);
      setResultado(null);
      setSelecionados({});
      setTexto("");
      setBusca("");
      setArquivos([]);
      if (fileRef.current) fileRef.current.value = "";
      toast.success(`${r.criados + r.atualizados} dia(s) salvos no roteiro ${roteiro}`);
    } catch (e) {
      setErro(e?.response?.data?.error || e?.data?.error || e?.message || "Não foi possível salvar no banco. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="bg-card rounded-2xl border border-accent/30 shadow-soft overflow-hidden">
      <button onClick={() => setAberto((v) => !v)} className="w-full flex items-center gap-3 p-4 text-left">
        <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-primary">Montar roteiro automaticamente</p>
          <p className="text-[11px] text-muted-foreground">
            Pesquise na internet como no ChatGPT, cole um texto ou importe prints e fotos da galeria — na hora de salvar você escolhe se entra no roteiro principal ou no alternativo.
          </p>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0", aberto && "rotate-180")} />
      </button>

      <AnimatePresence initial={false}>
        {aberto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3 border-t border-border space-y-3">
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 space-y-2">
                <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-accent" /> Buscar na internet (como no ChatGPT)
                </p>
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => { setBusca(e.target.value); setErro(""); }}
                  placeholder="Ex.: 3 dias em Roma para família, com horários e bairros"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={buscar}
                  disabled={processando || salvando}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                >
                  {processando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                  {processando ? "Pesquisando na internet…" : "Pesquisar e montar roteiro"}
                </button>
              </div>

              <textarea
                value={texto}
                onChange={(e) => { setTexto(e.target.value); setErro(""); }}
                rows={8}
                placeholder={"Cole aqui o roteiro do ChatGPT…\n\nEx.:\nDia 1 – 24/03/2027 – Roma\n09:00 Coliseu (2h)\n13:00 Almoço em Trastevere\n15:30 Fontana di Trevi\n\nDia 2 – 25/03/2027 – Roma…"}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              />

              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.md,image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const novos = Array.from(e.target.files || []);
                    setArquivos((prev) => [...prev, ...novos]);
                    setErro("");
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:border-accent/60"
                >
                  <Images className="w-3.5 h-3.5" /> Anexar print/foto da galeria, PDF ou Word
                </button>
                {arquivos.map((a, i) => (
                  <span key={`${a.name}-${i}`} className="inline-flex items-center gap-1.5 text-xs text-foreground bg-secondary rounded-lg px-2 py-1.5">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="max-w-[140px] truncate">{a.name}</span>
                    <button onClick={() => setArquivos((prev) => prev.filter((_, idx) => idx !== i))} aria-label="Remover arquivo">
                      <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={analisar}
                  disabled={processando || salvando}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                >
                  {processando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {processando ? "Mapeando dias e atividades…" : "Mapear dias e atividades"}
                </button>
                <button
                  onClick={pedirDestino}
                  disabled={salvando || processando || !resultado}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40"
                >
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {salvando ? "Salvando no banco…" : "Salvar prévia"}
                </button>
              </div>

              {perguntando && !salvando && (
                <div className="rounded-xl border border-accent/40 bg-accent/5 p-3 space-y-2">
                  <p className="text-xs font-semibold text-primary">
                    Salvar {perguntando} dia(s) em qual roteiro?
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => salvar("principal")}
                      className="text-left rounded-lg border border-border bg-card px-3 py-2 hover:border-accent transition-colors"
                    >
                      <span className="block text-xs font-semibold text-primary">Roteiro principal</span>
                      <span className="block text-[11px] text-muted-foreground">
                        Vai para a viagem oficial. Dias com a mesma data são atualizados.
                      </span>
                    </button>
                    <button
                      onClick={() => salvar("alternativo")}
                      className="text-left rounded-lg border border-border bg-card px-3 py-2 hover:border-accent transition-colors"
                    >
                      <span className="block text-xs font-semibold text-primary">Roteiro alternativo</span>
                      <span className="block text-[11px] text-muted-foreground">
                        Fica guardado à parte, sem alterar o principal.
                      </span>
                    </button>
                  </div>
                  <button onClick={() => setPerguntando(null)} className="text-[11px] text-muted-foreground hover:text-foreground">
                    Cancelar
                  </button>
                </div>
              )}

              {perguntando && salvando && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando no roteiro…
                </p>
              )}

              {erro && (
                <p className="flex items-start gap-1.5 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {erro}
                </p>
              )}

              {resultado && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-primary">
                      Prévia · {Object.values(selecionados).filter(Boolean).length} de {resultado.length} dia(s) selecionado(s)
                    </p>
                    <button
                      onClick={() => { setResultado(null); setSelecionados({}); }}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Descartar prévia"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto pr-1">
                    <RoteiroPreview
                      dias={resultado}
                      selecionados={selecionados}
                      onToggle={(i) => setSelecionados((p) => ({ ...p, [i]: !p[i] }))}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground flex items-start gap-1">
                    <Check className="w-3 h-3 mt-0.5 shrink-0" />
                    Ao salvar você escolhe o destino. No roteiro escolhido, dias com a mesma data são atualizados e as atividades desses dias são substituídas pelas da prévia.
                  </p>
                </div>
              )}

              {resumo && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-green-600" />
                    {resumo.criados} dia(s) novo(s), {resumo.atualizados} atualizado(s) e {resumo.atividades} atividade(s) salvos no roteiro {resumo.roteiro}
                  </p>
                  <div className="rounded-xl border border-border divide-y divide-border max-h-64 overflow-y-auto">
                    {resumo.lista.map((d, i) => (
                      <div key={`${d.data}-${i}`} className="flex items-center gap-3 px-3 py-2">
                        <span className="text-[11px] text-muted-foreground w-16 shrink-0">{formatarData(d.data, "curto")}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">{d.titulo}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {d.cidade} · {(d.atividades || []).length} atividade(s)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}