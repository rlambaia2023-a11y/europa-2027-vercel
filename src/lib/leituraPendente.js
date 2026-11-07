// Reservas anexadas sem internet: ficam salvas no aparelho (e na fila de sincronização)
// e, quando a conexão volta, o sistema lê o link ou o comprovante e completa os dados
// que ainda estiverem vazios — sem apagar nada que a família já tenha preenchido.
import { base44 } from "@/api/base44Client";
import { lerTabela } from "@/lib/offline";

const CHAVE = "reservas:leitura-pendente";
export const NOME_PROVISORIO = "Reserva a ler (sem internet)";

function ler() {
  try { return JSON.parse(localStorage.getItem(CHAVE) || "[]"); } catch { return []; }
}
function gravar(lista) {
  try { localStorage.setItem(CHAVE, JSON.stringify(lista)); } catch { /* sem espaço */ }
}

export function marcarParaLer(reservaId, { link, comprovante_uri, tipo }) {
  gravar([...ler().filter((x) => x.id !== reservaId), { id: reservaId, link, comprovante_uri, tipo, tentativas: 0 }]);
}

export const leiturasPendentes = () => ler();
export const estaPendente = (id) => ler().some((x) => x.id === id);

const vazio = (v) => v == null || String(v).trim() === "";
const CAMPOS = ["cidade", "endereco", "lat", "lng", "data_inicio", "data_fim", "horario", "preco", "moeda", "fonte", "cancelamento", "detalhes"];

let rodando = false;

// Chamado depois de cada sincronização bem-sucedida. Devolve true se completou alguma reserva.
export async function processarLeiturasPendentes() {
  if (rodando || !navigator.onLine) return false;
  const lista = ler();
  if (!lista.length) return false;
  rodando = true;
  let mudou = false;
  const roteiro = lerTabela("dias")
    .filter((d) => (d.roteiro || "principal") === "principal")
    .map((d) => ({ data: d.data, cidade: d.cidade }));

  try {
    for (const item of lista) {
      if (!navigator.onLine) break;
      try {
        const reserva = await base44.entities.Reserva.get(item.id).catch(() => null);
        if (!reserva) { remover(item.id); continue; } // foi apagada nesse meio-tempo

        let corpo = { tipo: item.tipo, roteiro };
        if (item.comprovante_uri) {
          const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: item.comprovante_uri });
          if (!/^https:\/\//.test(signed_url)) continue; // arquivo ainda não subiu: tenta na próxima
          corpo.file_url = signed_url;
        } else if (item.link) {
          corpo.link = item.link;
        } else { remover(item.id); continue; }

        const res = await base44.functions.invoke("LerReserva", corpo);
        const dados = res.data?.dados || {};
        const patch = {};
        for (const c of CAMPOS) if (vazio(reserva[c]) && !vazio(dados[c])) patch[c] = dados[c];
        if ((vazio(reserva.nome) || reserva.nome === NOME_PROVISORIO) && !vazio(dados.nome)) patch.nome = dados.nome;
        if (Object.keys(patch).length) {
          await base44.entities.Reserva.update(item.id, patch);
          mudou = true;
        }
        remover(item.id);
      } catch (e) {
        if (!navigator.onLine || e?.status === 0) break; // caiu a rede de novo
        // erro da leitura (link fora do ar, cota da IA…): tenta mais 2 vezes e desiste
        const atual = ler().find((x) => x.id === item.id);
        if (!atual || atual.tentativas >= 2) remover(item.id);
        else gravar(ler().map((x) => (x.id === item.id ? { ...x, tentativas: x.tentativas + 1 } : x)));
      }
    }
  } finally {
    rodando = false;
  }
  return mudou;
}

function remover(id) {
  gravar(ler().filter((x) => x.id !== id));
}
