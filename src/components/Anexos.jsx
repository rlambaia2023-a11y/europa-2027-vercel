import { useRef, useState } from "react";
import { Paperclip, FileText, Image as ImageIcon, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { comprimirImagem } from "@/lib/imagem";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

// Tipos aceitos em todos os anexos do sistema: fotos da câmera, prints e PDFs
export const ACEITA_ANEXO = "image/*,application/pdf";

const ehPdf = (uri) => /\.pdf$/i.test(String(uri || ""));

export async function enviarAnexos(files) {
  const uris = [];
  for (const f of Array.from(files || [])) {
    if (!f.type.startsWith("image/") && f.type !== "application/pdf") {
      toast.error(`${f.name}: envie foto, print ou PDF`);
      continue;
    }
    if (f.size > 15 * 1024 * 1024) {
      toast.error(`${f.name} passa de 15 MB`);
      continue;
    }
    try {
      const pronto = f.type.startsWith("image/") ? await comprimirImagem(f) : f;
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: pronto });
      uris.push(file_uri);
    } catch {
      toast.error(`Erro ao enviar ${f.name}`);
    }
  }
  return uris;
}

export async function abrirAnexo(uri) {
  try {
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri });
    window.open(signed_url, "_blank");
  } catch {
    toast.error("Não consegui abrir o anexo");
  }
}

/**
 * Lista de anexos (fotos, prints, PDFs) com botão para adicionar mais.
 * `onSalvar(novaLista)` grava no registro. Funciona sem internet: o arquivo fica no
 * aparelho e sobe quando a conexão voltar.
 */
export default function Anexos({ uris = [], onSalvar, podeEditar = false, rotulo = "Anexar foto, print ou PDF", className }) {
  const lista = Array.isArray(uris) ? uris.filter(Boolean) : [];
  const inputRef = useRef(null);
  const [enviando, setEnviando] = useState(false);

  async function adicionar(files) {
    if (!files?.length) return;
    setEnviando(true);
    try {
      const novos = await enviarAnexos(files);
      if (novos.length) {
        await onSalvar([...lista, ...novos]);
        toast.success(novos.length > 1 ? `${novos.length} anexos salvos` : "Anexo salvo");
      }
    } catch {
      toast.error("Erro ao salvar o anexo");
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function tirar(uri) {
    try {
      await onSalvar(lista.filter((u) => u !== uri));
      base44.integrations.Core.DeleteFile({ file_uri: uri }).catch(() => {});
    } catch {
      toast.error("Erro ao remover");
    }
  }

  if (!lista.length && !podeEditar) return null;
  let nFoto = 0;
  let nPdf = 0;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {lista.map((uri) => {
        const pdf = ehPdf(uri);
        const nome = pdf ? `PDF ${++nPdf}` : `Foto ${++nFoto}`;
        const Icone = pdf ? FileText : ImageIcon;
        return (
          <span key={uri} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[11px]">
            <button type="button" onClick={() => abrirAnexo(uri)} className="inline-flex items-center gap-1 text-accent font-medium hover:underline">
              <Icone className="w-3 h-3" /> {nome}
            </button>
            {podeEditar && (
              <button type="button" onClick={() => tirar(uri)} className="text-muted-foreground hover:text-destructive" aria-label={`Remover ${nome}`}>
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        );
      })}
      {podeEditar && (
        <>
          <input ref={inputRef} type="file" multiple accept={ACEITA_ANEXO} className="hidden" onChange={(e) => adicionar(e.target.files)} />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={enviando}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground hover:border-accent hover:text-accent disabled:opacity-50">
            {enviando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
            {enviando ? "Enviando…" : lista.length ? "Mais" : rotulo}
          </button>
        </>
      )}
    </div>
  );
}
