// Utilitários das funções do Vercel (arquivos com "_" não viram rota).
import { createClient } from "@supabase/supabase-js";

const URL_SUPABASE = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const CHAVE_SUPABASE = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export class ErroHttp extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Cliente do Supabase agindo como quem chamou: as regras (RLS) do banco valem aqui também.
// Sem login (uso em família), age como visitante, que o banco trata como organizador.
export async function usuarioDaRequisicao(req, { editor = false } = {}) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) {
    const db = createClient(URL_SUPABASE, CHAVE_SUPABASE, { auth: { persistSession: false, autoRefreshToken: false } });
    return { db, user: null, papel: "organizador" };
  }
  const db = createClient(URL_SUPABASE, CHAVE_SUPABASE, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) throw new ErroHttp(401, "Faça login para continuar.");
  const { data: perfil } = await db.from("profiles").select("role, papel").eq("id", user.id).single();
  const papel = perfil?.role === "admin" ? "organizador" : perfil?.papel || "pendente";
  if (papel === "pendente") throw new ErroHttp(403, "Sua conta ainda não foi liberada pelo organizador.");
  if (editor && papel === "leitor") {
    throw new ErroHttp(403, "Leitores não podem alterar o roteiro, reservas ou despesas. Peça ao organizador.");
  }
  return { db, user, papel };
}

export function rota(handler) {
  return async (req, res) => {
    if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const resultado = await handler(req, body);
      return res.status(200).json(resultado);
    } catch (e) {
      const status = e instanceof ErroHttp ? e.status : 500;
      if (status === 500) console.error(e);
      return res.status(status).json({ error: e?.message || "Erro interno" });
    }
  };
}

// JSON Schema → formato de schema do Gemini (tipos em maiúsculas, só campos aceitos)
function paraSchemaGemini(s) {
  if (!s || typeof s !== "object") return s;
  const saida = {};
  if (s.type) saida.type = String(s.type).toUpperCase();
  if (s.description) saida.description = s.description;
  if (s.enum) saida.enum = s.enum;
  if (s.properties) {
    saida.properties = Object.fromEntries(Object.entries(s.properties).map(([k, v]) => [k, paraSchemaGemini(v)]));
  }
  if (s.items) saida.items = paraSchemaGemini(s.items);
  if (s.required) saida.required = s.required;
  return saida;
}

async function arquivoComoParte(url) {
  const r = await fetch(url);
  if (!r.ok) throw new ErroHttp(400, "Não consegui abrir o arquivo enviado.");
  const tipo = (r.headers.get("content-type") || "image/jpeg").split(";")[0];
  const bytes = Buffer.from(await r.arrayBuffer());
  if (bytes.length > 15 * 1024 * 1024) throw new ErroHttp(400, "Arquivo grande demais (máx. 15 MB).");
  return { inline_data: { mime_type: tipo, data: bytes.toString("base64") } };
}

// Instrução comum: toda sugestão traz o link oficial de compra/reserva
export const REGRA_LINK_OFICIAL = `Para cada lugar, passeio, evento ou serviço, preencha "link_oficial" com a URL da página OFICIAL onde se compra o ingresso ou se faz a reserva: site do próprio museu/atração, bilheteria oficial do evento, operadora oficial do passeio, companhia de transporte ou locadora de carros. Prefira sempre o site oficial a revendedores (GetYourGuide, Viator, Civitatis, Tiqets); use revendedor só se não existir venda oficial. Cuidado com sites que imitam o oficial (como tickets-rome.com ou domínios com "tickets", "ingressos" ou "biglietti" junto do nome da cidade): eles NÃO são oficiais. Blogs, guias de viagem e agregadores também não. Para lugares gratuitos sem reserva, use o site oficial de informações. Em "ingresso", diga em poucas palavras como e quanto se paga (ex: "€18 · reserva antecipada obrigatória", "Gratuito"). Nunca invente URL: se não tiver certeza do endereço, deixe "link_oficial" vazio.`;

export const CAMPOS_LINK = {
  link_oficial: { type: "string", description: "URL oficial de compra de ingresso ou reserva" },
  ingresso: { type: "string", description: "Como e quanto se paga, em poucas palavras" },
};

