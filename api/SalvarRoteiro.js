import { rota, usuarioDaRequisicao, ErroHttp } from "./_lib.js";

export const config = { maxDuration: 60 };

const CATEGORIAS = ["atração", "refeição", "transporte", "hospedagem", "estacionamento", "outro"];
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const txt = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

async function ok(consulta) {
  const { data, error } = await consulta;
  if (error) throw new ErroHttp(error.code === "42501" ? 403 : 500, error.message);
  return data;
}

export default rota(async (req, body) => {
  // roda com as permissões de quem chamou: o banco só deixa editor/organizador gravar
  const { db } = await usuarioDaRequisicao(req, { editor: true });

  const entrada = Array.isArray(body?.dias) ? body.dias.slice(0, 60) : [];
  const roteiro = body?.roteiro === "principal" ? "principal" : "alternativo";

  const dias = [];
  for (const d of entrada) {
    const data = txt(d?.data, 10);
    if (!DATA_RE.test(data) || dias.some((x) => x.data === data)) continue;
    const atividades = (Array.isArray(d?.atividades) ? d.atividades : [])
      .slice(0, 60)
      .map((a) => ({
        horario: txt(a?.horario, 20),
        nome: txt(a?.nome, 200),
        endereco: txt(a?.endereco, 300),
        tempo_visita: txt(a?.tempo_visita, 60),
        categoria: CATEGORIAS.includes(a?.categoria) ? a.categoria : "atração",
      }))
      .filter((a) => a.nome);
    dias.push({
      data,
      titulo: txt(d?.titulo, 200) || txt(d?.cidade, 120) || `Dia ${data}`,
      cidade: txt(d?.cidade, 120) || "A definir",
      pais: txt(d?.pais, 120),
      destaque: txt(d?.destaque, 600),
      atividades,
    });
  }
  if (!dias.length) throw new ErroHttp(400, "Nenhum dia válido para salvar.");

  const [diasExistentesTodos, cidadesExistentes] = await Promise.all([
    ok(db.from("dias").select("*").order("data").limit(500)),
    ok(db.from("cidades").select("*").order("ordem").limit(200)),
  ]);
  const diasExistentes = diasExistentesTodos.filter((d) => (d.roteiro || "principal") === roteiro);
  const mapaDias = new Map(diasExistentes.map((d) => [d.data, d]));
  const cidadesVistas = new Set(cidadesExistentes.map((c) => norm(c.nome)));
  let maxOrdemDia = diasExistentes.reduce((m, d) => Math.max(m, d.ordem || 0), 0);
  let maxOrdemCidade = cidadesExistentes.reduce((m, c) => Math.max(m, c.ordem || 0), 0);

  const novasCidades = [];
  const novosDias = [];
  const atualizacoes = [];
  for (const d of dias) {
    const chave = norm(d.cidade);
    if (chave && chave !== "a definir" && !cidadesVistas.has(chave)) {
      cidadesVistas.add(chave);
      novasCidades.push({ nome: d.cidade, pais: d.pais || "A definir", ordem: ++maxOrdemCidade });
    }
    const payload = { data: d.data, titulo: d.titulo, cidade: d.cidade, destaque: d.destaque || null, roteiro };
    const existente = mapaDias.get(d.data);
    if (existente) atualizacoes.push({ id: existente.id, ...payload });
    else novosDias.push({ ...payload, ordem: ++maxOrdemDia });
  }

  if (novasCidades.length) await ok(db.from("cidades").insert(novasCidades));
  if (novosDias.length) await ok(db.from("dias").insert(novosDias));
  for (const item of atualizacoes) {
    await ok(db.from("dias").update({ titulo: item.titulo, cidade: item.cidade, destaque: item.destaque }).eq("id", item.id));
  }

  const atividades = dias.flatMap((d) =>
    d.atividades.map((a) => ({
      ...Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v === "" ? null : v])),
      dia_data: d.data,
      roteiro,
    }))
  );
  const datas = [...new Set(atividades.map((a) => a.dia_data))];
  if (datas.length) await ok(db.from("atividades").delete().in("dia_data", datas).eq("roteiro", roteiro));
  if (atividades.length) await ok(db.from("atividades").insert(atividades));

  return { criados: novosDias.length, atualizados: atualizacoes.length, atividades: atividades.length, roteiro };
});
