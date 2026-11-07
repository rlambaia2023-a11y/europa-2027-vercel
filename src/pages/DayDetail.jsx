import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin, Clock, ArrowLeft, Plus, ExternalLink, Trash2, Navigation, Car, Utensils, Camera, BedDouble, Map as MapIcon, CalendarPlus,
} from "lucide-react";
import { useDias, useCidades, useAtividades, useInvalidate, doRoteiro, useReservas } from "@/lib/useTrip";
import { reservasDoDia, periodoTexto, TIPOS_RESERVA } from "@/lib/reservaCondicao";
import { abrirAnexo } from "@/components/reservas/AnexarGlobal";
import Anexos from "@/components/Anexos";
import { AvisoInternetDia } from "@/components/InternetCelular";
import { formatarData } from "@/lib/tripData";
import { buildDayCalendarUrl } from "@/lib/googleCalendar";
import ChecklistRapido from "@/components/ChecklistRapido";
import { base44 } from "@/api/base44Client";
import { toast } from "react-hot-toast";
import { AvisoLink } from "@/components/LinkCompra";
import { usePermissao } from "@/lib/usePermissao";

const CATEGORIAS = [
  { id: "atração", icon: Camera, label: "Atração" },
  { id: "refeição", icon: Utensils, label: "Refeição" },
  { id: "transporte", icon: Car, label: "Transporte" },
  { id: "hospedagem", icon: BedDouble, label: "Hospedagem" },
  { id: "estacionamento", icon: MapIcon, label: "Estacionamento" },
  { id: "outro", icon: MapPin, label: "Outro" },
];

export default function DayDetail() {
  const { data: diaData } = useParams();
  const roteiro = new URLSearchParams(window.location.search).get("roteiro") === "alternativo" ? "alternativo" : "principal";
  const { data: todosDias } = useDias();
  const dias = doRoteiro(todosDias, roteiro);
  const { data: atividades, isLoading } = useAtividades(diaData, roteiro);
  const invalidate = useInvalidate();
  const { podeEditar } = usePermissao();
  const dia = (dias || []).find((d) => d.data === diaData);
  const { data: cidades } = useCidades();
  const paisDoDia = (cidades || []).find((c) => c.nome === dia?.cidade)?.pais;
  const [adicionando, setAdicionando] = useState(false);
  const [form, setForm] = useState({ horario: "", nome: "", endereco: "", tempo_visita: "", deslocamento: "", lat: "", lng: "", link: "", categoria: "atração" });

  const ordem = (dias || []).findIndex((d) => d.data === diaData) + 1;

  async function adicionar(e) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    try {
      await base44.entities.Atividade.create({
        dia_data: diaData,
        horario: form.horario,
        nome: form.nome,
        endereco: form.endereco,
        tempo_visita: form.tempo_visita,
        deslocamento: form.deslocamento,
        lat: form.lat ? parseFloat(form.lat) : undefined,
        lng: form.lng ? parseFloat(form.lng) : undefined,
        link: form.link || undefined,
        categoria: form.categoria,
        roteiro,
      });
      toast.success("Atividade adicionada");
      setForm({ horario: "", nome: "", endereco: "", tempo_visita: "", deslocamento: "", lat: "", lng: "", link: "", categoria: "atração" });
      setAdicionando(false);
      invalidate([["atividades", diaData]]);
    } catch (err) {
      toast.error("Não foi possível adicionar");
    }
  }

  async function remover(id) {
    try {
      await base44.entities.Atividade.delete(id);
      toast.success("Removida");
      invalidate([["atividades", diaData]]);
    } catch {
      toast.error("Erro ao remover");
    }
  }

  return (
    <div className="space-y-6">
      <Link to={`/itinerario${roteiro === "alternativo" ? "?roteiro=alternativo" : ""}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent">
        <ArrowLeft className="w-4 h-4" /> Voltar ao itinerário
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.2em] uppercase text-accent font-medium">
            Dia {ordem}{roteiro === "alternativo" ? " · roteiro alternativo" : ""}
          </p>
          <h1 className="font-heading text-3xl font-semibold text-primary mt-1 leading-tight">{dia?.titulo || "—"}</h1>
          <p className="text-sm text-muted-foreground mt-1">{formatarData(diaData, "longo")}</p>
          <p className="text-sm text-foreground/75 mt-2 max-w-2xl">{dia?.destaque}</p>
          <div className="flex items-center gap-1.5 text-xs text-accent font-medium mt-1.5">
            <MapPin className="w-3.5 h-3.5" /> {dia?.cidade}
          </div>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Link
            to={`/mapa?dia=${diaData}`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <MapIcon className="w-4 h-4" /> Mapa
          </Link>
          {dia && (
            <a
              href={buildDayCalendarUrl(dia, atividades)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90"
            >
              <CalendarPlus className="w-4 h-4" /> Google Agenda
            </a>
          )}
        </div>
      </header>

      <AvisoInternetDia pais={paisDoDia} cidade={dia?.cidade} />

      <ReservasDoDia data={diaData} />

      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-primary">Atividades do dia</h2>
        {podeEditar && <button
          onClick={() => setAdicionando((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:border-accent hover:text-accent transition-colors"
        >
          <Plus className="w-4 h-4" /> {adicionando ? "Cancelar" : "Adicionar"}
        </button>}
      </div>

      {adicionando && podeEditar && (
        <motion.form
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          onSubmit={adicionar}
          className="bg-card rounded-2xl border border-border shadow-soft p-4 space-y-3"
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <Campo label="Horário" value={form.horario} onChange={(v) => setForm({ ...form, horario: v })} placeholder="09:00" />
            <Campo label="Categoria" value={form.categoria} onChange={(v) => setForm({ ...form, categoria: v })} tipo="select" options={CATEGORIAS.map((c) => ({ value: c.id, label: c.label }))} />
          </div>
          <Campo label="Atração / atividade" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} placeholder="Ex.: Coliseu" />
          <Campo label="Endereço" value={form.endereco} onChange={(v) => setForm({ ...form, endereco: v })} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Campo label="Tempo de visita" value={form.tempo_visita} onChange={(v) => setForm({ ...form, tempo_visita: v })} placeholder="2h" />
            <Campo label="Deslocamento" value={form.deslocamento} onChange={(v) => setForm({ ...form, deslocamento: v })} placeholder="A pé 10min" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Campo label="Latitude" value={form.lat} onChange={(v) => setForm({ ...form, lat: v })} placeholder="41.8902" />
            <Campo label="Longitude" value={form.lng} onChange={(v) => setForm({ ...form, lng: v })} placeholder="12.4922" />
          </div>
          <Campo label="Link externo" value={form.link} onChange={(v) => setForm({ ...form, link: v })} placeholder="https://…" />
          <button type="submit" className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90">
            Salvar atividade
          </button>
        </motion.form>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">Carregando…</div>
      ) : (atividades || []).length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm bg-card rounded-2xl border border-border">
          Nenhuma atividade ainda. Toque em “Adicionar”.
        </div>
      ) : (
        <div className="space-y-2.5">
          {(atividades || []).map((a, i) => {
            const cat = CATEGORIAS.find((c) => c.id === a.categoria) || CATEGORIAS[0];
            const Icon = cat.icon;
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-card rounded-2xl border border-border shadow-soft p-4 flex gap-3"
              >
                <div className="flex flex-col items-center pt-0.5">
                  <div className="w-9 h-9 rounded-lg bg-secondary text-primary flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  {a.horario && <span className="text-[11px] text-muted-foreground mt-1 font-medium">{a.horario}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground leading-tight">{a.nome}</h3>
                  {a.endereco && <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" /> {a.endereco}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
                    {a.tempo_visita && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Visita {a.tempo_visita}</span>}
                    {a.deslocamento && <span className="flex items-center gap-1"><Navigation className="w-3 h-3" /> {a.deslocamento}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    {a.link && (
                      <a href={a.link} target="_blank" rel="noreferrer" className="text-[11px] text-accent font-medium inline-flex items-center gap-1 hover:underline">
                        <ExternalLink className="w-3 h-3" /> {a.link_tipo === "busca" || a.link.includes("google.com/search") ? "Procurar onde comprar" : a.link_tipo === "revendedor" ? "Comprar (revendedor)" : a.link_tipo === "oficial" ? "Site oficial / comprar" : "Abrir link"}
                      </a>
                    )}
                    {a.lat && a.lng && (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}`} target="_blank" rel="noreferrer" className="text-[11px] text-accent font-medium inline-flex items-center gap-1 hover:underline">
                        <MapIcon className="w-3 h-3" /> Google Maps
                      </a>
                    )}
                  </div>
                  <AvisoLink tipo={a.link_tipo} className="mt-2" />
                  <Anexos
                    className="mt-2"
                    uris={a.anexos}
                    podeEditar={podeEditar}
                    rotulo="Anexar ingresso, foto ou PDF"
                    onSalvar={async (lista) => { await base44.entities.Atividade.update(a.id, { anexos: lista }); invalidate([["atividades", diaData]]); }}
                  />
                </div>
                {podeEditar && (
                  <button onClick={() => remover(a.id)} className="text-muted-foreground hover:text-destructive self-start p-1" aria-label="Remover">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <ChecklistRapido diaData={diaData} />
    </div>
  );
}