export function linkBusca(nome, local) {
  const q = [nome, local, "site oficial ingressos reserva"].filter(Boolean).join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

// A página abre? Sites que barram robôs (401/403/405/429) contam como existentes.
async function linkAbre(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || /(^|\.)google\.[a-z.]+$/i.test(u.hostname)) return false;
    const r = await fetch(u, {
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Europa2027/1.0)", Accept: "text/html,*/*" },
    });
    r.body?.cancel().catch(() => {});
    return r.status < 400 || [401, 403, 405, 429].includes(r.status);
  } catch {
    return false;
  }
}

// A página indicada abre? Se não, vale a página inicial do mesmo site oficial.
async function linkConferido(url) {
  if (!url) return "";
  if (await linkAbre(url)) return url;
  try {
    const raiz = new URL(url).origin + "/";
    if (raiz !== url && (await linkAbre(raiz))) return raiz;
  } catch { /* URL inválida */ }
  return "";
}

// Confere os links oficiais (em lotes) e garante sempre um caminho para comprar.
export async function comLinksOficiais(itens, local) {
  const saida = [];
  for (let i = 0; i < itens.length; i += 8) {
    const lote = itens.slice(i, i + 8);
    const conferidos = await Promise.all(lote.map(async (it) => {
      const link = await linkConferido(String(it?.link_oficial || "").trim());
      if (link && !ehRevendedor(link)) return { link, tipo: "oficial" };
      // sem link ou só revendedor: tenta achar o site oficial de verdade no Brave
      const oficial = await linkPeloBrave(it?.nome, it?.cidade || local);
      if (oficial) return { link: oficial, tipo: "oficial" };
      return link ? { link, tipo: "revendedor" } : { link: "", tipo: "busca" };
    }));
    lote.forEach((it, j) => {
      saida.push({
        ...it,
        link_oficial: conferidos[j].link,
        link_tipo: conferidos[j].tipo,
        link_busca: linkBusca(it?.nome, it?.cidade || local),
      });
    });
  }
  return saida;
}

