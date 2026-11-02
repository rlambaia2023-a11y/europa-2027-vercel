// Modo offline: um espelho de cada tabela guardado no aparelho e uma fila com as alterações
// feitas sem internet. Quando a conexão volta, a fila é enviada em ordem e o espelho é
// atualizado com o que os outros mudaram.

const ESPELHO = "espelho:";
const FILA = "offline:fila";
const FALHAS = "offline:falhas";
const ULTIMA_SYNC = "offline:ultima-sync";

function ler(chave, padrao) {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? JSON.parse(bruto) : padrao;
  } catch {
    return padrao;
  }
}

function gravar(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // aparelho sem espaço: segue sem guardar
  }
}

// ---------- estado observável (para o aviso na tela) ----------

const ouvintes = new Set();
let sincronizando = false;

export function estadoOffline() {
  return {
    online: navigator.onLine,
    sincronizando,
    pendentes: ler(FILA, []).length,
    falhas: ler(FALHAS, []),
    ultimaSync: ler(ULTIMA_SYNC, null),
  };
}

export function aoMudarEstado(cb) {
  ouvintes.add(cb);
  return () => ouvintes.delete(cb);
}

function avisar() {
  const e = estadoOffline();
  ouvintes.forEach((cb) => cb(e));
}

// ---------- espelho das tabelas ----------

export function lerTabela(tabela) {
  return ler(ESPELHO + tabela, []);
}

function gravarTabela(tabela, linhas) {
  gravar(ESPELHO + tabela, linhas);
}

export function temEspelho(tabela) {
  try {
    return localStorage.getItem(ESPELHO + tabela) !== null;
  } catch {
    return false;
  }
}

function casa(linha, query) {
  return Object.entries(query || {}).every(([k, v]) =>
    v && typeof v === "object" && Array.isArray(v.$in) ? v.$in.includes(linha[k]) : linha[k] === v
  );
}

// mesma semântica do filter() do app: igualdade/$in, ordenação e limite
export function filtrarLocal(tabela, query = {}, { sort, limit = 100 } = {}) {
  let linhas = lerTabela(tabela).filter((l) => casa(l, query));
  if (sort) {
    const desc = sort.startsWith("-");
    const campo = desc ? sort.slice(1) : sort;
    linhas = [...linhas].sort((a, b) => {
      const va = a[campo];
      const vb = b[campo];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const r = va < vb ? -1 : va > vb ? 1 : 0;
      return desc ? -r : r;
    });
  }
  return linhas.slice(0, limit);
}

// junta o que veio do servidor ao espelho; o que sumiu do servidor nessa consulta sai do espelho
export function mesclarResultado(tabela, query, linhasServidor, limiteAtingido) {
  const porId = new Map(lerTabela(tabela).map((l) => [l.id, l]));
  const vieram = new Set(linhasServidor.map((l) => l.id));
  const criadosAqui = new Set(ler(FILA, []).filter((op) => op.tabela === tabela && op.tipo === "create").map((op) => op.id));
  if (!limiteAtingido) {
    for (const [id, linha] of porId) {
      if (casa(linha, query) && !vieram.has(id) && !criadosAqui.has(id)) porId.delete(id);
    }
  }
  linhasServidor.forEach((l) => porId.set(l.id, l));
  gravarTabela(tabela, [...porId.values()]);
  reaplicarFila(tabela);
}

export function substituirTabela(tabela, linhas) {
  gravarTabela(tabela, linhas);
  reaplicarFila(tabela);
}

function aplicarNoEspelho(op) {
  if (!op.tabela) return;
  const linhas = lerTabela(op.tabela);
  if (op.tipo === "create") {
    gravarTabela(op.tabela, [...linhas.filter((l) => l.id !== op.id), { ...op.dados, id: op.id }]);
  } else if (op.tipo === "update") {
    gravarTabela(op.tabela, linhas.map((l) => (l.id === op.id ? { ...l, ...op.dados } : l)));
  } else if (op.tipo === "delete") {
    gravarTabela(op.tabela, linhas.filter((l) => l.id !== op.id));
  }
}

// alterações ainda não enviadas continuam valendo por cima do que veio do servidor
function reaplicarFila(tabela) {
  ler(FILA, []).filter((op) => op.tabela === tabela).forEach(aplicarNoEspelho);
}

export function aplicarLocal(tabela, linhaOuId, tipo) {
  if (tipo === "delete") aplicarNoEspelho({ tabela, tipo, id: linhaOuId });
  else aplicarNoEspelho({ tabela, tipo, id: linhaOuId.id, dados: linhaOuId });
}

// ---------- fila de alterações ----------

export function filaPendente() {
  return ler(FILA, []);
}

export function enfileirar(op) {
  const completa = { ...op, criadoEm: Date.now() };
  gravar(FILA, [...ler(FILA, []), completa]);
  aplicarNoEspelho(completa);
  avisar();
}

export function descartarFalhas() {
  gravar(FALHAS, []);
  avisar();
}

export function ehErroDeRede(e) {
  if (!navigator.onLine) return true;
  const msg = String(e?.message || e || "");
  return e instanceof TypeError || /failed to fetch|networkerror|load failed|fetch failed|network request failed/i.test(msg);
}

// ---------- arquivos guardados no aparelho (fotos e comprovantes tirados sem internet) ----------

function abrirBanco() {
  return new Promise((ok, erro) => {
    const req = indexedDB.open("europa-offline", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("arquivos");
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erro(req.error);
  });
}

async function noBanco(modo, acao) {
  const banco = await abrirBanco();
  return new Promise((ok, erro) => {
    const tx = banco.transaction("arquivos", modo);
    const req = acao(tx.objectStore("arquivos"));
    tx.oncomplete = () => ok(req?.result);
    tx.onerror = () => erro(tx.error);
  });
}

export const guardarArquivo = (chave, blob) => noBanco("readwrite", (s) => s.put(blob, chave));
export const lerArquivo = (chave) => noBanco("readonly", (s) => s.get(chave)).catch(() => undefined);
export const apagarArquivo = (chave) => noBanco("readwrite", (s) => s.delete(chave)).catch(() => {});

// ---------- sincronização ----------

// `executar(op)` envia uma alteração ao servidor; `baixarTudo()` traz todas as tabelas de novo
export async function sincronizar({ executar, baixarTudo }) {
  if (sincronizando || !navigator.onLine) return false;
  sincronizando = true;
  avisar();
  let mudou = false;
  try {
    for (;;) {
      const fila = ler(FILA, []);
      if (!fila.length) break;
      const op = fila[0];
      try {
        await executar(op);
      } catch (e) {
        if (ehErroDeRede(e)) return mudou; // sem rede de novo: tenta mais tarde
        // o servidor recusou: guarda para o usuário ver e segue com o resto
        gravar(FALHAS, [...ler(FALHAS, []), { ...op, erro: String(e?.message || e) }]);
      }
      gravar(FILA, ler(FILA, []).slice(1));
      mudou = true;
      avisar();
    }
    await baixarTudo();
    gravar(ULTIMA_SYNC, Date.now());
    return true;
  } catch (e) {
    if (!ehErroDeRede(e)) console.error("Sincronização", e);
    return mudou;
  } finally {
    sincronizando = false;
    avisar();
  }
}
