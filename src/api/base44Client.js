// Camada de compatibilidade: mesma interface do SDK do Base44 que as telas usam,
// mas falando com o Supabase (banco, login e arquivos) e com as funções em /api.
import { createClient } from "@supabase/supabase-js";
import {
  filtrarLocal, mesclarResultado, substituirTabela, aplicarLocal, enfileirar, filaPendente, ehErroDeRede,
  lerTabela, temEspelho, guardarArquivo, lerArquivo, apagarArquivo, sincronizar,
} from "@/lib/offline";

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

// Sem internet (ou com alterações ainda na fila), escreve no aparelho e enfileira;
// com internet, vai direto ao servidor. Leituras sempre respondem pelo espelho local,
// atualizado com o servidor quando há conexão.
const deveEnfileirar = () => !navigator.onLine || filaPendente().length > 0;

function entidade(nome) {
  const [tabela, lista] = TABELAS[nome];
  const campos = lista.split(" ");

  async function rodar(consulta, status) {
    const { data, error } = await consulta;
    if (error) throw erro(error, status);
    return data;
  }

  // tenta o servidor; se a rede falhar, faz a versão offline
  async function comRede(online, offline) {
    if (deveEnfileirar()) return offline();
    try {
      return await online();
    } catch (e) {
      if (ehErroDeRede(e)) return offline();
      throw e;
    }
  }

  const agora = () => new Date().toISOString();

  return {
    async filter(query = {}, { sort, limit = 100 } = {}) {
      if (navigator.onLine) {
        try {
          let c = supabase.from(tabela).select("*");
          for (const [k, v] of Object.entries(query || {})) {
            if (v && typeof v === "object" && Array.isArray(v.$in)) c = c.in(k, v.$in);
            else c = c.eq(k, v);
          }
          if (sort) {
            const desc = sort.startsWith("-");
            c = c.order(desc ? sort.slice(1) : sort, { ascending: !desc, nullsFirst: false });
          }
          const linhas = await rodar(c.limit(limit));
          mesclarResultado(tabela, query, linhas, linhas.length >= limit);
        } catch (e) {
          if (!ehErroDeRede(e) || !temEspelho(tabela)) throw e;
        }
      }
      return { items: filtrarLocal(tabela, query, { sort, limit }) };
    },
    async list(sort, limit) {
      return this.filter({}, { sort, limit });
    },
    async get(id) {
      const local = () => {
        const l = lerTabela(tabela).find((x) => x.id === id);
        if (!l) throw erro(new Error("Registro não encontrado."), 404);
        return l;
      };
      if (!navigator.onLine) return local();
      try {
        return await rodar(supabase.from(tabela).select("*").eq("id", id).single(), 404);
      } catch (e) {
        if (ehErroDeRede(e)) return local();
        throw e;
      }
    },
    async create(obj) {
      const dados = limpar(campos, obj);
      const id = crypto.randomUUID();
      return comRede(
        async () => {
          const linha = await rodar(supabase.from(tabela).insert({ ...dados, id }).select().single());
          aplicarLocal(tabela, linha, "create");
          return linha;
        },
        () => {
          const linha = { ...dados, id, created_date: agora(), updated_date: agora() };
          enfileirar({ tabela, tipo: "create", id, dados: linha });
          return linha;
        }
      );
    },
    async bulkCreate(lista) {
      const criados = [];
      for (const o of lista || []) criados.push(await this.create(o));
      return criados;
    },
    async update(id, patch) {
      const dados = limpar(campos, patch);
      return comRede(
        async () => {
          const linha = await rodar(supabase.from(tabela).update(dados).eq("id", id).select().single());
          aplicarLocal(tabela, linha, "update");
          return linha;
        },
        () => {
          enfileirar({ tabela, tipo: "update", id, dados: { ...dados, updated_date: agora() } });
          return { ...(lerTabela(tabela).find((l) => l.id === id) || {}), id };
        }
      );
    },
    async bulkUpdate(lista) {
      const feitos = [];
      for (const { id, ...patch } of lista || []) feitos.push(await this.update(id, patch));
      return feitos;
    },
    async delete(id) {
      return comRede(
        async () => {
          await rodar(supabase.from(tabela).delete().eq("id", id));
          aplicarLocal(tabela, id, "delete");
          return { ok: true };
        },
        () => {
          enfileirar({ tabela, tipo: "delete", id });
          return { ok: true };
        }
      );
    },
    async deleteMany(query = {}) {
      const ids = filtrarLocal(tabela, query, { limit: 5000 }).map((l) => l.id);
      for (const id of ids) await this.delete(id);
      return { ok: true };
    },
  };
}

