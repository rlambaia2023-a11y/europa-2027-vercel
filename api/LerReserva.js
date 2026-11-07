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

const SCHEMA = {
  type: "object",
  properties: {
    tipo: { type: "string", enum: TIPOS, description: "hotel (qualquer hospedagem), voo, transporte (trem, ônibus, barco, ferry, transfer), carro (locação) ou passeio (tour, ingresso, experiência)" },
    nome: { type: "string", description: "Nome da hospedagem, voo (ex: SSA → FCO), empresa ou passeio" },
    cidade: { type: "string", description: "Cidade do local. Para voo/transporte, o trecho 'Origem → Destino'" },
    endereco: { type: "string", description: "Endereço ou ponto de encontro, se aparecer" },
    lat: { type: "number", description: "Latitude aproximada da cidade/local (só se tiver certeza do lugar)" },
    lng: { type: "number", description: "Longitude aproximada da cidade/local (só se tiver certeza do lugar)" },
    data_inicio: { type: "string", description: "YYYY-MM-DD: check-in, partida, retirada ou dia do passeio" },
    data_fim: { type: "string", description: "YYYY-MM-DD: check-out, chegada, devolução. Vazio se for no mesmo dia" },
    horario: { type: "string", description: "Horário principal (ex: 'check-in 15:00', 'partida 08:40')" },
    preco: { type: "number", description: "Preço total" },
    moeda: { type: "string", description: "EUR ou BRL" },
    fonte: { type: "string", description: "Airbnb, Booking, ITA Airways, GetYourGuide…" },
    codigo: { type: "string", description: "Código/localizador da reserva" },
    cancelamento: { type: "string" },
    detalhes: { type: "string", description: "Hóspedes, bagagem, escalas e outras informações úteis" },
    estado: { type: "string", enum: ["pesquisado", "reservado", "pago"] },
  },
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
- Em "detalhes", coloque em poucas linhas o que for útil (hóspedes, bagagem, escalas, código).`;
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
    const dados = await invocarIA({ prompt, schema: SCHEMA, fileUrls: [fileUrl] });
    return { dados: arrumar(dados, { tipo: dicaTipo }) };
  }

  const pagina = await lerPagina(link);
  const prompt = `${promptBase(contexto)}

A reserva veio por um LINK. Abaixo está o que a página mostra publicamente (muitas vezes, como nos convites de viagem do Airbnb, a página só mostra o nome do lugar; nesse caso deixe as datas vazias para a família completar).
${dicaTipo ? `Tipo sugerido por quem anexou: ${dicaTipo}.` : ""}

${JSON.stringify(pagina, null, 1)}`;
  const dados = await invocarIA({ prompt, schema: SCHEMA });
  return {
    dados: arrumar(dados, { tipo: dicaTipo, link, fonte: fonteDoSite(pagina.site) }),
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

function arrumar(d, { tipo, link, fonte } = {}) {
  const x = d && typeof d === "object" ? d : {};
  const codigo = String(x.codigo || "").trim();
  const detalhes = [x.detalhes, codigo && !String(x.detalhes || "").includes(codigo) ? `Código: ${codigo}` : ""]
    .filter(Boolean).join("\n");
  return {
    tipo: TIPOS.includes(x.tipo) ? x.tipo : tipo || "hotel",
    nome: String(x.nome || "").trim(),
    cidade: String(x.cidade || "").trim(),
    endereco: String(x.endereco || "").trim(),
    lat: Number.isFinite(x.lat) ? x.lat : null,
    lng: Number.isFinite(x.lng) ? x.lng : null,
    data_inicio: dataValida(x.data_inicio),
    data_fim: dataValida(x.data_fim),
    horario: String(x.horario || "").trim(),
    preco: Number.isFinite(x.preco) ? x.preco : null,
    moeda: x.moeda === "BRL" ? "BRL" : "EUR",
    fonte: String(x.fonte || fonte || "").trim(),
    cancelamento: String(x.cancelamento || "").trim(),
    detalhes,
    estado: ["pesquisado", "reservado", "pago"].includes(x.estado) ? x.estado : "reservado",
    link: link || "",
  };
}
