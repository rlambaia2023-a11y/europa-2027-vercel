import { useAuth } from "@/lib/AuthContext";

// Papel do usuário logado. O admin do app Base44 é sempre organizador;
// quem ainda não recebeu papel entra como leitor.
// As mesmas regras valem no servidor (rls nas entidades e checagem nas funções),
// então esconder botões aqui é só para a tela não oferecer o que vai falhar.
export function papelDoUsuario(user) {
  if (!user) return "leitor";
  if (user.role === "admin") return "organizador";
  return user.papel || user.data?.papel || "leitor";
}

export function usePermissao() {
  const { user } = useAuth();
  const papel = papelDoUsuario(user);
  const organizador = papel === "organizador";
  const editor = organizador || papel === "editor";

  return {
    papel,
    organizador,
    // roteiro, cidades, despesas, documentos, criar/editar reservas
    podeEditar: editor,
    // excluir reservas, câmbio, permissões
    podeAdministrar: organizador,
    // apagar/editar uma entrada do diário ou foto: autor ou editor
    podeMexerNoRegistro: (registro) => editor || (!!registro && registro.created_by === user?.email),
  };
}
