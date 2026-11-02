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

// Equivalente ao InvokeLLM do Base44: prompt + arquivos + schema → objeto JSON.
// Com `internet`, usa a busca do Google (que não aceita schema; pedimos o JSON no texto).
export async function invocarIA({ prompt, schema, fileUrls = [], internet = false }) {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave) throw new ErroHttp(503, "A IA ainda não foi configurada (falta GEMINI_API_KEY no Vercel).");
  const modelo = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const partes = [{ text: internet
    ? `${prompt}\n\nResponda APENAS com um objeto JSON válido, sem texto antes ou depois, seguindo este JSON Schema:\n${JSON.stringify(schema)}`
    : prompt }];
  for (const url of fileUrls.slice(0, 4)) partes.push(await arquivoComoParte(url));

  const corpo = { contents: [{ role: "user", parts: partes }] };
  if (internet) corpo.tools = [{ google_search: {} }];
  else corpo.generationConfig = { responseMimeType: "application/json", responseSchema: paraSchemaGemini(schema) };

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
    body: JSON.stringify(corpo),
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("Gemini", r.status, JSON.stringify(dados).slice(0, 500));
    throw new ErroHttp(502, "A IA não respondeu agora. Tente de novo em instantes.");
  }
  const texto = (dados.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  return extrairJson(texto);
}
