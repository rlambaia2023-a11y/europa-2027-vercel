import { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  Wallet, Plus, Trash2, X, Download, FileText, CheckCircle2, Clock, ArrowRightLeft,
  ImagePlus, Loader2, Paperclip, Pencil,
} from "lucide-react";
import { useDespesas, useCambio, useViajantes, useInvalidate } from "@/lib/useTrip";
import { base44 } from "@/api/base44Client";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { usePermissao } from "@/lib/usePermissao";

const CATEGORIAS = [
  { id: "voos", label: "Voos" },
  { id: "hoteis", label: "Hotéis" },
  { id: "carro", label: "Carro" },
  { id: "alimentacao", label: "Alimentação" },
  { id: "atracoes", label: "Atrações" },
  { id: "extras", label: "Extras" },
];

function eurToBrl(v, moeda, taxa) { return moeda === "EUR" ? v * taxa : v; }

export default function Orcamento() {
  const { data: despesas, isLoading } = useDespesas();
  const { data: cambio } = useCambio();
  const { data: viajantes } = useViajantes();
  const invalidate = useInvalidate();
  const { podeEditar } = usePermissao();
  const [adicionando, setAdicionando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [dadosImportados, setDadosImportados] = useState(null);
  const [editandoDespesa, setEditandoDespesa] = useState(null);
  const fileInputRef = useRef(null);
  const taxa = cambio?.taxa || 5.45;

  async function comprimirImagem(file, maxDim = 1600) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const scale = maxDim / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error("Falha ao comprimir imagem"));
            resolve(new File([blob], "print.jpg", { type: "image/jpeg" }));
          }, "image/jpeg", 0.85);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleImportPrint(file) {
    if (!file) return;
    setImportando(true);
    try {
      const compacto = await comprimirImagem(file).catch(() => file);
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: compacto });
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri });
      const res = await base44.functions.invoke("ImportarDespesaPrint", { file_url: signed_url });
      const dados = res.data?.dados || res.dados || {};
      setDadosImportados({ ...dados, comprovante_uri: file_uri });
      setAdicionando(true);
      toast.success("Dados extraídos do print! Revise e confirme.");
    } catch {
      toast.error("Erro ao importar print");
    } finally {
      setImportando(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const totais = useMemo(() => {
    const lista = despesas || [];
    const totalBRL = lista.reduce((s, d) => s + eurToBrl(d.valor, d.moeda, taxa), 0);
    const totalEUR = lista.reduce((s, d) => s + (d.moeda === "EUR" ? d.valor : d.valor / taxa), 0);
    const pagoBRL = lista.filter((d) => d.paga).reduce((s, d) => s + eurToBrl(d.valor, d.moeda, taxa), 0);
    const pendenteBRL = totalBRL - pagoBRL;
    const porCat = CATEGORIAS.map((c) => {
      const itens = lista.filter((d) => d.categoria === c.id);
      const brl = itens.reduce((s, d) => s + eurToBrl(d.valor, d.moeda, taxa), 0);
      return { ...c, total: brl, count: itens.length };
    });
    return { totalBRL, totalEUR, pagoBRL, pendenteBRL, porCat };
  }, [despesas, taxa]);

  const porPessoa = totais.totalBRL / 4;

  async function togglePaga(d) {
    try {
      await base44.entities.Despesa.update(d.id, { paga: !d.paga });
      invalidate([["despesas"]]);
    } catch { toast.error("Erro"); }
  }
  async function remover(id) {
    try { await base44.entities.Despesa.delete(id); toast.success("Removida"); invalidate([["despesas"]]); }
    catch { toast.error("Erro"); }
  }

  function exportarCSV() {
    const rows = [["Descrição", "Categoria", "Valor", "Moeda", "Valor BRL", "Paga", "Viajante", "Data"]];
    (despesas || []).forEach((d) => {
      rows.push([d.descricao, d.categoria, d.valor, d.moeda, eurToBrl(d.valor, d.moeda, taxa).toFixed(2), d.paga ? "Sim" : "Não", d.viajante_nome || "", d.data || ""]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "orcamento-europa-2027.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function exportarPDF() {
    import("jspdf").then(({ jsPDF }) => {
      const doc = new jsPDF();
      doc.setFontSize(18); doc.text("Orçamento — Europa 2027", 14, 20);
      doc.setFontSize(10); doc.setTextColor(120);
      doc.text(`Câmbio: R$ ${taxa.toFixed(2)} / € 1 · ${cambio?.fonte || ""} · ${cambio?.data || ""}`, 14, 28);
      doc.setTextColor(0);
      let y = 40;
      doc.setFontSize(13); doc.text("Resumo", 14, y); y += 8;
      doc.setFontSize(11);
      doc.text(`Total estimado: R$ ${totais.totalBRL.toFixed(2)} (€ ${totais.totalEUR.toFixed(2)})`, 14, y); y += 7;
      doc.text(`Pago: R$ ${totais.pagoBRL.toFixed(2)}  |  Pendente: R$ ${totais.pendenteBRL.toFixed(2)}`, 14, y); y += 7;
      doc.text(`Por pessoa (4): R$ ${porPessoa.toFixed(2)}`, 14, y); y += 12;
      doc.setFontSize(13); doc.text("Por categoria", 14, y); y += 8;
      doc.setFontSize(11);
      totais.porCat.forEach((c) => { doc.text(`${c.label}: R$ ${c.total.toFixed(2)} (${c.count} itens)`, 14, y); y += 7; });
      if (y > 250) { doc.addPage(); y = 20; }
      y += 6; doc.setFontSize(13); doc.text("Despesas", 14, y); y += 8; doc.setFontSize(9);
      (despesas || []).forEach((d) => {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(`${d.descricao} — ${d.moeda} ${d.valor} (R$ ${eurToBrl(d.valor, d.moeda, taxa).toFixed(2)}) [${d.paga ? "paga" : "pendente"}]`, 14, y); y += 6;
      });
      doc.save("orcamento-europa-2027.pdf");
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] tracking-[0.2em] uppercase text-accent font-medium">Planejamento financeiro</p>
        <h1 className="font-heading text-3xl font-semibold text-primary mt-1">Orçamento da viagem</h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
          Despesas individuais e coletivas, conversão EUR/BRL e acompanhamento de pagos e pendentes para 4 pessoas.
        </p>
      </header>

      {/* Câmbio + totais */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-primary text-primary-foreground rounded-2xl p-5 shadow-soft">
          <div className="flex items-center gap-2 text-primary-foreground/70 text-[11px] uppercase tracking-wide">
            <ArrowRightLeft className="w-3.5 h-3.5" /> Câmbio EUR→BRL
          </div>
          <p className="font-heading text-3xl font-semibold mt-2">R$ {taxa.toFixed(2)}</p>
          <p className="text-[11px] text-primary-foreground/60 mt-1">{cambio?.fonte} · {cambio?.data}</p>
        </div>
        <Card icon={Wallet} label="Total estimado" valor={`R$ ${totais.totalBRL.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} sub={`€ ${totais.totalEUR.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} />
        <Card icon={CheckCircle2} label="Pago" valor={`R$ ${totais.pagoBRL.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} sub="já quitado" cor="#1e7d4f" />
        <Card icon={Clock} label="Pendente" valor={`R$ ${totais.pendenteBRL.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} sub="a pagar" cor="#c06b4a" />
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-soft p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Por pessoa (4 viajantes)</p>
          <p className="font-heading text-3xl font-semibold text-primary">R$ {porPessoa.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportarCSV} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:border-accent">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={exportarPDF} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <FileText className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* Por categoria */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {totais.porCat.map((c) => (
          <div key={c.id} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <span className="text-[11px] text-muted-foreground">{c.count} itens</span>
            </div>
            <p className="font-heading text-xl font-semibold text-primary mt-1">R$ {c.total.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
            <div className="h-1.5 rounded-full bg-secondary mt-2 overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: totais.totalBRL ? `${(c.total / totais.totalBRL) * 100}%` : "0%" }} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold text-primary">Despesas lançadas</h2>
        {podeEditar && <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImportPrint(e.target.files?.[0])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importando}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-accent text-accent text-sm font-medium hover:bg-accent/10 disabled:opacity-50"
          >
            {importando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            {importando ? "Lendo print…" : "Importar print"}
          </button>
          <button onClick={() => { setAdicionando((v) => !v); setDadosImportados(null); setEditandoDespesa(null); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90">
            {adicionando ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {adicionando ? "Cancelar" : "Nova despesa"}
          </button>
        </div>}
      </div>

      {adicionando && podeEditar && <FormDespesa viajantes={viajantes || []} initial={editandoDespesa || dadosImportados} editId={editandoDespesa?.id} onDone={() => { setAdicionando(false); setDadosImportados(null); setEditandoDespesa(null); invalidate([["despesas"]]); }} />}

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">Carregando…</div>
      ) : (despesas || []).length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm bg-card rounded-2xl border border-border">
          Nenhuma despesa lançada ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {(despesas || []).map((d, i) => (
            <motion.div key={d.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
              className="bg-card rounded-xl border border-border shadow-soft p-3.5 flex items-center gap-3">
              <button onClick={() => togglePaga(d)} disabled={!podeEditar} className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                d.paga ? "bg-green-600 border-green-600 text-white" : "border-border hover:border-accent")}>
                {d.paga && <CheckCircle2 className="w-3 h-3" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{d.descricao}</p>
                <div className="flex flex-wrap gap-x-3 text-[11px] text-muted-foreground mt-0.5">
                  <span>{CATEGORIAS.find((c) => c.id === d.categoria)?.label || d.categoria}</span>
                  {d.viajante_nome && <span>· {d.viajante_nome}</span>}
                  {d.coletiva && <span>· coletiva</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-medium text-sm">{d.moeda === "EUR" ? "€" : "R$"} {d.valor.toLocaleString("pt-BR")}</p>
                <p className="text-[11px] text-muted-foreground">≈ R$ {eurToBrl(d.valor, d.moeda, taxa).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
              </div>
              {d.comprovante_uri && (
                <button
                  onClick={async () => {
                    try {
                      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: d.comprovante_uri });
                      window.open(signed_url, "_blank");
                    } catch { toast.error("Erro ao abrir comprovante"); }
                  }}
                  className="text-muted-foreground hover:text-accent p-1" aria-label="Ver comprovante"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
              )}
              {podeEditar && (
                <>
                  <button onClick={() => { setEditandoDespesa(d); setAdicionando(true); setDadosImportados(null); }} className="text-muted-foreground hover:text-accent p-1" aria-label="Editar">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => remover(d.id)} className="text-muted-foreground hover:text-destructive p-1" aria-label="Remover">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ icon: Icon, label, valor, sub, cor }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-[11px] uppercase tracking-wide mb-2">
        <Icon className="w-4 h-4" style={{ color: cor }} /> {label}
      </div>
      <p className="font-heading text-2xl font-semibold text-primary leading-tight">{valor}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

function FormDespesa({ viajantes, initial, editId, onDone }) {
  const [form, setForm] = useState(() => ({
    descricao: "", categoria: "extras", valor: "", moeda: "EUR", paga: false, coletiva: true, viajante_nome: "", data: "",
    ...(initial || {}),
    valor: initial?.valor != null ? String(initial.valor) : "",
    paga: initial?.paga ?? false,
  }));
  const comprovanteUri = initial?.comprovante_uri || "";
  async function salvar(e) {
    e.preventDefault();
    if (!form.descricao.trim() || !form.valor) return;
    try {
      const payload = {
        descricao: form.descricao, categoria: form.categoria, valor: parseFloat(form.valor),
        moeda: form.moeda, paga: form.paga, coletiva: form.coletiva,
        viajante_nome: form.viajante_nome, data: form.data || undefined,
        comprovante_uri: comprovanteUri || undefined,
      };
      if (editId) {
        await base44.entities.Despesa.update(editId, payload);
        toast.success("Despesa atualizada");
      } else {
        await base44.entities.Despesa.create(payload);
        toast.success("Despesa lançada");
      }
      onDone();
    } catch { toast.error("Erro ao salvar"); }
  }
  return (
    <motion.form initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} onSubmit={salvar}
      className="bg-card rounded-2xl border border-border shadow-soft p-4 space-y-3">
      <p className="text-sm font-semibold text-primary">{editId ? "Editar despesa" : "Nova despesa"}</p>
      <In label="Descrição" value={form.descricao} onChange={(v) => setForm({ ...form, descricao: v })} placeholder="Jantar em Roma" />
      <div className="grid sm:grid-cols-3 gap-3">
        <Sel label="Categoria" value={form.categoria} onChange={(v) => setForm({ ...form, categoria: v })} options={CATEGORIAS.map((c) => ({ value: c.id, label: c.label }))} />
        <In label="Valor" value={form.valor} onChange={(v) => setForm({ ...form, valor: v })} tipo="number" />
        <Sel label="Moeda" value={form.moeda} onChange={(v) => setForm({ ...form, moeda: v })} options={[{ value: "EUR", label: "EUR (€)" }, { value: "BRL", label: "BRL (R$)" }]} />
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Sel label="Viajante" value={form.viajante_nome} onChange={(v) => setForm({ ...form, viajante_nome: v })} options={[{ value: "", label: "—" }, ...viajantes.map((v) => ({ value: v.nome, label: v.nome }))]} />
        <In label="Data" value={form.data} onChange={(v) => setForm({ ...form, data: v })} tipo="date" />
        <div className="flex items-end gap-4 pb-1">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.coletiva} onChange={(e) => setForm({ ...form, coletiva: e.target.checked })} className="accent-accent" /> Coletiva</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.paga} onChange={(e) => setForm({ ...form, paga: e.target.checked })} className="accent-accent" /> Paga</label>
        </div>
      </div>
      {comprovanteUri && (
        <p className="inline-flex items-center gap-1.5 text-xs text-accent bg-accent/10 rounded-lg px-3 py-2">
          <Paperclip className="w-3.5 h-3.5" /> Comprovante anexado do print importado
        </p>
      )}
      <button type="submit" className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">{editId ? "Salvar alterações" : "Lançar despesa"}</button>
    </motion.form>
  );
}
function In({ label, value, onChange, placeholder, tipo = "text" }) {
  return (<label className="block"><span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
    <input type={tipo} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></label>);
}
function Sel({ label, value, onChange, options }) {
  return (<label className="block"><span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>);
}