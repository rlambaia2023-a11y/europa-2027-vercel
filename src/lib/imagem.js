// Reduz fotos da câmera antes de enviar: menos dados móveis na viagem e envio mais rápido.
// Se não der para comprimir (formato que o navegador não abre, por exemplo), envia o original.
export async function comprimirImagem(file, maxDim = 2000, qualidade = 0.85) {
  if (!file?.type?.startsWith("image/") || file.type === "image/gif" || file.size < 500 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((ok) => canvas.toBlob(ok, "image/jpeg", qualidade));
    if (!blob || blob.size >= file.size) return file;
    const nome = (file.name || "foto").replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nome, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