// ---------- sincronização com o servidor ----------

const NOMES_TABELAS = Object.values(TABELAS).map(([t]) => t);

function camposDe(tabela) {
  return Object.values(TABELAS).find(([t]) => t === tabela)[1].split(" ");
}

// traz todas as tabelas de novo (o espelho passa a refletir o que os outros mudaram)
export async function baixarTudo() {
  const resultados = await Promise.all(
    NOMES_TABELAS.map(async (t) => {
      const { data, error } = await supabase.from(t).select("*").limit(5000);
      if (error) throw erro(error);
      return [t, data];
    })
  );
  resultados.forEach(([t, linhas]) => substituirTabela(t, linhas));
}

// envia uma alteração da fila ao servidor (repetir não duplica nada)
async function executarOp(op) {
  if (op.tipo === "upload") {
    const blob = await lerArquivo(op.chave);
    if (blob) {
      const { error } = await supabase.storage.from(op.bucket).upload(op.caminho, blob, { contentType: blob.type || undefined, upsert: true });
      if (error) throw erro(error);
      await apagarArquivo(op.chave);
    }
    return;
  }
  const q = supabase.from(op.tabela);
  const { error } = op.tipo === "create"
    ? await q.upsert({ ...limpar(camposDe(op.tabela), op.dados), id: op.id })
    : op.tipo === "update"
      ? await q.update(limpar(camposDe(op.tabela), op.dados)).eq("id", op.id)
      : await q.delete().eq("id", op.id);
  if (error) throw erro(error);
}

export const sincronizarAgora = () => sincronizar({ executar: executarOp, baixarTudo });

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
  // sem internet: o arquivo fica no aparelho e o envio entra na fila
  const guardarParaDepois = async () => {
    const chave = `${bucket}/${caminho}`;
    await guardarArquivo(chave, file);
    enfileirar({ tipo: "upload", bucket, caminho, chave });
  };
  if (!navigator.onLine) {
    await guardarParaDepois();
    return caminho;
  }
  const { error } = await supabase.storage.from(bucket).upload(caminho, file, { contentType: file.type || undefined });
  if (error) {
    if (ehErroDeRede(error)) await guardarParaDepois();
    else throw erro(error, 400);
  }
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
      // arquivo tirado sem internet e ainda não enviado: mostra direto do aparelho
      const local = await lerArquivo(file_uri);
      if (local) return { signed_url: URL.createObjectURL(local) };
      const chave = "assinada:" + file_uri;
      const [bucket, ...resto] = String(file_uri || "").split("/");
      try {
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(resto.join("/"), expires_in);
        if (error) throw erro(error, 404);
        try { localStorage.setItem(chave, data.signedUrl); } catch { /* sem espaço */ }
        return { signed_url: data.signedUrl };
      } catch (e) {
        // sem internet: o último endereço serve, porque a imagem fica guardada pelo service worker
        let anterior = null;
        try { anterior = localStorage.getItem(chave); } catch { /* sem acesso */ }
        if (anterior && ehErroDeRede(e)) return { signed_url: anterior };
        throw e;
      }
    },
  },
};

const functions = {
  async invoke(nome, corpo = {}) {
    if (!navigator.onLine) {
      throw erro(new Error("Sem internet: a IA, as importações e o câmbio voltam a funcionar quando a conexão voltar."), 0);
    }
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
