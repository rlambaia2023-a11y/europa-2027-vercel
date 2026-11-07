// Lê UMA reserva já feita, a partir de um link (Airbnb, Booking, companhia aérea, passeio…)
// ou de um arquivo (print ou PDF de confirmação), e devolve os dados com data e local.
import { rota, usuarioDaRequisicao, invocarIA, ErroHttp } from "./_lib.js";

export const config = { maxDuration: 60 };

const TIPOS = ["hotel", "voo", "transporte", "carro", "passeio"];

// Bloqueia endereços internos (o servidor não pode ser usado para abrir a rede privada)
function linkPermitido(u) {
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
  if (/^(\d+\.){3}\d+$/.test(h) || h.includes(":")) return false; // IP direto
  return true;
}

const meta = (html, nome) => {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${nome}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0] || "";
  return (tag.match(/content=["']([^"']*)["']/i)?.[1] || "").trim();
};

const decodificar = (s) =>
  String(s || "")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");

// Abre o link e junta o que a página mostra publicamente (título, descrição, datas na URL, JSON-LD)
async function lerPagina(link) {
  let u;
  try { u = new URL(link); } catch { throw new ErroHttp(400, "Link inválido."); }
  if (!linkPermitido(u)) throw new ErroHttp(400, "Link não permitido.");

  let html = "";
  let urlFinal = u.toString();
  try {
    const r = await fetch(u, {
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,*/*",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });
    urlFinal = r.url || urlFinal;
    if (!linkPermitido(new URL(urlFinal))) throw new Error("redirecionamento bloqueado");
    html = (await r.text()).slice(0, 600000);
  } catch (e) {
    console.error("LerReserva fetch", e?.message);
  }

  const final = new URL(urlFinal);
  const params = {};
  for (const k of ["check_in", "checkin", "check_out", "checkout", "checkIn", "checkOut", "date", "dates", "adults", "guests", "from", "to", "departure", "return"]) {
    const v = final.searchParams.get(k);
    if (v) params[k] = v;
  }

  const jsonLd = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1].trim()).join("\n").slice(0, 6000);
  const corpo = decodificar(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
  ).slice(0, 5000);

  return {
    link_original: link,
    url_final: urlFinal,
    site: final.hostname.replace(/^www\./, ""),
    titulo: decodificar(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim(),
    og_titulo: decodificar(meta(html, "og:title")),
    og_descricao: decodificar(meta(html, "og:description") || meta(html, "description")),
    og_imagem: meta(html, "og:image"),
    parametros_url: params,
    json_ld: jsonLd,
    texto_pagina: corpo,
    abriu: !!html,
  };
}

// Uma reserva. Um PDF pode trazer várias (voo de ida e volta, hotel + carro…)
const ITEM = {
  type: "object",
  properties: {
    tipo: { type: "string", enum: TIPOS, description: "hotel (qualquer hospedagem: hotel, Airbnb, apartamento, pousada, casa alugada), voo, transporte (trem, ônibus, barco, ferry, transfer), carro (aluguel/locação de carro) ou passeio (tour, ingresso, parque nacional ou de diversão, museu, experiência)" },
    nome: { type: "string", description: "Hotel/acomodação; voo como 'Roma (FCO) → Split (SPU)'; locadora do carro; nome do passeio" },
    cidade: { type: "string", description: "Cidade do local. Voo/transporte: 'Origem → Destino'. Carro: cidade da retirada" },
    endereco: { type: "string", description: "Endereço da hospedagem, balcão de retirada do carro, aeroporto ou ponto de encontro" },
    lat: { type: "number", description: "Latitude aproximada da cidade (só se tiver certeza)" },
    lng: { type: "number", description: "Longitude aproximada da cidade (só se tiver certeza)" },
    data_inicio: { type: "string", description: "YYYY-MM-DD: check-in, partida, retirada ou dia do passeio" },
    data_fim: { type: "string", description: "YYYY-MM-DD: check-out, chegada (se outro dia), devolução" },
    hora_inicio: { type: "string", description: "HH:MM: check-in, partida, retirada ou início" },
    hora_fim: { type: "string", description: "HH:MM: check-out, chegada, devolução ou fim" },
    local_fim: { type: "string", description: "Carro: local de devolução. Voo/transporte: aeroporto/estação de chegada" },
    codigo: { type: "string", description: "Código da reserva / localizador / número de confirmação" },
    numero_voo: { type: "string", description: "Voo: número (ex: AZ 1234). Trem/ônibus: número da viagem" },
    companhia: { type: "string", description: "Companhia aérea, empresa de trem/ônibus/barco ou locadora" },
    pessoas: { type: "string", description: "Hóspedes ou passageiros (nomes ou quantidade)" },
    bagagem: { type: "string", description: "Voo: bagagem incluída" },
    categoria: { type: "string", description: "Carro: categoria/modelo. Hotel: tipo de quarto. Voo: classe tarifária" },
    seguro: { type: "string", description: "Carro: seguros/coberturas e franquia" },
    preco: { type: "number", description: "Preço total" },
    moeda: { type: "string", description: "EUR ou BRL" },
    pago: { type: "string", description: "Quanto já foi pago e quanto falta, se aparecer" },
    fonte: { type: "string", description: "Airbnb, Booking, ITA Airways, Localiza, Rentalcars…" },
    cancelamento: { type: "string", description: "Política de cancelamento, curta" },
    observacoes: { type: "string", description: "Outras informações úteis (até 3 linhas)" },
    estado: { type: "string", enum: ["pesquisado", "reservado", "pago"] },
  },
};
const SCHEMA = {
  type: "object",
  properties: { reservas: { type: "array", items: ITEM, description: "Uma entrada por reserva/trecho encontrado" } },
};

function promptBase(contexto) {
  return `Você vai ler uma reserva JÁ FEITA para uma viagem em família à Europa em 2027 e devolver os dados em português do Brasil.

ROTEIRO DA VIAGEM (data → cidade), para você entender o contexto e o ano:
${contexto}

Regras:
- Leia com atenção a DATA e o LOCAL. Datas sempre no formato YYYY-MM-DD.
- Se a reserva mostrar dia e mês sem ano, use o ano da viagem (2027).
- NUNCA invente data, preço ou endereço. Se não aparecer, deixe vazio. Não copie a data do roteiro para preencher lacunas.
- "cidade": a cidade onde fica a hospedagem/passeio (ex: "Slunj"). Para voo ou transporte: "Origem → Destino".
- "lat"/"lng": coordenadas aproximadas da cidade, só se souber com segurança qual é o lugar.
- "estado": "pago" se houver pagamento confirmado, "reservado" se houver confirmação/código, senão "pesquisado".
- Se houver mais de uma reserva no mesmo arquivo (voo de ida e de volta, conexões, hotel + carro), devolva uma entrada para cada uma em "reservas". Voo com conexão: uma entrada por trecho.
- Horários sempre HH:MM (24 h), no horário local mostrado na reserva.`;
}

export default rota(async (req, body) => {
  await usuarioDaRequisicao(req, { editor: true });
  const link = String(body.link || "").trim();
  const fileUrl = String(body.file_url || "").trim();
  const dicaTipo = TIPOS.includes(body.tipo) ? body.tipo : "";
  const roteiro = Array.isArray(body.roteiro) ? body.roteiro.slice(0, 40) : [];
  const contexto = roteiro.map((d) => `${String(d.data).slice(0, 10)} → ${String(d.cidade || "").slice(0, 60)}`).join("\n") || "(roteiro não informado)";

  if (!link && !fileUrl) throw new ErroHttp(400, "Envie um link ou um arquivo.");

  if (fileUrl) {
    if (!/^https:\/\//i.test(fileUrl)) throw new ErroHttp(400, "Arquivo inválido.");
    const prompt = `${promptBase(contexto)}

O arquivo enviado é um print, e-mail ou PDF de confirmação de reserva${dicaTipo ? ` (provavelmente do tipo "${dicaTipo}")` : ""}. Extraia os dados visíveis.`;
    const res = await invocarIA({ prompt, schema: SCHEMA, fileUrls: [fileUrl] });
    const itens = lista(res).map((d) => arrumar(d, { tipo: dicaTipo }));
    return { itens, dados: itens[0] };
  }

  const pagina = await lerPagina(link);
  const prompt = `${promptBase(contexto)}

A reserva veio por um LINK. Abaixo está o que a página mostra publicamente (muitas vezes, como nos convites de viagem do Airbnb, a página só mostra o nome do lugar; nesse caso deixe as datas vazias para a família completar).
${dicaTipo ? `Tipo sugerido por quem anexou: ${dicaTipo}.` : ""}

${JSON.stringify(pagina, null, 1)}`;
  const res = await invocarIA({ prompt, schema: SCHEMA });
  const itens = lista(res).map((d) => arrumar(d, { tipo: dicaTipo, link, fonte: fonteDoSite(pagina.site) }));
  return {
    itens,
    dados: itens[0],
    pagina: { abriu: pagina.abriu, titulo: pagina.og_titulo || pagina.titulo, imagem: pagina.og_imagem },
  };
});

function fonteDoSite(site) {
  if (/airbnb/.test(site)) return "Airbnb";
  if (/booking/.test(site)) return "Booking";
  if (/getyourguide/.test(site)) return "GetYourGuide";
  if (/viator/.test(site)) return "Viator";
  return site || "";
}

const dataValida = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(String(s || "")) ? s : "");

// aceita {reservas:[…]} ou um objeto solto; sempre devolve pelo menos um item
function lista(res) {
  const l = Array.isArray(res?.reservas) ? res.reservas.filter((x) => x && typeof x === "object") : res && typeof res === "object" && !res.reservas ? [res] : [];
  return l.length ? l.slice(0, 12) : [{}];
}

const hora = (s) => (/^\d{1,2}:\d{2}$/.test(String(s || "").trim()) ? String(s).trim().padStart(5, "0") : "");
const br = (d) => (d ? d.slice(8, 10) + "/" + d.slice(5, 7) : "");
const t = (s) => String(s || "").trim();

// Texto organizado por tipo, para ler rápido no cartão
function formatarDetalhes(x, ini, fim, hIni, hFim) {
  const linhas = [];
  const add = (rotulo, valor) => t(valor) && linhas.push(`${rotulo}: ${t(valor)}`);
  if (x.tipo === "voo" || x.tipo === "transporte") {
    add(x.tipo === "voo" ? "Voo" : "Viagem", [t(x.numero_voo), t(x.companhia)].filter(Boolean).join(" · "));
    add("Partida", [br(ini), hIni, t(x.endereco)].filter(Boolean).join(" · "));
    add("Chegada", [br(fim || ini), hFim, t(x.local_fim)].filter(Boolean).join(" · "));
    add(x.tipo === "voo" ? "Localizador" : "Código", x.codigo);
    add("Passageiros", x.pessoas);
    add("Bagagem", x.bagagem);
    add("Classe", x.categoria);
  } else if (x.tipo === "carro") {
    add("Locadora", x.companhia);
    add("Retirada", [br(ini), hIni, t(x.endereco)].filter(Boolean).join(" · "));
    add("Devolução", [br(fim), hFim, t(x.local_fim)].filter(Boolean).join(" · "));
    add("Categoria", x.categoria);
    add("Seguro", x.seguro);
    add("Código", x.codigo);
    add("Motorista", x.pessoas);
  } else if (x.tipo === "hotel") {
    add("Check-in", [br(ini), hIni].filter(Boolean).join(" · "));
    add("Check-out", [br(fim), hFim].filter(Boolean).join(" · "));
    add("Endereço", x.endereco);
    add("Quarto", x.categoria);
    add("Hóspedes", x.pessoas);
    add("Código", x.codigo);
  } else {
    add("Quando", [br(ini), hIni, hFim && `até ${hFim}`].filter(Boolean).join(" · "));
    add("Encontro", x.endereco);
    add("Pessoas", x.pessoas);
    add("Código", x.codigo);
  }
  add("Pagamento", x.pago);
  if (t(x.observacoes)) linhas.push(t(x.observacoes));
  return linhas.join("\n");
}

function horarioCurto(tipo, hIni, hFim) {
  if (!hIni && !hFim) return "";
  if (tipo === "hotel") return [hIni && `check-in ${hIni}`, hFim && `check-out ${hFim}`].filter(Boolean).join(" · ");
  if (tipo === "carro") return [hIni && `retirada ${hIni}`, hFim && `devolução ${hFim}`].filter(Boolean).join(" · ");
  if (tipo === "voo" || tipo === "transporte") return [hIni && `sai ${hIni}`, hFim && `chega ${hFim}`].filter(Boolean).join(" · ");
  return [hIni, hFim].filter(Boolean).join("–");
}

function arrumar(d, { tipo, link, fonte } = {}) {
  const x = { ...(d && typeof d === "object" ? d : {}) };
  x.tipo = TIPOS.includes(x.tipo) ? x.tipo : tipo || "hotel";
  const ini = dataValida(x.data_inicio);
  let fim = dataValida(x.data_fim);
  if (fim && ini && fim < ini) fim = "";
  const hIni = hora(x.hora_inicio);
  const hFim = hora(x.hora_fim);
  return {
    tipo: x.tipo,
    nome: t(x.nome) || t(x.companhia) || t(x.numero_voo),
    cidade: t(x.cidade),
    endereco: t(x.endereco),
    lat: Number.isFinite(x.lat) ? x.lat : null,
    lng: Number.isFinite(x.lng) ? x.lng : null,
    data_inicio: ini,
    data_fim: fim && fim !== ini ? fim : "",
    horario: horarioCurto(x.tipo, hIni, hFim),
    preco: Number.isFinite(x.preco) ? x.preco : null,
    moeda: x.moeda === "BRL" ? "BRL" : "EUR",
    fonte: t(x.fonte || x.companhia || fonte),
    cancelamento: t(x.cancelamento),
    detalhes: formatarDetalhes(x, ini, fim, hIni, hFim),
    estado: ["pesquisado", "reservado", "pago"].includes(x.estado) ? x.estado : "reservado",
    link: link || "",
  };
}