function extrairJson(texto) {
  const limpo = String(texto || "").replace(/```(?:json)?/gi, "").trim();
  try { return JSON.parse(limpo); } catch { /* tenta o maior bloco {…} */ }
  const inicio = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  if (inicio >= 0 && fim > inicio) {
    try { return JSON.parse(limpo.slice(inicio, fim + 1)); } catch { /* cai no erro abaixo */ }
  }
  throw new ErroHttp(502, "A IA respondeu num formato inesperado. Tente de novo.");
}

// Busca na web pelo Brave (rápida). Sem chave ou com erro, devolve null e quem chamou segue sem ela.
export async function buscarBrave(q, count = 10) {
  const chave = process.env.BRAVE_API_KEY;
  if (!chave || !q) return null;
  try {
    const u = new URL("https://api.search.brave.com/res/v1/web/search");
    u.searchParams.set("q", q);
    u.searchParams.set("count", String(count));
    u.searchParams.set("extra_snippets", "true");
    const r = await fetch(u, {
      headers: { Accept: "application/json", "X-Subscription-Token": chave },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) {
      console.error("Brave", r.status);
      return null;
    }
    const d = await r.json();
    return (d.web?.results || []).map((x) => ({
      titulo: x.title,
      url: x.url,
      texto: [x.description, ...(x.extra_snippets || [])].filter(Boolean).join(" ").replace(/<[^>]+>/g, ""),
    }));
  } catch (e) {
    console.error("Brave", e?.message);
    return null;
  }
}

// Revendedores e páginas que não vendem nada: só servem se não houver nada melhor.
const NAO_OFICIAIS = /(google|wikipedia|wikivoyage|tripadvisor|youtube|facebook|instagram|tiktok|reddit|pinterest|getyourguide|viator|kayak|skyscanner|momondo|rentalcars|autoeurope|discovercars|economybookings|hellotickets|civitatis|tiqets|klook|musement|headout|expedia|booking|trip\.com|lonelyplanet)\./i;

// Blogs de viagem conhecidos (não vendem nada)
const BLOGS = /(queroviajarmais|viajenaviagem|melhoresdestinos|quantocustaviajar|egpviagens|blog)/i;
// Imitadores conhecidos das atrações desta viagem (os oficiais são outros domínios)
const IMITADORES_CONHECIDOS = /(galleriaborgheseroma|colosseumrometickets|colosseo-roma|vaticanmuseumstickets|tickets-split|dubrovnik-walls)\./i;
// Domínio principal com "tickets"/"ingressos"/"biglietti": site que imita o oficial e revende
const IMITADOR = /(tickets?|ingressos?|biglietti|entradas|tours?-)/i;

function dominioPrincipal(host) {
  const partes = host.split(".");
  const segundoNivel = ["com", "co", "org", "gov", "net"].includes(partes[partes.length - 2]);
  return partes.slice(segundoNivel ? -3 : -2).join(".");
}

export function ehRevendedor(url) {
  try {
    const host = new URL(url).hostname;
    return NAO_OFICIAIS.test(host) || BLOGS.test(host) || IMITADORES_CONHECIDOS.test(host) || IMITADOR.test(dominioPrincipal(host));
  } catch {
    return true;
  }
}

// "site oficial ingressos" no idioma do país (os sites oficiais costumam estar na língua local)
function termoLocal(local) {
  const l = String(local || "").toLowerCase();
  if (/it[aá]lia|roma|veneza|floren|mil[aã]o/.test(l)) return "sito ufficiale biglietti";
  if (/montenegro|kotor|perast|budva/.test(l)) return "zvanični sajt ulaznice";
  if (/cro[aá]cia|bósnia|bosnia|split|dubrovnik|zagreb|plitvice|mostar|hvar/.test(l)) return "službena stranica ulaznice";
  return "";
}

// Procura no Brave o site oficial: inglês, depois idioma local, depois português. Pula revendedores.
async function linkPeloBrave(nome, local) {
  const consultas = [
    `${nome} ${local || ""} official website tickets`,
    termoLocal(local) && `${nome} ${termoLocal(local)}`,
    `${nome} ${local || ""} site oficial ingressos`,
  ].filter(Boolean);
  for (const q of consultas) {
    const res = await buscarBrave(q.trim(), 8);
    const oficial = (res || []).find((x) => x.url?.startsWith("https://") && !ehRevendedor(x.url));
    if (oficial) return oficial.url;
  }
  return "";
}

// Equivalente ao InvokeLLM do Base44: prompt + arquivos + schema → objeto JSON.
// Com `internet`: se houver Brave e `busca`, os resultados dele entram no prompt e a IA responde
// direto em JSON (bem mais rápido); senão, usa a busca do Google do próprio Gemini.
export async function invocarIA({ prompt, schema, fileUrls = [], internet = false, busca = "" }) {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave) throw new ErroHttp(503, "A IA ainda não foi configurada (falta GEMINI_API_KEY no Vercel).");
  const modelo = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  let comBrave = false;
  if (internet && busca) {
    const resultados = await buscarBrave(busca, 15);
    if (resultados?.length) {
      comBrave = true;
      const fontes = resultados.map((x, i) => `[${i + 1}] ${x.titulo}\n${x.url}\n${x.texto}`).join("\n\n");
      prompt = `${prompt}\n\nRESULTADOS DE BUSCA NA INTERNET (atuais, use como fonte principal; os endereços listados são reais e podem ser usados em link_oficial):\n${fontes}`;
      internet = false;
    }
  }

  const partes = [{ text: internet
    ? `${prompt}\n\nResponda APENAS com um objeto JSON válido, sem texto antes ou depois, seguindo este JSON Schema:\n${JSON.stringify(schema)}`
    : prompt }];
  for (const url of fileUrls.slice(0, 4)) partes.push(await arquivoComoParte(url));

  const corpo = { contents: [{ role: "user", parts: partes }] };
  if (internet) corpo.tools = [{ google_search: {} }];
  else corpo.generationConfig = { responseMimeType: "application/json", responseSchema: paraSchemaGemini(schema) };
  // com as fontes já na mão, a IA só organiza: dispensa o "raciocínio" longo e responde mais rápido
  if (comBrave) corpo.generationConfig.thinkingConfig = { thinkingBudget: 0 };

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
    body: JSON.stringify(corpo),
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("Gemini", r.status, JSON.stringify(dados).slice(0, 500));
    if (r.status === 429) {
      throw new ErroHttp(429, "A cota de uso da IA (Gemini) acabou por enquanto. Tente mais tarde — no plano gratuito ela renova a cada dia.");
    }
    throw new ErroHttp(502, "A IA não respondeu agora. Tente de novo em instantes.");
  }
  const texto = (dados.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  return extrairJson(texto);
}
