import { rota, usuarioDaRequisicao, invocarIA, ErroHttp, REGRA_LINK_OFICIAL, CAMPOS_LINK, comLinksOficiais } from "./_lib.js";

export const config = { maxDuration: 120 };

export default rota(async (req, body) => {
  await usuarioDaRequisicao(req);

  const cidade = String(body.cidade || "").trim();
  const pais = String(body.pais || "").trim();
  const consulta = String(body.consulta || "").trim().slice(0, 300);
  const fotos = (Array.isArray(body.fotos) ? body.fotos : [])
    .filter((u) => typeof u === "string" && /^https:\/\//i.test(u))
    .slice(0, 3);

  if (!cidade && !consulta && !fotos.length) throw new ErroHttp(400, "Informe a cidade, o que procura ou envie fotos da galeria.");

  const local = pais ? `${cidade}, ${pais}` : cidade;
  const ondeQuando = `${local ? `em ${local}` : "numa road trip pela Itália, Croácia, Montenegro e Bósnia"}, para uma família de turistas brasileiros viajando em março e abril de 2027`;
  const campos = `Para cada item forneça: nome, uma descrição curta de 1 a 2 frases, o endereço ou localização aproximada, o tempo médio de visita ou de duração (ex: "2-3h"), por que vale a pena (1 frase) e as coordenadas aproximadas em latitude e longitude decimais. Pesquise na internet informações reais e atuais. Responda em português do Brasil.`;
  const partes = consulta
    ? [`O viajante pediu: "${consulta}". Sugira 8 opções reais que atendam EXATAMENTE a esse pedido ${ondeQuando}. Pode ser atração, passeio, evento, show, restaurante, transporte, aluguel de carro ou hospedagem — siga o que foi pedido, sem trocar por pontos turísticos se o pedido for outro. ${campos}`]
    : [`Sugira 8 pontos turísticos e atrações imperdíveis ${ondeQuando}. Inclua atrações históricas, culturais, gastronômicas e naturais relevantes. ${campos}`];
  partes.push(REGRA_LINK_OFICIAL);
  if (fotos.length) {
    partes.push("Analise as fotos da galeria anexadas (podem ser prints, folhetos, placas, menus ou paisagens). Identifique os lugares reais que aparecem nelas e inclua esses lugares nas sugestões, com o nome real e o motivo pelo qual aparecem nas fotos.");
  }

  const schema = {
    type: "object",
    properties: {
      sugestoes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nome: { type: "string" },
            descricao: { type: "string" },
            endereco: { type: "string" },
            tempo_visita: { type: "string" },
            motivo: { type: "string" },
            lat: { type: "number" },
            lng: { type: "number" },
            ...CAMPOS_LINK,
          },
          required: ["nome", "descricao"],
        },
      },
    },
    required: ["sugestoes"],
  };

  // sempre com busca na internet: os links oficiais saem reais, não inventados
  const dados = await invocarIA({ prompt: partes.join("\n\n"), schema, fileUrls: fotos, internet: true,
    busca: consulta ? `${consulta} ${local}` : `${local} principais atrações pontos turísticos ingressos` });
  const sugestoes = Array.isArray(dados?.sugestoes) ? dados.sugestoes : [];
  return { sugestoes: await comLinksOficiais(sugestoes, local) };
});
