import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ImagePlus, Loader2, MapPin, Navigation, Trash2, Save } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "react-hot-toast";
import { formatarData } from "@/lib/tripData";

export default function FormFoto({ dias, viajantes, onSaved }) {
  const [form, setForm] = useState({
    dia_data: dias[0]?.data || "",
    viajante_nome: viajantes[0]?.nome || "",
    texto: "",
    local: "",
  });
  const [coords, setCoords] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [subindo, setSubindo] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const fileRef = useRef(null);

  async function subirFotos(files) {
    if (!files?.length) return;
    setSubindo(true);
    const uris = [];
    for (const f of Array.from(files)) {
      try {
        const res = await base44.integrations.Core.UploadPublicFile({ file: f });
        uris.push(res.file_url);
      } catch {
        toast.error(`Erro no envio de ${f.name}`);
      }
    }
    setFotos((prev) => [...prev, ...uris]);
    setSubindo(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function capturarLocal() {
    if (!navigator.geolocation) {
      toast.error("Este aparelho não permite capturar a localização.");
      return;
    }
    setBuscando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setBuscando(false);
        toast.success("Localização capturada");
      },
      () => {
        setBuscando(false);
        toast.error("Não foi possível capturar. Escreva o lugar no campo.");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.dia_data || !form.viajante_nome) return;
    if (!fotos.length) {
      toast.error("Adicione ao menos uma foto.");
      return;
    }
    setEnviando(true);
    try {
      await base44.entities.DiarioEntrada.create({
        dia_data: form.dia_data,
        viajante_nome: form.viajante_nome,
        texto: form.texto.trim() || undefined,
        fotos,
        local: form.local.trim() || undefined,
        lat: coords?.lat,
        lng: coords?.lng,
      });
      toast.success(`${fotos.length} foto(s) guardadas no álbum`);
      setFotos([]);
      setCoords(null);
      setForm((f) => ({ ...f, texto: "", local: "" }));
      onSaved?.();
    } catch {
      toast.error("Erro ao salvar no diário");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      onSubmit={salvar}
      className="bg-card rounded-2xl border border-border shadow-soft p-4 space-y-3"
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Dia do registro *</span>
          <select value={form.dia_data} onChange={(e) => setForm({ ...form, dia_data: e.target.value })}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            {(dias || []).map((d) => (
              <option key={d.id} value={d.data}>{formatarData(d.data)} — {d.titulo}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Quem registrou</span>
          <select value={form.viajante_nome} onChange={(e) => setForm({ ...form, viajante_nome: e.target.value })}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            {(viajantes || []).map((v) => <option key={v.id} value={v.nome}>{v.nome}</option>)}
          </select>
        </label>
      </div>

      <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-border rounded-lg p-5 cursor-pointer hover:border-accent text-muted-foreground">
        {subindo ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
        <span className="text-xs text-center">
          {subindo ? "Enviando fotos…" : "Toque para escolher fotos da câmera ou galeria (armazenadas publicamente — qualquer pessoa com o link pode abrir)"}
        </span>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => subirFotos(e.target.files)} />
      </label>

      {fotos.length > 0 && (
        <p className="text-[11px] text-accent font-medium">{fotos.length} foto(s) prontas para salvar</p>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Lugar do registro</span>
          <div className="mt-1 flex gap-2">
            <input type="text" value={form.local} placeholder="Ex.: Coliseu, Roma"
              onChange={(e) => setForm({ ...form, local: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <button type="button" onClick={capturarLocal} disabled={buscando}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:border-accent hover:text-accent disabled:opacity-50">
              {buscando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
              {buscando ? "…" : "Minha localização"}
            </button>
          </div>
          {coords && (
            <span className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <MapPin className="w-3 h-3 text-accent" />
              {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              <button type="button" onClick={() => setCoords(null)} aria-label="Remover localização">
                <Trash2 className="w-3 h-3 hover:text-destructive" />
              </button>
            </span>
          )}
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Legenda</span>
          <textarea value={form.texto} rows={3} placeholder="O que ficou desse momento…"
            onChange={(e) => setForm({ ...form, texto: e.target.value })}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
        </label>
      </div>

      <button type="submit" disabled={enviando || subindo}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50">
        {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {enviando ? "Salvando…" : "Salvar no diário"}
      </button>
    </motion.form>
  );
}