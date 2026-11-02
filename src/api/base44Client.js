// Camada de compatibilidade: mesma interface do SDK do Base44 que as telas usam,
// mas falando com o Supabase (banco, login e arquivos) e com as funções em /api.
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

const TABELAS = {
  Dia: ["dias", "data titulo cidade destaque ordem roteiro"],
  Atividade: ["atividades", "dia_data horario nome endereco tempo_visita deslocamento lat lng link link_tipo categoria roteiro"],
  Cidade: ["cidades", "nome pais lat lng foto descricao ordem"],
  Viajante: ["viajantes", "nome papel iniciais cor user_id cidade_inicio cidade_fim"],
  Reserva: ["reservas", "tipo nome cidade estado preco moeda nota data_cotacao fonte link cancelamento detalhes comprovante_uri"],
  Despesa: ["despesas", "descricao categoria valor moeda paga coletiva viajante_nome data comprovante_uri"],
  Cambio: ["cambio", "taxa data fonte tipo atualizado_em"],
  ChecklistItem: ["checklist_itens", "item categoria viajante_nome concluido observacao"],
  DiarioEntrada: ["diario_entradas", "dia_data viajante_nome texto fotos comprovantes local lat lng"],
};

function erro(e, status) {
  const msg = e?.message || String(e);
  const err = new Error(msg);
  err.status = status || (e?.code === "42501" ? 403 : e?.status) || 500;
  err.response = { data: { error: msg } };
  err.data = { error: msg };
  return err;
}

// Só grava colunas conhecidas; texto vazio vira null (datas e números não aceitam "")
function limpar(campos, obj) {
  const saida = {};
  for (const k of campos) {
    if (!(k in (obj || {}))) continue;
    const v = obj[k];
    saida[k] = v === "" || v === undefined ? null : v;
  }
  return saida;
}

function entidade(nome) {
  const [tabela, lista] = TABELAS[nome];
  const campos = lista.split(" ");

  async function rodar(consulta, status) {
    const { data, error } = await consulta;
    if (error) throw erro(error, status);
    return data;
  }

  return {
    async filter(query = {}, { sort, limit = 100 } = {}) {
      let c = supabase.from(tabela).select("*");
      for (const [k, v] of Object.entries(query || {})) {
        if (v && typeof v === "object" && Array.isArray(v.$in)) c = c.in(k, v.$in);
        else c = c.eq(k, v);
      }
      if (sort) {
        const desc = sort.startsWith("-");
        c = c.order(desc ? sort.slice(1) : sort, { ascending: !desc, nullsFirst: false });
      }
      c = c.limit(limit);
      return { items: await rodar(c) };
    },
    async list(sort, limit) {
      return this.filter({}, { sort, limit });
    },
    async get(id) {
      return rodar(supabase.from(tabela).select("*").eq("id", id).single(), 404);
    },
    async create(obj) {
      return rodar(supabase.from(tabela).insert(limpar(campos, obj)).select().single());
    },
    async bulkCreate(lista) {
      if (!lista?.length) return [];
      return rodar(supabase.from(tabela).insert(lista.map((o) => limpar(campos, o))).select());
    },
    async update(id, patch) {
      return rodar(supabase.from(tabela).update(limpar(campos, patch)).eq("id", id).select().single());
    },
    async bulkUpdate(lista) {
      return Promise.all((lista || []).map(({ id, ...patch }) => this.update(id, patch)));
    },
    async delete(id) {
      await rodar(supabase.from(tabela).delete().eq("id", id));
      return { ok: true };
    },
    async deleteMany(query = {}) {
      let c = supabase.from(tabela).delete();
      for (const [k, v] of Object.entries(query)) {
        c = v && typeof v === "object" && Array.isArray(v.$in) ? c.in(k, v.$in) : c.eq(k, v);
      }
      await rodar(c);
      return { ok: true };
    },
  };
}

