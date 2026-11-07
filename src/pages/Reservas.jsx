import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Hotel as HotelIcon, Plane, Car, Plus, ExternalLink, Star, Trash2, X, ImagePlus, Loader2, Paperclip,
  TrainFront, Ticket, FolderInput, CalendarDays, MapPin,
} from "lucide-react";
import { useReservas, useInvalidate, useDias, useCidades, doRoteiro } from "@/lib/useTrip";
import AnexarReservas, { Condicao } from "@/components/reservas/AnexarReservas";
import { conferirReserva, periodoTexto } from "@/lib/reservaCondicao";
import { ESTADOS_RESERVA } from "@/lib/tripData";
import { base44 } from "@/api/base44Client";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { usePermissao } from "@/lib/usePermissao";

const TIPOS = [
  { id: "hotel", label: "Hospedagem", icon: HotelIcon },
  { id: "voo", label: "Voos", icon: Plane },
  { id: "transporte", label: "Transporte", icon: TrainFront },
  { id: "carro", label: "Carro", icon: Car },
  { id: "passeio", label: "Passeios", icon: Ticket },
];

export default function Reservas() {
  const { data: reservas, isLoading } = useReservas();
  const invalidate = useInvalidate();
  const { podeEditar, podeAdministrar } = usePermissao();
  const [aba, setAba] = useState("hotel");
  const [adicionando, setAdicionando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [dadosImportados, setDadosImportados] = useState(null);
  const [anexando, setAnexando] = useState(false);
  const fileInputRef = useRef(null);
  const { data: todosDias } = useDias();
  const dias = doRoteiro(todosDias);
  const { data: cidades } = useCidades();
  const contexto = { dias, cidades, reservas };

  // em ordem de data (sem data por último), para enxergar a viagem na sequência
  const lista = (reservas || [])
    .filter((r) => r.tipo === aba)
    .sort((a, b) => (a.data_inicio || "9999").localeCompare(b.data_inicio || "9999"));
  const pendentes = (reservas || []).filter((r) => r.estado !== "cancelado" && conferirReserva(r, contexto).nivel !== "ok").length;

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
      const roteiro = (dias || []).map((d) => ({ data: d.data, cidade: d.cidade }));
      const res = await base44.functions.invoke("LerReserva", { file_url: signed_url, tipo: aba, roteiro });
      const dados = res.data?.dados || res.dados || {};
      if (dados.tipo && dados.tipo !== aba) setAba(dados.tipo);
      setDadosImportados({ ...dados, comprovante_uri: file_uri });
      setAdicionando(true);
      toast.success("Dados extraídos do print! Revise e salve.");
    } catch {
      toast.error("Erro ao importar print");
    } finally {
      setImportando(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function mudarEstado(id, estado) {
    try {
      await base44.entities.Reserva.update(id, { estado });
      toast.success("Estado atualizado");
      invalidate([["reservas"]]);
    } catch {
      toast.error("Erro ao atualizar");
    }
  }

  async function remover(id) {
    try {
      await base44.entities.Reserva.delete(id);
      toast.success("Reserva removida");
      invalidate([["reservas"]]);
    } catch {
      toast.error("Erro ao remover");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.2em] uppercase text-accent font-medium">Reservas</p>
          <h1 className="font-heading text-3xl font-semibold text-primary mt-1">Hospedagem, voos, transporte e passeios</h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Cada reserva tem data e local, conferidos com o roteiro. Os preços são <strong>cotações</strong>, nunca tarifas confirmadas.
          </p>
        </div>
      </header>

      {/* Abas */}
      <div className="flex gap-1 sm:gap-2 border-b border-border overflow-x-auto">
        {TIPOS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setAba(t.id); setAdicionando(false); }}
            className={cn(
              "flex shrink-0 items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
              aba === t.id ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="w-4 h-4" /> {t.label}
            <span className="text-[11px] bg-secondary rounded-full px-1.5 py-0.5">
              {(reservas || []).filter((r) => r.tipo === t.id).length}
            </span>
          </button>
        ))}
      </div>

      {podeEditar && <div className="flex flex-wrap justify-end gap-2">
        <button
          onClick={() => { setAnexando((v) => !v); setAdicionando(false); }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          <FolderInput className="w-4 h-4" /> Anexar reservas feitas
        </button>
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
        <button
          onClick={() => { setAdicionando((v) => !v); setDadosImportados(null); setAnexando(false); }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90"
        >
          {adicionando ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {adicionando ? "Cancelar" : "Nova reserva"}
        </button>
      </div>}

      {anexando && podeEditar && (
        <AnexarReservas
          tipoAtual={aba}
          dias={dias}
          cidades={cidades}
          reservas={reservas}
          onFechar={() => setAnexando(false)}
          onSalvo={() => invalidate([["reservas"]])}
        />
      )}

      {pendentes > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-[12px] text-foreground/80">
          {pendentes} reserva(s) sem data/local ou fora do roteiro. Veja o aviso em cada uma.
        </div>
      )}

      {adicionando && podeEditar && (
        <FormReserva
          key={dadosImportados ? "importado" : aba}
          tipo={dadosImportados?.tipo || aba}
          contexto={contexto}
          initial={dadosImportados}
          onDone={() => { setAdicionando(false); setDadosImportados(null); invalidate([["reservas"]]); }}
        />
      )}

      {/* Aviso de cotação */}
      <div className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-2.5 text-[12px] text-foreground/80">
        Valores de referência (cotação). Confirme sempre data, moeda, fonte e condições antes de pagar.
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">Carregando reservas…</div>
      ) : lista.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm bg-card rounded-2xl border border-border">
          Nenhuma reserva de {TIPOS.find((t) => t.id === aba).label.toLowerCase()} ainda.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {lista.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-card rounded-2xl border border-border shadow-soft p-4 flex flex-col"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-medium text-foreground leading-tight">{r.nome}</h3>
                  {(r.cidade || r.endereco) && (
                    <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" /> {r.cidade || r.endereco}
                    </p>
                  )}
                  {r.data_inicio && (
                    <p className="text-xs text-foreground/80 mt-0.5 flex items-center gap-1">
                      <CalendarDays className="w-3 h-3 shrink-0" /> {periodoTexto(r)}
                    </p>
                  )}
                </div>
                <EstadoBadge estado={r.estado} />
              </div>
              {r.estado !== "cancelado" && (
                <div className="mt-2"><Condicao cond={conferirReserva(r, contexto)} compacto /></div>
              )}
              {podeEditar && <CompletarDataLocal reserva={r} onSalvo={() => invalidate([["reservas"]])} />}

              <div className="flex items-baseline gap-2 mt-3">
                <span className="font-heading text-2xl font-semibold text-primary">
                  {r.moeda === "EUR" ? "€" : "R$"} {(r.preco || 0).toLocaleString("pt-BR")}
                </span>
                <span className="text-[11px] text-muted-foreground">cotação</span>
              </div>

              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                {r.nota != null && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-gold text-gold" /> {r.nota.toFixed(1)}
                  </div>
                )}
                <div>Cotação de {r.data_cotacao ? new Date(r.data_cotacao + "T00:00:00").toLocaleDateString("pt-BR") : "—"} · {r.fonte || "—"}</div>
                {r.cancelamento && <div>Cancelamento: {r.cancelamento}</div>}
              </div>

              {r.detalhes && (
                <p className="text-xs text-foreground/70 mt-2 leading-relaxed bg-secondary/50 rounded-lg p-2.5">{r.detalhes}</p>
              )}

              {r.comprovante_uri && (
                <button
                  onClick={async () => {
                    try {
                      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: r.comprovante_uri });
                      window.open(signed_url, "_blank");
                    } catch { toast.error("Erro ao abrir comprovante"); }
                  }}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-accent font-medium hover:underline"
                >
                  <Paperclip className="w-3 h-3" /> Ver comprovante
                </button>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={r.estado}
                  onChange={(e) => mudarEstado(r.id, e.target.value)}
                  disabled={!podeEditar}
                  className="text-xs rounded-lg border border-input bg-background px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {ESTADOS_RESERVA.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                </select>
                {r.link && (
                  <a href={r.link} target="_blank" rel="noreferrer" className="text-xs text-accent font-medium inline-flex items-center gap-1 hover:underline">
                    <ExternalLink className="w-3 h-3" /> Abrir reserva
                  </a>
                )}
                {podeAdministrar && (
                  <button onClick={() => remover(r.id)} className="ml-auto text-muted-foreground hover:text-destructive p-1" aria-label="Remover">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// Ajuste rápido de data e local direto no cartão (para reservas antigas ou lidas sem data)
function CompletarDataLocal({ reserva: r, onSalvo }) {
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState({ data_inicio: r.data_inicio || "", data_fim: r.data_fim || "", cidade: r.cidade || "", horario: r.horario || "" });
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!f.data_inicio || !f.cidade.trim()) return toast.error("Informe a data e o local.");
    setSalvando(true);
    try {
      await base44.entities.Reserva.update(r.id, {
        ...f,
        data_fim: f.data_fim || null,
        ...(f.cidade !== r.cidade ? { lat: null, lng: null } : {}),
      });
      toast.success("Data e local salvos");
      setAberto(false);
      onSalvo();
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} className="mt-2 self-start inline-flex items-center gap-1 text-xs text-accent font-medium hover:underline">
        <CalendarDays className="w-3 h-3" /> {r.data_inicio ? "Ajustar data e local" : "Completar data e local"}
      </button>
    );
  }
  return (
    <div className="mt-2 rounded-lg bg-secondary/50 p-2.5 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <In label={r.tipo === "hotel" ? "Check-in" : "Data"} value={f.data_inicio} onChange={(v) => setF({ ...f, data_inicio: v })} tipo="date" />
        <In label={r.tipo === "hotel" ? "Check-out" : "Até"} value={f.data_fim} onChange={(v) => setF({ ...f, data_fim: v })} tipo="date" />
        <In label={r.tipo === "voo" || r.tipo === "transporte" ? "Trecho" : "Cidade"} value={f.cidade} onChange={(v) => setF({ ...f, cidade: v })} />
        <In label="Horário" value={f.horario} onChange={(v) => setF({ ...f, horario: v })} />
      </div>
      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50">
          {salvando ? "Salvando…" : "Salvar"}
        </button>
        <button onClick={() => setAberto(false)} className="px-3 py-1.5 rounded-lg border border-border text-xs">Cancelar</button>
      </div>
    </div>
  );
}

function EstadoBadge({ estado }) {
  const e = ESTADOS_RESERVA.find((x) => x.id === estado) || ESTADOS_RESERVA[0];
  return (
    <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-full" style={{ background: e.cor + "20", color: e.cor }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: e.cor }} /> {e.label}
    </span>
  );
}

function FormReserva({ tipo, initial, onDone, contexto }) {
  const [form, setForm] = useState(() => ({
    nome: "", cidade: "", estado: "reservado", preco: "", moeda: "EUR",
    nota: "", data_cotacao: new Date().toISOString().slice(0, 10), fonte: "", link: "", cancelamento: "", detalhes: "",
    data_inicio: "", data_fim: "", horario: "", endereco: "",
    ...(initial || {}),
    preco: initial?.preco != null ? String(initial.preco) : "",
    nota: initial?.nota != null ? String(initial.nota) : "",
  }));
  const comprovanteUri = initial?.comprovante_uri || "";

  async function salvar(e) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    if (!form.data_inicio || (!form.cidade.trim() && !form.endereco.trim())) {
      toast.error("Informe a data e o local da reserva.");
      return;
    }
    try {
      await base44.entities.Reserva.create({
        tipo,
        nome: form.nome,
        cidade: form.cidade,
        endereco: form.endereco,
        lat: initial?.lat != null && form.cidade === initial?.cidade ? initial.lat : undefined,
        lng: initial?.lng != null && form.cidade === initial?.cidade ? initial.lng : undefined,
        data_inicio: form.data_inicio,
        data_fim: form.data_fim || undefined,
        horario: form.horario,
        estado: form.estado,
        preco: form.preco ? parseFloat(form.preco) : undefined,
        moeda: form.moeda,
        nota: form.nota ? parseFloat(form.nota) : undefined,
        data_cotacao: form.data_cotacao,
        fonte: form.fonte,
        link: form.link || undefined,
        cancelamento: form.cancelamento,
        detalhes: form.detalhes,
        comprovante_uri: comprovanteUri || undefined,
      });
      toast.success("Reserva adicionada");
      onDone();
    } catch {
      toast.error("Erro ao adicionar");
    }
  }

  return (
    <motion.form initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      onSubmit={salvar} className="bg-card rounded-2xl border border-border shadow-soft p-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <In label="Nome" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} placeholder={tipo === "voo" ? "SSA → FCO" : "Hotel…"} />
        <In label={tipo === "voo" || tipo === "transporte" ? "Trecho (origem → destino)" : "Cidade"} value={form.cidade} onChange={(v) => setForm({ ...form, cidade: v })} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <In label={tipo === "hotel" ? "Check-in" : "Data"} value={form.data_inicio} onChange={(v) => setForm({ ...form, data_inicio: v })} tipo="date" />
        <In label={tipo === "hotel" ? "Check-out" : "Até (opcional)"} value={form.data_fim} onChange={(v) => setForm({ ...form, data_fim: v })} tipo="date" />
        <In label="Horário" value={form.horario} onChange={(v) => setForm({ ...form, horario: v })} placeholder={tipo === "hotel" ? "check-in 15:00" : "08:40"} />
        <In label="Endereço / encontro" value={form.endereco} onChange={(v) => setForm({ ...form, endereco: v })} />
      </div>
      <Condicao cond={conferirReserva({ ...form, tipo, lat: form.cidade === initial?.cidade ? initial?.lat : null, lng: form.cidade === initial?.cidade ? initial?.lng : null }, contexto)} />
      <div className="grid sm:grid-cols-3 gap-3">
        <Sel label="Estado" value={form.estado} onChange={(v) => setForm({ ...form, estado: v })} options={ESTADOS_RESERVA.map((e) => ({ value: e.id, label: e.label }))} />
        <In label="Preço (cotação)" value={form.preco} onChange={(v) => setForm({ ...form, preco: v })} placeholder="0" tipo="number" />
        <Sel label="Moeda" value={form.moeda} onChange={(v) => setForm({ ...form, moeda: v })} options={[{ value: "EUR", label: "EUR (€)" }, { value: "BRL", label: "BRL (R$)" }]} />
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <In label="Nota (0-5)" value={form.nota} onChange={(v) => setForm({ ...form, nota: v })} tipo="number" />
        <In label="Data da cotação" value={form.data_cotacao} onChange={(v) => setForm({ ...form, data_cotacao: v })} tipo="date" />
        <In label="Fonte" value={form.fonte} onChange={(v) => setForm({ ...form, fonte: v })} placeholder="Booking.com" />
      </div>
      <In label="Link de reserva" value={form.link} onChange={(v) => setForm({ ...form, link: v })} placeholder="https://…" />
      {tipo === "hotel" && <In label="Política de cancelamento" value={form.cancelamento} onChange={(v) => setForm({ ...form, cancelamento: v })} />}
      <label className="block">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Detalhes</span>
        <textarea value={form.detalhes} onChange={(e) => setForm({ ...form, detalhes: e.target.value })}
          rows={3} placeholder={tipo === "carro" ? "Categoria, bagagem, seguros, franquia, autorização de fronteira…" : "Escalas, bagagem, condições…"}
          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </label>
      {comprovanteUri && (
        <p className="inline-flex items-center gap-1.5 text-xs text-accent bg-accent/10 rounded-lg px-3 py-2">
          <Paperclip className="w-3.5 h-3.5" /> Comprovante anexado do print importado
        </p>
      )}
      <button type="submit" className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">Salvar reserva</button>
    </motion.form>
  );
}

function In({ label, value, onChange, placeholder, tipo = "text" }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
      <input type={tipo} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
    </label>
  );
}
function Sel({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}