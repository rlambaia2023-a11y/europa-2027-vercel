import { rota, usuarioDaRequisicao, ErroHttp } from "./_lib.js";

// As regras ficam no banco (listar_contas / definir_papel conferem se é organizador).
export default rota(async (req, body) => {
  const { db, papel } = await usuarioDaRequisicao(req);
  if (papel !== "organizador") throw new ErroHttp(403, "Só o organizador altera permissões.");

  if (body.acao === "listar") {
    const { data, error } = await db.rpc("listar_contas");
    if (error) throw new ErroHttp(400, error.message);
    return { contas: data || [] };
  }

  if (typeof body.viajante_id !== "string" || !body.viajante_id) throw new ErroHttp(400, "Viajante obrigatório.");
  const mudarConta = typeof body.user_id === "string";
  const { data, error } = await db.rpc("definir_papel", {
    p_viajante: body.viajante_id,
    p_papel: body.papel || null,
    p_user: mudarConta && body.user_id ? body.user_id : null,
    p_mudar_conta: mudarConta,
  });
  if (error) throw new ErroHttp(400, error.message);
  return data;
});
