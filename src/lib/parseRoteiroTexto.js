const MESES = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };

const normalizar = (s) =>
  String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const REGRAS_CATEGORIA = [
  { re: /almo[çc]o|jantar|caf[eé]|restaurante|pizzaria|pizza|lanche|bar\b|gelato|sorvete|degusta[çc][ãa]o|mercado gastron/i, cat: "refeição" },
  { re: /voo|aeroporto|trem\b|esta[çc][ãa]o|ônibus|onibus|traslado|transfer|t[áa]xi|metr[ôo]|barco|balsa|ferry|retirada do carro|aluguel do carro/i, cat: "transporte" },
  { re: /check-?in|hotel|pousada|hospedagem|airbnb|apartamento/i, cat: "hospedagem" },
  { re: /estacionamento|parking|garagem/i, cat: "estacionamento" },
];

function inferirCategoria(nome) {
  for (const r of REGRAS_CATEGORIA) if (r.re.test(nome)) return r.cat;
  return "atração";
}

const limpar = (s) =>
  String(s || "")
    .replace(/\*\*/g, "")
    .replace(/[`_>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function iso(dia, mes, ano) {
  const a = ano ? (String(ano).length <= 2 ? 2000 + Number(ano) : Number(ano)) : 2027;
  return `${a}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function extrairData(texto) {
  const linha = limpar(texto);
  const m = linha.match(/(\d{1,2})\s*[\/.]\s*(\d{1,2})(?:\s*[\/.]\s*(\d{2,4}))?/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) return iso(d, mo, m[3]);
  }
  const m2 = linha.match(/(\d{1,2})\s+de\s+([a-zA-ZçÇ]{3,})/);
  if (m2) {
    const mo = MESES[normalizar(m2[2]).slice(0, 3)];
    if (mo) return iso(Number(m2[1]), mo);
  }
  return null;
}

const ehCabecalho = (linha) => {
  const l = limpar(linha);
  if (!l || l.length > 160) return false;
  return (
    /^(dia|day)\s*\d{1,2}\b/i.test(l) ||
    /^\d{1,2}\s*[\/.]\s*\d{1,2}/.test(l) ||
    /^\d{1,2}\s+de\s+[a-zA-ZçÇ]{3,}/.test(l) ||
    /^(data|date)\s*[:\-]/i.test(l)
  );
};

export function parseRoteiroTexto(texto, cidadesConhecidas = []) {
  const linhas = String(texto || "").replace(/\r/g, "").split("\n");
  const blocos = [];
  let atual = null;
  linhas.forEach((linha) => {
    if (ehCabecalho(linha)) {
      atual = { cabecalho: limpar(linha), linhas: [] };
      blocos.push(atual);
    } else if (atual) {
      atual.linhas.push(linha);
    }
  });

  const conhecidas = cidadesConhecidas.filter(Boolean).map((nome) => ({ nome, norm: normalizar(nome) }));

  const dias = blocos.map((bloco, index) => {
    let data = extrairData(bloco.cabecalho);
    if (!data) {
      const comData = bloco.linhas.slice(0, 6).find((l) => extrairData(l));
      if (comData) data = extrairData(comData);
    }
    if (!data) data = `2027-03-${String(24 + index).padStart(2, "0")}`;

    const blocoTexto = normalizar([bloco.cabecalho, ...bloco.linhas].join(" "));
    const cidadeConhecida = conhecidas.find((c) => blocoTexto.includes(c.norm));
    const cidadeLinha = bloco.linhas.map(limpar).find((l) => /^cidade\s*[:\-]/i.test(l));
    const cidadeRotulo = cidadeLinha ? cidadeLinha.replace(/^cidade\s*[:\-]\s*/i, "").trim() : "";

    const semRotulo = bloco.cabecalho
      .replace(/^(dia|day)\s*\d{1,2}\s*[-–—:.)]*\s*/i, "")
      .replace(/(\d{1,2})\s*[\/.]\s*(\d{1,2})(?:\s*[\/.]\s*(\d{2,4}))?/g, "")
      .replace(/\d{1,2}\s+de\s+[a-zA-ZçÇ]{3,}/g, "")
      .replace(/^[-–—:.,|\s]+/, "")
      .trim();
    const partes = semRotulo.split(/[–—|]/).map((p) => p.trim()).filter(Boolean);

    const cidade = cidadeConhecida?.nome || cidadeRotulo || (partes.length > 1 ? partes[partes.length - 1] : "") || "A definir";
    let titulo = partes.length > 1 ? partes[0] : partes[0] || "";
    if (!titulo || normalizar(titulo) === normalizar(cidade)) titulo = `Dia em ${cidade}`;

    const atividades = [];
    const vistos = new Set();
    bloco.linhas.forEach((linha) => {
      const t = limpar(linha).replace(/^[-•*]\s*/, "");
      if (!t || t.length > 220) return;
      if (/^(cidade|pais|data|date|destaque|resumo|titulo)\s*[:\-]/i.test(t)) return;
      if (/^[-–—_=]{3,}$/.test(t)) return;
      if (normalizar(t) === normalizar(cidade)) return;

      const comHora = t.match(/^(\d{1,2})(?::|h)\s*(\d{0,2})\s*(?:[-–—]\s*)?(.+)$/);
      const horario = comHora
        ? `${String(comHora[1]).padStart(2, "0")}:${(comHora[2] || "00").padStart(2, "0")}`
        : "";
      const nome = (comHora ? comHora[3] : t).replace(/^[-–—:.\s]+/, "").replace(/\.$/, "").trim();
      if (nome.length < 3) return;
      const chave = normalizar(nome);
      if (vistos.has(chave)) return;
      vistos.add(chave);
      atividades.push({ horario: horario === "0:00" ? "" : horario, nome, categoria: inferirCategoria(nome) });
    });

    return {
      data,
      titulo,
      cidade,
      pais: "",
      destaque: "",
      atividades,
    };
  });

  return dias.filter((d) => d.atividades.length > 0 || d.titulo !== "A definir");
}