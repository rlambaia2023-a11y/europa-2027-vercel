import { rota, usuarioDaRequisicao, invocarIA, ErroHttp } from "./_lib.js";

export const config = { maxDuration: 60 };

const CATEGORIAS = ["atração", "refeição", "transporte", "hospedagem", "estacionamento", "outro"];

export default rota(async (req, body) => {
  await usuarioDaRequisicao(req, { editor: true });

  const texto = typeof body.texto === "string" ? body.texto.trim() : "";
  const busca = typeof body.busca === "string" ? body.busca.trim().slice(0, 400) : "";
  const fileUrl = typeof body.file_url === "string" ? body.file_url.trim() : "";
  const fileUrls = (Array.isArray(body.file_urls) ? body.file_urls : [])
    .filter((u) => typeof u === "string" && /^https:\/\//i.test(u))
    .slice(0, 4);
  if (/^https:\/\//i.test(fileUrl) && !fileUrls.includes(fileUrl)) fileUrls.push(fileUrl);

  if (!texto && !busca && !fileUrls.length) throw new ErroHttp(400, "Envie um texto, um arquivo ou um pedido de busca.");
  if (texto.length > 60000) throw new ErroHttp(400, "Texto muito longo. Envie até 60.000 caracteres.");

  const instrucoes = `Converta o roteiro de viagem em dados estruturados. Responda em português do Brasil.

Contexto: viagem em família pela Itália, Croácia, Montenegro e Bósnia, de 24/03/2027 a 05/04/2027.

Regras:
1. Identifique cada DIA do roteiro. Se houver datas explícitas, converta para o formato ISO YYYY-MM-DD (assuma 2027 quando o ano não for informado).
2. Se não houver datas, numere os dias em sequência começando em 2027-03-24 (segundo dia 2027-03-25, e assim por diante).
3. Para cada dia informe: titulo (curto e descritivo), cidade principal, pais e um destaque com 1 a 2 frases resumindo o dia.
4. Extraia as atividades na ordem em que aparecem, com horario (HH:MM quando existir, senão "manhã", "tarde" ou "noite"), nome, endereco, tempo_visita e categoria, que deve ser exatamente uma destas: "atração", "refeição", "transporte", "hospedagem", "estacionamento", "outro".
5. Não invente dias ou atividades que não estejam no conteúdo.
6. Ignore links de imagens e textos de marketing, mas aproveite nomes de lugares citados nas legendas das imagens como atividades.`;

  const partes = [instrucoes];
  if (busca) {
    partes.push(`PESQUISA NA INTERNET: pesquise na web informações reais e atuais (atrações que existem, bairros, horários de funcionamento, tempo médio de visita e deslocamentos entre pontos) e monte o roteiro dia a dia pedido abaixo, com atividades em ordem cronológica e nomes de lugares reais. Use quantos dias o pedido indicar.

PEDIDO: """
${busca}
"""`);
  }
  if (fileUrls.length) {
    partes.push("O roteiro está nos arquivos anexados — podem ser prints, fotos da galeria ou páginas de um roteiro. Leia o conteúdo das imagens/documentos e extraia os dias e as atividades.");
  }
  if (texto) partes.push(`ROTEIRO:\n"""\n${texto}\n"""`);

  const schema = {
    type: "object",
    properties: {
      dias: {
        type: "array",
        items: {
          type: "object",
          properties: {
            data: { type: "string" },
            titulo: { type: "string" },
            cidade: { type: "string" },
            pais: { type: "string" },
            destaque: { type: "string" },
            atividades: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  horario: { type: "string" },
                  nome: { type: "string" },
                  endereco: { type: "string" },
                  tempo_visita: { type: "string" },
                  categoria: { type: "string", enum: CATEGORIAS },
                },
                required: ["nome"],
              },
            },
          },
          required: ["data", "titulo", "cidade", "atividades"],
        },
      },
    },
    required: ["dias"],
  };

  const dados = await invocarIA({ prompt: partes.join("\n\n"), schema, fileUrls, internet: !!busca });
  return { dias: Array.isArray(dados?.dias) ? dados.dias : [] };
});
