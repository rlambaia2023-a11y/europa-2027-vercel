import { usuarioDaRequisicao } from "./_lib.js";

// Atualiza a cotação EUR→BRL. Chamada pelo agendamento do banco (a cada 12 h, com segredo)
// e pelo próprio app quando a cotação passa de 12 h. Tenta 3 fontes em ordem; se todas
// falharem, mantém a última cotação boa e registra o erro.
export const config = { maxDuration: 60 };

const DOZE_HORAS = 12 * 3600 * 1000;
const INTERVALO_MINIMO_APP = 10 * 60 * 1000; // botão "Atualizar agora": no máximo a cada 10 min
const FAIXA = [3, 15]; // R$ por €: fora disso é dado errado, não cotação

async function json(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

const mmddaaaa = (d) => `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-${d.getFullYear()}`;

const FONTES = [
  {
    nome: "Banco Central do Brasil (PTAX venda)",
    tipo: "ptax",
    async buscar() {
      const hoje = new Date();
      const inicio = new Date(hoje.getTime() - 7 * 86400000);
      const url = "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)"
        + `?@moeda='EUR'&@dataInicial='${mmddaaaa(inicio)}'&@dataFinalCotacao='${mmddaaaa(hoje)}'&$format=json&$select=cotacaoVenda,dataHoraCotacao,tipoBoletim`;
      const lista = (await json(url)).value || [];
      if (!lista.length) throw new Error("sem cotações na última semana");
      // o boletim de fechamento é o oficial do dia; antes dele, vale o mais recente
      const ultimo = lista[lista.length - 1];
      const fechamento = [...lista].reverse().find((x) => x.tipoBoletim === "Fechamento" && x.dataHoraCotacao.slice(0, 10) === ultimo.dataHoraCotacao.slice(0, 10));
      const escolhido = fechamento || ultimo;
      return { taxa: escolhido.cotacaoVenda, data: escolhido.dataHoraCotacao.slice(0, 10) };
    },
  },
  {
    nome: "AwesomeAPI (comercial)",
    tipo: "comercial",
    async buscar() {
      const d = (await json("https://economia.awesomeapi.com.br/json/last/EUR-BRL")).EURBRL;
      return { taxa: Number(d.ask), data: String(d.create_date).slice(0, 10) };
    },
  },
  {
    nome: "Banco Central Europeu (Frankfurter)",
    tipo: "bce",
    async buscar() {
      const d = await json("https://api.frankfurter.dev/v1/latest?base=EUR&symbols=BRL");
      return { taxa: Number(d.rates?.BRL), data: d.date };
    },
  },
];

async function cotacaoAtual() {
  const erros = [];
  for (const fonte of FONTES) {
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      try {
        const { taxa, data } = await fonte.buscar();
        if (!(taxa >= FAIXA[0] && taxa <= FAIXA[1])) throw new Error(`valor fora da faixa: ${taxa}`);
        return { taxa: Math.round(taxa * 10000) / 10000, data, fonte: fonte.nome, tipo: fonte.tipo };
      } catch (e) {
        erros.push(`${fonte.nome} (tentativa ${tentativa}): ${e?.message || e}`);
      }
    }
  }
  const erro = new Error("Nenhuma fonte de câmbio respondeu.");
  erro.detalhes = erros;
  throw erro;
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) return res.status(405).json({ error: "Use GET ou POST." });
  const segredo = process.env.CRON_SECRET;
  const agendado = !!segredo && req.headers["x-cron-secret"] === segredo;
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const origem = agendado ? "agendado" : body.agora ? "manual" : "app";

  try {
    const { db } = await usuarioDaRequisicao(req);
    const { data: ultima } = await db.from("cambio").select("*").order("created_date", { ascending: false }).limit(1).maybeSingle();
    const idade = ultima?.atualizado_em ? Date.now() - new Date(ultima.atualizado_em).getTime() : Infinity;

    // sem o segredo do agendamento, não deixa ninguém disparar buscas sem parar
    const minimo = agendado ? 0 : origem === "manual" ? INTERVALO_MINIMO_APP : DOZE_HORAS;
    if (idade < minimo) return res.status(200).json({ atualizado: false, motivo: "recente", cambio: ultima });

    let cotacao;
    try {
      cotacao = await cotacaoAtual();
    } catch (e) {
      const erro = [e.message, ...(e.detalhes || [])].join(" | ").slice(0, 1000);
      console.error("Câmbio", erro);
      await db.from("cambio_execucoes").insert({ ok: false, origem, erro });
      return res.status(503).json({ atualizado: false, error: "Não foi possível atualizar o câmbio agora; mantida a última cotação.", cambio: ultima });
    }

    const { data: nova, error } = await db.from("cambio")
      .insert({ taxa: cotacao.taxa, data: cotacao.data, fonte: cotacao.fonte, tipo: cotacao.tipo, atualizado_em: new Date().toISOString() })
      .select().single();
    if (error) throw error;
    await db.from("cambio_execucoes").insert({ ok: true, origem, fonte: cotacao.fonte, taxa: cotacao.taxa });
    return res.status(200).json({ atualizado: true, cambio: nova });
  } catch (e) {
    console.error("Câmbio", e?.message || e);
    return res.status(500).json({ error: e?.message || "Erro ao atualizar o câmbio" });
  }
}
