const PREFIXO = "offline:";

export function gravarCache(chave, dados) {
  try {
    localStorage.setItem(PREFIXO + chave, JSON.stringify({ at: Date.now(), dados }));
  } catch {
    // sem espaço no aparelho — segue sem cache
  }
}

export function lerCache(chave) {
  try {
    const bruto = localStorage.getItem(PREFIXO + chave);
    if (!bruto) return null;
    const { dados } = JSON.parse(bruto);
    return dados ?? null;
  } catch {
    return null;
  }
}

export function ultimaSincronizacao() {
  try {
    let ultima = 0;
    for (let i = 0; i < localStorage.length; i += 1) {
      const chave = localStorage.key(i);
      if (!chave || !chave.startsWith(PREFIXO)) continue;
      const { at } = JSON.parse(localStorage.getItem(chave)) || {};
      if (at && at > ultima) ultima = at;
    }
    return ultima || null;
  } catch {
    return null;
  }
}

// Tenta a rede; se falhar (sem conexão), usa o último conteúdo salvo no aparelho.
export async function comCache(chave, buscar) {
  try {
    const dados = await buscar();
    gravarCache(chave, dados);
    return dados;
  } catch (erro) {
    const salvo = lerCache(chave);
    if (salvo !== null) return salvo;
    throw erro;
  }
}