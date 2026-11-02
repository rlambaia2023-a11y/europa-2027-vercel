import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Busca uma URL assinada para um arquivo privado (file_uri) e renderiza a imagem.
export default function SignedImage({ fileUri, alt = "", className = "" }) {
  const [url, setUrl] = useState(null);
  const [erro, setErro] = useState(false);
  const publica = /^https?:\/\//i.test(fileUri || "");

  useEffect(() => {
    let alive = true;
    setErro(false);
    setUrl(null);
    if (!fileUri || publica) return;
    base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 3600 })
      .then((res) => { if (alive) setUrl(res.signed_url); })
      .catch(() => { if (alive) setErro(true); });
    return () => { alive = false; };
  }, [fileUri, publica]);

  if (publica) return <img src={fileUri} alt={alt} className={className} />;
  if (erro) return <div className={className + " bg-secondary flex items-center justify-center text-[11px] text-muted-foreground"}>indisponível</div>;
  if (!url) return <div className={className + " bg-secondary animate-pulse"} />;
  return <img src={url} alt={alt} className={className} />;
}