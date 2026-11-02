import { motion } from "framer-motion";
import {
  Plane, MapPin, CalendarDays, Wallet, Users, Hotel as HotelIcon,
  Car, ArrowRight, Clock, CheckCircle2, Circle, AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  useDias, useCidades, useViajantes, useReservas, useCambio, useDespesas, doRoteiro,
} from "@/lib/useTrip";
import { VIAGEM, PAISES, ESTADOS_RESERVA, diasAte, formatarData } from "@/lib/tripData";
import { Image } from "@/components/ui/image";
import DespesasCategoria from "@/components/DespesasCategoria";
import { usePermissao } from "@/lib/usePermissao";

function eurToBrl(v, moeda, taxa) { return moeda === "EUR" ? v * taxa : v; }

export default function Dashboard() {
  const { organizador } = usePermissao();
  const { data: todosDias } = useDias();
  const dias = doRoteiro(todosDias);
  const { data: cidades } = useCidades();
  const { data: viajantes = [] } = useViajantes();
  const { data: reservas } = useReservas();
  const { data: cambio } = useCambio();
  const { data: despesas } = useDespesas();

  const diasRestantes = diasAte(VIAGEM.dataInicio);
  const totalDias = (dias || []).length || 13;
  const taxa = cambio?.taxa || 5.45;

  const reservasPorEstado = ESTADOS_RESERVA.map((e) => ({
    ...e,
    total: (reservas || []).filter((r) => r.estado === e.id).length,
  }));

  const totalDespesasBRL = (despesas || []).reduce((s, d) => s + eurToBrl(d.valor || 0, d.moeda, taxa), 0);
  const previstoReservasBRL = (reservas || []).reduce((s, r) => s + eurToBrl(r.preco || 0, r.moeda, taxa), 0);
  const totalPrevistoBRL = totalDespesasBRL + previstoReservasBRL;
  const totalPrevistoEUR = totalPrevistoBRL / taxa;
  const porPessoa = totalPrevistoBRL / (viajantes.length || 4);

  return (
    <div className="space-y-8">
      {/* Hero / contagem regressiva */}
      <motion.section
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-card"
      >
        <div className="absolute inset-0 opacity-20">
          <Image src="https://images.unsplash.com/photo-1552832230-c0197dd1d65b?w=1200&q=80" className="w-full h-full object-cover" alt="" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/85 to-primary/40" />
        <div className="relative px-6 sm:px-10 py-8 sm:py-10">
          <p className="text-[11px] tracking-[0.2em] uppercase text-gold mb-2 font-medium">Planejamento da viagem</p>
          <h1 className="font-heading text-3xl sm:text-4xl font-semibold leading-tight text-balance">
            Europa 2027 — Viagem em Família
          </h1>
          <p className="mt-2 text-primary-foreground/80 text-sm sm:text-base max-w-xl">
            De Salvador a Roma, de Split a Zagreb. Itália, Croácia, Montenegro e Bósnia em 13 dias.
          </p>

          <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-4">
            <div>
              <p className="text-[11px] tracking-wide uppercase text-primary-foreground/60">Faltam</p>
              <p className="font-heading text-5xl sm:text-6xl font-semibold leading-none text-gold">
                {diasRestantes > 0 ? diasRestantes : 0}
              </p>
              <p className="text-xs text-primary-foreground/70 mt-1">dias para o embarque · 24 mar 2027</p>
            </div>
            <div className="flex gap-5 text-sm">
              <div><p className="text-primary-foreground/60 text-[11px] uppercase tracking-wide">Duração</p><p className="font-semibold text-lg">{totalDias} dias</p></div>
              <div><p className="text-primary-foreground/60 text-[11px] uppercase tracking-wide">Viajantes</p><p className="font-semibold text-lg">{viajantes.length || 4}</p></div>
              <div><p className="text-primary-foreground/60 text-[11px] uppercase tracking-wide">Países</p><p className="font-semibold text-lg">{PAISES.length}</p></div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Cards de destaque */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ResumoCard icon={CalendarDays} label="Dias de viagem" valor={`${totalDias}`} sub="24 mar – 5 abr" />
        <ResumoCard icon={MapPin} label="Cidades" valor={`${cidades?.length || 0}`} sub="em 4 países" />
        <ResumoCard icon={Users} label="Viajantes" valor={`${viajantes.length || 0}`} sub="grupo salsadoritano" />
        <ResumoCard icon={Wallet} label="Orçamento previsto" valor={`R$ ${Math.round(totalPrevistoBRL).toLocaleString("pt-BR")}`} sub={`≈ € ${Math.round(totalPrevistoEUR).toLocaleString("pt-BR")} · ${viajantes.length || 4} pessoas`} />
      </section>

      {/* Países + câmbio */}
      <section className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-soft p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-primary">Países do roteiro</h2>
            <Link to="/itinerario" className="text-xs text-accent font-medium flex items-center gap-1 hover:underline">
              Ver itinerário <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PAISES.map((p) => (
              <div key={p.nome} className="rounded-xl border border-border p-3 bg-secondary/40">
                <span className="text-2xl">{p.bandeira}</span>
                <p className="font-medium text-sm mt-1.5 leading-tight">{p.nome}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {(cidades || []).filter((c) => c.pais === p.nome).length} cidade(s)
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-lg font-semibold text-primary">Câmbio EUR → BRL</h2>
            {organizador && <Link to="/admin" className="text-xs text-accent font-medium hover:underline">Atualizar</Link>}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-3xl font-semibold text-primary">R$ {taxa.toFixed(2)}</span>
            <span className="text-sm text-muted-foreground">por € 1</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            {cambio?.data ? formatarData(cambio.data, "longo") : "—"} · {cambio?.fonte || "—"}
          </div>
        </div>
      </section>

      {/* Calendário dos dias */}
      <section className="bg-card rounded-2xl border border-border shadow-soft p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold text-primary">Calendário da viagem</h2>
          <Link to="/itinerario" className="text-xs text-accent font-medium flex items-center gap-1 hover:underline">
            Detalhar dias <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {(dias || []).map((dia, i) => (
            <Link key={dia.id} to={`/itinerario/${dia.data}`}
              className="min-w-[140px] rounded-xl border border-border p-3 hover:border-accent hover:shadow-soft transition-all group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">Dia {i + 1}</span>
                <span className="text-[11px] text-muted-foreground">{formatarData(dia.data, "dia")}</span>
              </div>
              <p className="font-medium text-sm mt-1 leading-tight">{formatarData(dia.data)}</p>
              <p className="text-xs text-foreground/80 mt-1.5 leading-snug line-clamp-2">{dia.titulo}</p>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {dia.cidade}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Reservas por estado + orçamento */}
      <section className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-primary">Reservas por estado</h2>
            <Link to="/reservas" className="text-xs text-accent font-medium flex items-center gap-1 hover:underline">
              Gerenciar <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {reservasPorEstado.map((e) => (
              <div key={e.id} className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: e.cor }} />
                <span className="text-sm flex-1">{e.label}</span>
                <span className="text-sm font-semibold text-primary">{e.total}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><HotelIcon className="w-3.5 h-3.5" /> Hotéis</span>
            <span className="flex items-center gap-1.5"><Plane className="w-3.5 h-3.5" /> Voos</span>
            <span className="flex items-center gap-1.5"><Car className="w-3.5 h-3.5" /> Carro</span>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-primary">Orçamento previsto</h2>
            <Link to="/orcamento" className="text-xs text-accent font-medium flex items-center gap-1 hover:underline">
              Detalhar <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Reservas cotadas</span>
              <span className="font-medium">R$ {Math.round(previstoReservasBRL).toLocaleString("pt-BR")}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Despesas lançadas</span>
              <span className="font-medium">R$ {Math.round(totalDespesasBRL).toLocaleString("pt-BR")}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total por pessoa ({viajantes.length || 4})</span>
            <span className="font-heading text-xl font-semibold text-primary">
              R$ {Math.round(porPessoa).toLocaleString("pt-BR")}
            </span>
          </div>
        </div>
      </section>

      {/* Despesas por categoria */}
      <DespesasCategoria despesas={despesas} taxa={taxa} />

      {/* Próximos passos */}
      <section className="bg-card rounded-2xl border border-border shadow-soft p-5">
        <h2 className="font-heading text-lg font-semibold text-primary mb-4">Próximos passos</h2>
        <div className="space-y-2.5">
          <PassoItem icon={Plane} texto="Confirmar voo Salvador → Roma" estado="pesquisado" />
          <PassoItem icon={HotelIcon} texto="Reservar hotéis (Roma, Split, Dubrovnik)" estado="pesquisado" />
          <PassoItem icon={Car} texto="Contratar carro com autorização de fronteira" estado="planejado" />
          <PassoItem icon={CheckCircle2} texto="Atualizar câmbio EUR/BRL" estado="pago" />
        </div>
      </section>
    </div>
  );
}

function ResumoCard({ icon: Icon, label, valor, sub }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-[11px] uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-heading text-2xl font-semibold text-primary leading-tight">{valor}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

function PassoItem({ icon: Icon, texto, estado }) {
  const mapa = {
    planejado: { icon: Circle, cor: "text-slate-400" },
    pesquisado: { icon: AlertCircle, cor: "text-gold" },
    reservado: { icon: AlertCircle, cor: "text-blue-500" },
    pago: { icon: CheckCircle2, cor: "text-green-600" },
  };
  const S = mapa[estado] || mapa.planejado;
  const SIcon = S.icon;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm flex-1">{texto}</span>
      <SIcon className={`w-4 h-4 ${S.cor}`} />
    </div>
  );
}