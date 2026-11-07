import { rota, usuarioDaRequisicao, invocarIA, ErroHttp } from "./_lib.js";

export const config = { maxDuration: 60 };

export default rota(async (req, body) => {
  await usuarioDaRequisicao(req, { editor: true });
  const fileUrl = String(body.file_url || "").trim();
  if (!/^https:\/\//i.test(fileUrl)) throw new ErroHttp(400, "Arquivo obrigatório");

  const prompt = `Analise o arquivo enviado (foto, print ou PDF) de um comprovante ou recibo de despesa de viagem (nota fiscal, cupom, conta de restaurante, recibo de compra, extrato, etc.). Extraia os dados visíveis e retorne em português do Brasil. Se um campo não for visível, use null. Para "moeda", use "EUR" ou "BRL" conforme o símbolo visível (€ ou R$). Para "data", use o formato YYYY-MM-DD. Para "categoria", classifique entre: "voos", "hoteis", "carro", "alimentacao", "atracoes" ou "extras" com base no tipo de despesa. Para "valor", use apenas o número (ponto como separador decimal).`;

  const schema = {
    type: "object",
    properties: {
      descricao: { type: "string", description: "Descrição curta da despesa (ex: Jantar em Roma, Ingresso Coliseu)" },
      valor: { type: "number", description: "Valor total numérico" },
      moeda: { type: "string", description: "EUR ou BRL" },
      data: { type: "string", description: "YYYY-MM-DD ou null" },
      categoria: { type: "string", description: "voos, hoteis, carro, alimentacao, atracoes ou extras" },
      paga: { type: "boolean", description: "true se o comprovante indica pagamento realizado" },
    },
  };

  const dados = await invocarIA({ prompt, schema, fileUrls: [fileUrl] });
  return { dados };
});
