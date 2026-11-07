import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Plus, X, ImagePlus, FileUp, Trash2, Calendar } from "lucide-react";
import { useDiario, useDias, useViajantes, useInvalidate, doRoteiro } from "@/lib/useTrip";
import { base44 } from "@/api/base44Client";
import { toast } from "react-hot-toast";
import { usePermissao } from "@/lib/usePermissao";
import { formatarData } from "@/lib/tripData";
import GaleriaFotos from "@/components/diario/GaleriaFotos";
import { comprimirImagem } from "@/lib/imagem";

export default function Diario() {
  const { data: todosDias } = useDias();
  const dias = doRoteiro(todosDias);
  const { data: viajantes } = useViajantes();
  const [diaSel, setDiaSel] = useState("");
  const [viajanteSel, setViajanteSel] = useState("TODOS");
  const { data: entradas, isLoading } = useDiario(diaSel || null);
  const invalidate = useInvalidate();
  const { podeMexerNoRegistro } = usePermissao();
  const [adicionando, setAdicionando] = useState(false);

  const entradasFiltradas = (entradas || []).filter((e) => viajanteSel === "TODOS" || e.viajante_nome === viajanteSel);

  async function remover(id) {
    try { await base44.entities.DiarioEntrada.delete(id); toast.success("Entrada removida"); invalidate([["diario", diaSel || "all"]]); }
    catch { toast.error("Erro"); }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.2em] uppercase text-accent font-medium">Memórias</p>
          <h1 className="font-heading text-3xl font-semibold text-primary mt-1">Diário de viagem</h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Fotografias, anotações e comprovantes de cada dia. Todos os viajantes podem contribuir.
          </p>
        </div>
        <button onClick={() => setAdicionando((v) => !v)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 shrink-0">
          {adicionando ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {adicionando ? "Cancelar" : "Nova entrada"}
        </button>
      </header>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button onClick={() => setDiaSel("")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${!diaSel ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground"}`}>
          Todos os dias
        </button>
        {(dias || []).map((d) => (
          <button key={d.id} onClick={() => setDiaSel(d.data)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${diaSel === d.data ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground"}`}>
            {formatarData(d.data)}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button onClick={() => setViajanteSel("TODOS")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${viajanteSel === "TODOS" ? "bg-accent text-accent-foreground border-accent" : "border-border bg-card text-muted-foreground"}`}>
          Todos
        </button>
        {(viajantes || []).map((v) => (
          <button key={v.id} onClick={() => setViajanteSel(v.nome)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${viajanteSel === v.nome ? "bg-accent text-accent-foreground border-accent" : "border-border bg-card text-muted-foreground"}`}>
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-semibold text-white" style={{ background: v.cor }}>{v.iniciais}</span>
            {v.nome}
          </button>
        ))}
      </div>

      {adicionando && <FormEntrada dias={dias || []} viajantes={viajantes || []} diaPadrao={diaSel} onDone={() => { setAdicionando(false); invalidate([["diario", diaSel || "all"]]); }} />}

      {!isLoading && <GaleriaFotos entradas={entradasFiltradas} dias={dias || []} />}

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">Carregando…</div>
      ) : entradasFiltradas.length === 0 ? (
        <div className="py-16 text-center bg-card rounded-2xl border border-border">
          <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma entrada ainda. Comece a registrar as memórias da viagem.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {entradasFiltradas.map((e, i) => {
            const dia = (dias || []).find((d) => d.data === e.dia_data);
            return (
              <motion.div key={e.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-card rounded-2xl border border-border shadow-soft p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {dia ? `${formatarData(e.dia_data)} · ${dia.titulo}` : formatarData(e.dia_data)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-accent">{e.viajante_nome}</span>
                    {podeMexerNoRegistro(e) && <button onClick={() => remover(e.id)} className="text-muted-foreground hover:text-destructive p-1" aria-label="Remover"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </div>
                {e.texto && <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{e.texto}</p>}
                {e.fotos?.length > 0 && (
                 <p className="mt-2 text-[11px] text-muted-foreground">
                   {e.fotos.length} foto(s) na galeria do dia
                 </p>
                )}
                {e.comprovantes?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {e.comprovantes.map((c, idx) => (
                      <a key={idx} href="#" onClick={async (ev) => { ev.preventDefault(); const r = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: c }); window.open(r.signed_url, "_blank"); }}
                        className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline">
                        <FileUp className="w-3.5 h-3.5" /> Comprovante {idx + 1}
                      </a>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FormEntrada({ dias, viajantes, diaPadrao, onDone }) {
  const [form, setForm] = useState({
    dia_data: diaPadrao || (dias[0]?.data || ""), viajante_nome: viajantes[0]?.nome || "", texto: "",
  });
  const [fotos, setFotos] = useState([]);
  const [comprovantes, setComprovantes] = useState([]);
  const [enviando, setEnviando] = useState(false);

  async function uploadArquivos(files, setter) {
    const uris = [];
    for (const f of Array.from(files)) {
      try {
        const res = await base44.integrations.Core.UploadPrivateFile({ file: await comprimirImagem(f) });
        uris.push(res.file_uri);
      } catch { toast.error(`Erro no envio de ${f.name}`); }
    }
    setter((prev) => [...prev, ...uris]);
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.dia_data || !form.viajante_nome) return;
    setEnviando(true);
    try {
      await base44.entities.DiarioEntrada.create({
        dia_data: form.dia_data, viajante_nome: form.viajante_nome, texto: form.texto,
        fotos, comprovantes,
      });
      toast.success("Entrada registrada"); onDone();
    } catch { toast.error("Erro ao salvar"); }
    finally { setEnviando(false); }
  }

  return (
    <motion.form initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} onSubmit={salvar}
      className="bg-card rounded-2xl border border-border shadow-soft p-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Dia</span>
          <select value={form.dia_data} onChange={(e) => setForm({ ...form, dia_data: e.target.value })}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            {dias.map((d) => <option key={d.id} value={d.data}>{formatarData(d.data)} — {d.titulo}</option>)}
          </select></label>
        <label className="block"><span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Viajante</span>
          <select value={form.viajante_nome} onChange={(e) => setForm({ ...form, viajante_nome: e.target.value })}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="TODOS">Todos</option>
            {viajantes.map((v) => <option key={v.id} value={v.nome}>{v.nome}</option>)}
          </select></label>
      </div>
      <label className="block"><span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Anotação</span>
        <textarea value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} rows={3}
          placeholder="Como foi o dia…"
          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></label>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-accent text-muted-foreground">
          <ImagePlus className="w-5 h-5" />
          <span className="text-xs">Adicionar fotos (armazenadas privadamente)</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => uploadArquivos(e.target.files, setFotos)} />
          {fotos.length > 0 && <span className="text-[11px] text-accent font-medium">{fotos.length} foto(s)</span>}
        </label>
        <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-accent text-muted-foreground">
          <FileUp className="w-5 h-5" />
          <span className="text-xs">Adicionar comprovantes: fotos, prints ou PDFs (privados)</span>
          <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => uploadArquivos(e.target.files, setComprovantes)} />
          {comprovantes.length > 0 && <span className="text-[11px] text-accent font-medium">{comprovantes.length} anexo(s)</span>}
        </label>
      </div>
      <button type="submit" disabled={enviando} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50">
        {enviando ? "Enviando…" : "Salvar entrada"}
      </button>
    </motion.form>
  );
}