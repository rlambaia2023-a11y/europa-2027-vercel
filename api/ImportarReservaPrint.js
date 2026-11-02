import { rota, usuarioDaRequisicao, invocarIA, ErroHttp } from "./_lib.js";

export const config = { maxDuration: 60 };

export default rota(async (req, body) => {
  await usuarioDaRequisicao(req, { editor: true });
  const fileUrl = String(body.file_url || "").trim();
  const tipo = String(body.tipo || "hotel").trim();
  if (!/^https:\/\//i.test(fileUrl)) throw new ErroHttp(400, "Imagem obrigatória");

  const tipoDesc = tipo === "voo" ? "voo/aéreo" : tipo === "carro" ? "locação de carro" : "hospedagem (Airbnb, Booking, hotel)";

  const prompt = `Analise a imagem enviada, que é um print/screenshot de uma reserva de ${tipoDesc}. Extraia os dados visíveis da reserva e retorne em português do Brasil. Se um campo não for visível, use null. Para "estado", classifique como: "reservado" se houver confirmação/código de reserva, "pesquisado" se for apenas uma cotação, "pago" se houver indicação de pagamento confirmado. Para "moeda", use "EUR" ou "BRL". Para "data_cotacao", use o formato YYYY-MM-DD se houver data visível. Em "detalhes", inclua datas de check-in/check-out, número de hóspedes, endereço e quaisquer informações extras úteis.`;

  const schema = {
    type: "object",
    properties: {
      nome: { type: "string", description: "Nome do hotel, voo ou locadora" },
      cidade: { type: "string", description: "Cidade ou trecho" },
      preco: { type: "number", description: "Preço total" },
      moeda: { type: "string", description: "EUR ou BRL" },
      data_cotacao: { type: "string", description: "YYYY-MM-DD" },
      fonte: { type: "string", description: "Ex: Airbnb, Booking, Decolar" },
      link: { type: "string" },
      cancelamento: { type: "string", description: "Política de cancelamento" },
      detalhes: { type: "string", description: "Datas, hóspedes, escalas, etc." },
      estado: { type: "string", description: "reservado, pesquisado ou pago" },
    },
  };

  const dados = await invocarIA({ prompt, schema, fileUrls: [fileUrl] });
  return { dados };
});
