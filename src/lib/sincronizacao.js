import { sincronizarAgora } from "@/api/base44Client";
import { estadoOffline } from "@/lib/offline";
import { processarLeiturasPendentes } from "@/lib/leituraPendente";

const DOIS_MINUTOS = 2 * 60 * 1000;
let ultimaTentativa = 0;

// Envia a fila e baixa tudo de novo; depois avisa as telas para mostrarem os dados novos.
async function sincronizar(queryClient) {
  ultimaTentativa = Date.now();
  const ok = await sincronizarAgora();
  if (ok) queryClient.invalidateQueries();
  // reservas anexadas sem internet: lê os links/comprovantes agora e completa os dados
  if (ok && (await processarLeiturasPendentes())) queryClient.invalidateQueries({ queryKey: ["reservas"] });
}

export function iniciarSincronizacao(queryClient) {
  const tentar = () => navigator.onLine && sincronizar(queryClient);

  // ao abrir o app: já deixa a cópia do aparelho completa
  tentar();
  // a internet voltou: envia o que foi feito sem conexão
  window.addEventListener("online", tentar);
  // voltou para o app depois de um tempo: traz o que a família mudou
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && Date.now() - ultimaTentativa > DOIS_MINUTOS) tentar();
  });
  // ficou alguma alteração na fila (rede instável): tenta de novo a cada minuto
  setInterval(() => {
    if (estadoOffline().pendentes > 0) tentar();
  }, 60 * 1000);
}