const PUBLICAS = ["/login", "/register", "/forgot-password", "/reset-password"];

// Uso em família: sem login, quem abre o app tem acesso completo (as regras do banco também).
const FAMILIA = { id: null, email: null, full_name: "Família", role: "admin", papel: "organizador" };

async function perfilAtual() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return FAMILIA;
  const { data: perfil, error } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
  if (error) throw erro(error, 401);
  return {
    id: session.user.id,
    email: session.user.email,
    full_name: perfil.full_name,
    role: perfil.role,
    papel: perfil.papel,
  };
}

const auth = {
  async me() {
    const user = await perfilAtual();
    if (user.role !== "admin" && user.papel === "pendente") {
      const e = erro(new Error("Conta aguardando liberação do organizador."), 403);
      e.type = "user_not_registered";
      throw e;
    }
    return user;
  },
  async isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },
  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw erro(new Error(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : error.message), 401);
    return data;
  },
  async register({ email, password, full_name }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/login", data: full_name ? { full_name } : undefined },
    });
    if (error) throw erro(error, 400);
    return data;
  },
  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
    if (error) throw erro(error, 400);
  },
  async resetPassword({ newPassword }) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw erro(error, 400);
  },
  async logout(redirectUrl) {
    await supabase.auth.signOut();
    if (redirectUrl !== undefined) window.location.href = "/login";
  },
  redirectToLogin(returnTo) {
    if (PUBLICAS.includes(window.location.pathname)) return;
    const destino = returnTo ? new URL(returnTo, window.location.origin) : null;
    const volta = destino && destino.origin === window.location.origin ? destino.pathname + destino.search : "/";
    window.location.href = "/login" + (volta !== "/" ? "?returnTo=" + encodeURIComponent(volta) : "");
  },
  setToken() {},
};

function nomeArquivo(file) {
  const ext = (file?.name || "").split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  return `${crypto.randomUUID()}.${ext}`;
}

async function enviar(bucket, file) {
  const { data: { session } } = await supabase.auth.getSession();
  const caminho = `${session?.user.id || "familia"}/${nomeArquivo(file)}`;
  const { error } = await supabase.storage.from(bucket).upload(caminho, file, { contentType: file.type || undefined });
  if (error) throw erro(error, 400);
  return caminho;
}

const integrations = {
  Core: {
    async UploadPrivateFile({ file }) {
      return { file_uri: `privado/${await enviar("privado", file)}` };
    },
    async UploadPublicFile({ file }) {
      const caminho = await enviar("publico", file);
      return { file_url: supabase.storage.from("publico").getPublicUrl(caminho).data.publicUrl };
    },
    async UploadFile({ file }) {
      return this.UploadPublicFile({ file });
    },
    // não existe no Base44: apaga do armazenamento um arquivo que saiu do app
    async DeleteFile({ file_uri }) {
      const [bucket, ...resto] = String(file_uri || "").split("/");
      if (bucket !== "privado" || !resto.length) return;
      const { error } = await supabase.storage.from(bucket).remove([resto.join("/")]);
      if (error) throw erro(error, 400);
    },
    async CreateFileSignedUrl({ file_uri, expires_in = 3600 }) {
      const [bucket, ...resto] = String(file_uri || "").split("/");
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(resto.join("/"), expires_in);
      if (error) throw erro(error, 404);
      return { signed_url: data.signedUrl };
    },
  },
};

const functions = {
  async invoke(nome, corpo = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const resposta = await fetch(`/api/${nome}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      body: JSON.stringify(corpo),
    });
    const data = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw erro(new Error(data.error || `Erro ${resposta.status}`), resposta.status);
    return { data };
  },
};

export const base44 = {
  entities: Object.fromEntries(Object.keys(TABELAS).map((n) => [n, entidade(n)])),
  auth,
  integrations,
  functions,
  app: { async getPublicSettings() { return { id: "europa-2027", public_settings: {} }; } },
};