function Campo({ label, value, onChange, placeholder, tipo = "text", options }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
      {tipo === "select" ? (
        <select
          value={value} onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input
          value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}
    </label>
  );
}
// Reservas já feitas que caem neste dia (hospedagem da noite, voos, transportes, passeios)
function ReservasDoDia({ data }) {
  const { data: reservas } = useReservas();
  const { podeEditar } = usePermissao();
  const lista = reservasDoDia(reservas, data);
  if (!lista.length && !podeEditar) return null;
  return (
    <section className="bg-card rounded-2xl border border-border shadow-soft p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-heading text-base font-semibold text-primary">Reservas do dia</h2>
        <div className="flex items-center gap-3">
          {podeEditar && (
            <button onClick={abrirAnexo} className="text-xs text-accent font-medium hover:underline">+ Anexar reserva</button>
          )}
          <Link to="/reservas" className="text-xs text-accent font-medium hover:underline">Ver todas</Link>
        </div>
      </div>
      {!lista.length && (
        <p className="text-xs text-muted-foreground">Nenhuma reserva para este dia ainda (hotel, Airbnb, carro, transporte, parque ou passeio).</p>
      )}
      <ul className="space-y-1.5">
        {lista.map((r) => (
          <li key={r.id} className="text-sm flex flex-wrap items-baseline gap-x-2">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {TIPOS_RESERVA.find((t) => t.id === r.tipo)?.curto || r.tipo}
            </span>
            <span className="font-medium">{r.nome}</span>
            <span className="text-xs text-muted-foreground">{[r.cidade, periodoTexto(r)].filter(Boolean).join(" · ")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
