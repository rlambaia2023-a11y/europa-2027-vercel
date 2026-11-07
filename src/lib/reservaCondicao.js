// Confere a data e o local de cada reserva com o roteiro da viagem.
// Regra: toda reserva precisa ter data e local; e a cidade da reserva tem que bater
// com a cidade prevista no roteiro para aquele(s) dia(s).

export const TIPOS_RESERVA = [
  { id: "hotel", label: "Hospedagem", curto: "Hospedagem" },
  { id: "voo", label: "Voo", curto: "Voos" },
  { id: "transporte", label: "Transporte (trem, ônibus, barco, transfer)", curto: "Transporte" },
  { id: "carro", label: "Carro", curto: "Carro" },
  { id: "passeio", label: "Passeio / ingresso", curto: "Passeios" },
];

const RAIO_KM = 60; // distância máxima entre a reserva e a cidade do roteiro

const normalizar = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

function distanciaKm(a, b) {
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function somarDias(dataStr, n) {
  const d = new Date(dataStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const fmt = (d) => {
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const x = new Date(d + "T12:00:00");
  return `${x.getDate()} ${meses[x.getMonth()]}`;
};

export function periodoTexto(r) {
  if (!r?.data_inicio) return "";
  const ini = fmt(r.data_inicio);
  if (!r.data_fim || r.data_fim === r.data_inicio) return ini + (r.horario ? ` · ${r.horario}` : "");
  return `${ini} → ${fmt(r.data_fim)}` + (r.horario ? ` · ${r.horario}` : "");
}

// Dias da viagem que a reserva ocupa. Hospedagem: as noites (check-out não conta).
export function diasDaReserva(r) {
  if (!r?.data_inicio) return [];
  const fim = r.data_fim && r.data_fim >= r.data_inicio ? r.data_fim : r.data_inicio;
  const ultimo = r.tipo === "hotel" && fim > r.data_inicio ? somarDias(fim, -1) : fim;
  const lista = [];
  for (let d = r.data_inicio; d <= ultimo && lista.length < 60; d = somarDias(d, 1)) lista.push(d);
  return lista;
}

// Partes do local ("Roma → Split" vira ["roma", "split"])
const partesLocal = (r) =>
  [r.cidade, r.endereco]
    .flatMap((s) => String(s || "").split(/→|->|–|—|\/|,|\bpara\b|\bate\b|\baté\b/i))
    .map(normalizar)
    .filter((s) => s.length > 1);

function bateCidade(r, nomeCidade, cidades) {
  const alvo = normalizar(nomeCidade);
  if (!alvo) return false;
  const partes = partesLocal(r);
  if (partes.some((p) => p.includes(alvo) || alvo.includes(p))) return true;
  const c = (cidades || []).find((x) => normalizar(x.nome) === alvo);
  if (c?.lat != null && r.lat != null && r.lng != null) {
    return distanciaKm({ lat: Number(r.lat), lng: Number(r.lng) }, { lat: Number(c.lat), lng: Number(c.lng) }) <= RAIO_KM;
  }
  return false;
}

/**
 * Devolve { nivel: "ok" | "aviso" | "falta", texto, dias: [{data, cidade, ordem}] }
 * dias = dias do roteiro principal (com data e cidade), cidades = lista com lat/lng.
 */
export function conferirReserva(r, { dias = [], cidades = [], reservas = [] } = {}) {
  const semData = !r?.data_inicio;
  const semLocal = !String(r?.cidade || "").trim() && !String(r?.endereco || "").trim();
  if (semData || semLocal) {
    const falta = [semData && "data", semLocal && "local"].filter(Boolean).join(" e ");
    return { nivel: "falta", texto: `Falta ${falta}: complete para conferir com o roteiro.`, dias: [] };
  }

  const ordenados = [...(dias || [])].filter((d) => d.data).sort((a, b) => a.data.localeCompare(b.data));
  const porData = new Map(ordenados.map((d, i) => [d.data, { ...d, ordem: i + 1 }]));
  const ocupa = diasDaReserva(r);
  const doRoteiro = ocupa.map((d) => porData.get(d)).filter(Boolean);

  if (ordenados.length && !doRoteiro.length) {
    return {
      nivel: "aviso",
      texto: `Fora das datas da viagem (${fmt(ordenados[0].data)} a ${fmt(ordenados[ordenados.length - 1].data)}).`,
      dias: [],
    };
  }

  // Voo e transporte ligam duas cidades: vale a do dia ou a do dia anterior
  const ehTrecho = r.tipo === "voo" || r.tipo === "transporte";
  const divergentes = doRoteiro.filter((d) => {
    if (bateCidade(r, d.cidade, cidades)) return false;
    if (ehTrecho) {
      const anterior = porData.get(somarDias(d.data, -1));
      if (anterior && bateCidade(r, anterior.cidade, cidades)) return false;
    }
    return true;
  });

  // Duas hospedagens na mesma noite
  if (r.tipo === "hotel") {
    const noites = new Set(ocupa);
    const choque = (reservas || []).find(
      (o) => o.id !== r.id && o.tipo === "hotel" && o.estado !== "cancelado" && diasDaReserva(o).some((d) => noites.has(d))
    );
    if (choque) {
      return { nivel: "aviso", texto: `Choca com outra hospedagem nas mesmas noites: ${choque.nome}.`, dias: doRoteiro };
    }
  }

  if (divergentes.length) {
    const d = divergentes[0];
    const extra = divergentes.length > 1 ? ` (e mais ${divergentes.length - 1} dia${divergentes.length > 2 ? "s" : ""})` : "";
    return { nivel: "aviso", texto: `No dia ${d.ordem} (${fmt(d.data)}) o roteiro prevê ${d.cidade}${extra}.`, dias: doRoteiro };
  }

  if (!doRoteiro.length) return { nivel: "ok", texto: "Data e local informados.", dias: [] };
  const primeiro = doRoteiro[0];
  const ultimo = doRoteiro[doRoteiro.length - 1];
  const faixa = primeiro.ordem === ultimo.ordem ? `dia ${primeiro.ordem}` : `dias ${primeiro.ordem} a ${ultimo.ordem}`;
  const cidadesRoteiro = [...new Set(doRoteiro.map((d) => d.cidade))].join(" / ");
  return { nivel: "ok", texto: `Bate com o roteiro: ${faixa}, ${cidadesRoteiro}.`, dias: doRoteiro };
}

// Reservas que caem num dia do roteiro (para mostrar na página do dia)
export function reservasDoDia(reservas, data) {
  return (reservas || []).filter((r) => {
    if (r.estado === "cancelado") return false;
    if (r.tipo === "hotel") return r.data_inicio && r.data_inicio <= data && (r.data_fim || r.data_inicio) >= data;
    return diasDaReserva(r).includes(data);
  });
}
