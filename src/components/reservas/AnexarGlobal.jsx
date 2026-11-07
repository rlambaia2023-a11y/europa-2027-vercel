import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FolderInput } from "lucide-react";
import AnexarReservas from "@/components/reservas/AnexarReservas";
import { useDias, useCidades, useReservas, useInvalidate, doRoteiro } from "@/lib/useTrip";
import { usePermissao } from "@/lib/usePermissao";
import { cn } from "@/lib/utils";

// Qualquer tela pode abrir o painel de anexar: window.dispatchEvent(new Event(EVENTO_ANEXAR))
export const EVENTO_ANEXAR = "europa:anexar-reserva";
// abrirAnexo() abre o painel vazio; abrirAnexo(arquivos) já abre lendo os arquivos (PDF/fotos)
export const abrirAnexo = (arquivos) =>
  window.dispatchEvent(new CustomEvent(EVENTO_ANEXAR, { detail: { arquivos: Array.isArray(arquivos) ? arquivos : null } }));

// Botão flutuante presente em todo o sistema para anexar reservas já feitas:
// hotel, Airbnb, apartamento, voo, trem, ônibus, barco, aluguel de carro, parques, passeios e ingressos.
export default function AnexarGlobal() {
  const { podeEditar } = usePermissao();
  const { pathname } = useLocation();
  const [aberto, setAberto] = useState(false);
  const [arquivos, setArquivos] = useState(null);

  useEffect(() => {
    const abrir = (e) => { setArquivos(e?.detail?.arquivos || null); setAberto(true); };
    window.addEventListener(EVENTO_ANEXAR, abrir);
    return () => window.removeEventListener(EVENTO_ANEXAR, abrir);
  }, []);
  useEffect(() => { setAberto(false); }, [pathname]);
  useEffect(() => { if (!aberto) setArquivos(null); }, [aberto]);
  useEffect(() => {
    if (!aberto) return;
    const esc = (e) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto]);

  if (!podeEditar) return null;

  return (
    <>
      <button
        onClick={() => { setArquivos(null); setAberto(true); }}
        aria-label="Anexar reservas"
        className={cn(
          "fixed z-30 right-4 bottom-20 lg:bottom-6 lg:right-6",
          "inline-flex items-center gap-2 rounded-full bg-accent text-accent-foreground shadow-card",
          "px-4 py-3 text-sm font-semibold hover:opacity-90 active:scale-95 transition"
        )}
      >
        <FolderInput className="w-5 h-5" />
        <span>Anexar<span className="hidden sm:inline"> reserva</span></span>
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 overflow-y-auto"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setAberto(false)}
          >
            <div className="min-h-full flex items-start justify-center p-3 sm:p-6" onClick={(e) => e.target === e.currentTarget && setAberto(false)}>
              <div className="w-full max-w-3xl">
                <PainelComDados arquivos={arquivos} onFechar={() => setAberto(false)} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function PainelComDados({ onFechar, arquivos }) {
  const { data: todosDias } = useDias();
  const { data: cidades } = useCidades();
  const { data: reservas } = useReservas();
  const invalidate = useInvalidate();
  return (
    <AnexarReservas
      dias={doRoteiro(todosDias)}
      cidades={cidades}
      reservas={reservas}
      onFechar={onFechar}
      arquivosIniciais={arquivos}
      onSalvo={() => invalidate([["reservas"]])}
    />
  );
}
