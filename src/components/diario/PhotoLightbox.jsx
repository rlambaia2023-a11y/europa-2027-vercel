import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import SignedImage from "@/components/SignedImage";
import { formatarData } from "@/lib/tripData";

export default function PhotoLightbox({ fotos, index, onPrev, onNext, onClose }) {
  const foto = fotos[index];

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    }
    window.addEventListener("keydown", onKey);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = anterior;
    };
  }, [onClose, onPrev, onNext]);

  if (!foto) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
        aria-label="Fechar"
      >
        <X className="w-5 h-5" />
      </button>

      <span className="absolute top-5 left-4 text-white/70 text-xs font-medium">
        {index + 1} / {fotos.length}
      </span>

      {fotos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            className="absolute left-2 sm:left-5 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
            aria-label="Foto anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="absolute right-2 sm:right-5 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
            aria-label="Próxima foto"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      <div className="max-h-[82vh] max-w-[92vw] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <SignedImage
          fileUri={foto.uri}
          alt={foto.titulo || "Foto do diário"}
          className="max-h-[82vh] max-w-[92vw] w-auto h-auto object-contain rounded-lg"
        />
      </div>

      <div className="absolute bottom-0 inset-x-0 px-4 py-4 bg-gradient-to-t from-black/80 to-transparent text-center">
        <p className="text-white text-sm font-medium">
          {formatarData(foto.data, "longo")}{foto.titulo ? ` · ${foto.titulo}` : ""}
        </p>
        {foto.viajante && <p className="text-white/60 text-[11px] mt-0.5">{foto.viajante}</p>}
      </div>
    </div>
  );
}