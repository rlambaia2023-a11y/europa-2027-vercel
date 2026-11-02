import { rota, usuarioDaRequisicao, invocarIA, ErroHttp, REGRA_LINK_OFICIAL, CAMPOS_LINK, comLinksOficiais } from "./_lib.js";

export const config = { maxDuration: 60 };

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
  const partes = [
    `Sugira 8 pontos turísticos e atrações imperdíveis${local ? ` para visitar em ${local}` : " para uma road trip pela Itália, Croácia, Montenegro e Bósnia"}, voltados para turistas brasileiros viajando em março e abril de 2027. Para cada atração forneça: nome, uma descrição curta de 1 a 2 frases, o endereço ou localização aproximada, o tempo médio de visita (ex: "2-3h"), por que vale a pena visitar (1 frase) e as coordenadas aproximadas em latitude e longitude decimais. Inclua atrações históricas, culturais, gastronômicas e naturais relevantes. Responda em português do Brasil.`,
    REGRA_LINK_OFICIAL,
  ];
  if (consulta) {
    partes.push(`Busca do viajante: "${consulta}". Priorize exclusivamente sugestões que atendam a esse pedido e pesquise na internet informações reais e atuais desses lugares.`);
  }
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

  const dados = await invocarIA({ prompt: partes.join("\n\n"), schema, fileUrls: fotos, internet: !!consulta });
  const sugestoes = Array.isArray(dados?.sugestoes) ? dados.sugestoes : [];
  return { sugestoes: await comLinksOficiais(sugestoes, local) };
});
