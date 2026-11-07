import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link2, Paperclip, Loader2, X, Check, AlertTriangle, CalendarDays, Trash2, Save, WifiOff } from "lucide-react";
import { marcarParaLer, NOME_PROVISORIO } from "@/lib/leituraPendente";
import { base44 } from "@/api/base44Client";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { ESTADOS_RESERVA } from "@/lib/tripData";
import { TIPOS_RESERVA, conferirReserva } from "@/lib/reservaCondicao";

// Painel para anexar de uma vez as reservas que já foram feitas:
// cole quantos links quiser (Airbnb, Booking, voos, passeios, trens…) e/ou envie prints e PDFs.
// O sistema lê cada uma, pega data e local e confere com o roteiro antes de salvar.
export default function AnexarReservas({ tipoAtual = "", dias, cidades, reservas, onFechar, onSalvo }) {
  const [textoLinks, setTextoLinks] = useState("");
  const [arquivos, setArquivos] = useState([]);
  const [lendo, setLendo] = useState(false);
  const [progresso, setProgresso] = useState("");
  const [itens, setItens] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const inputRef = useRef(null);

  const roteiro = (dias || []).map((d) => ({ data: d.data, cidade: d.cidade }));
  const linksExistentes = new Set((reservas || []).map((r) => r.link).filter(Boolean));

  function extrairLinks(texto) {
    const achados = String(texto || "").match(/https?:\/\/[^\s<>"')]+/gi) || [];
    return [...new Set(achados.map((l) => l.replace(/[.,;]+$/, "")))];
  }

  async function prepararArquivo(file) {
    if (!file.type.startsWith("image/")) return file; // PDF vai como está
    return comprimirImagem(file).catch(() => file);
  }

  // sem internet a leitura fica para depois: a reserva é salva agora e lida quando a conexão voltar
  const semRede = (e) => !navigator.onLine || e?.status === 0;
  const provisorio = (base, extra = {}) => ({
    ...base, ...extra, tipo: tipoAtual || "hotel", nome: "", cidade: "", estado: "reservado", _pendenteLeitura: true,
  });

  async function lerTudo() {
    const links = extrairLinks(textoLinks);
    if (!links.length && !arquivos.length) {
      toast.error("Cole pelo menos um link ou escolha um arquivo.");
      return;
    }
    setLendo(true);
    const novos = [];
    const total = links.length + arquivos.length;
    let n = 0;

    for (const link of links) {
      n++;
      setProgresso(`Lendo ${n} de ${total}…`);
      const base = { _id: crypto.randomUUID(), _origem: link, link };
      if (linksExistentes.has(link)) {
        novos.push({ ...base, _repetido: true, tipo: tipoAtual || "hotel", nome: "", cidade: "", estado: "reservado" });
        continue;
      }
      if (!navigator.onLine) { novos.push(provisorio(base)); continue; }
      try {
        const res = await base44.functions.invoke("LerReserva", { link, tipo: tipoAtual, roteiro });
        novos.push({ ...base, ...(res.data?.dados || {}), _titulo: res.data?.pagina?.titulo });
      } catch (e) {
        if (semRede(e)) novos.push(provisorio(base));
        else novos.push({ ...base, tipo: tipoAtual || "hotel", nome: "", cidade: "", estado: "reservado", _erro: e?.message || "Não consegui ler" });
      }
    }

    for (const file of arquivos) {
      n++;
      setProgresso(`Lendo ${n} de ${total}…`);
      const base = { _id: crypto.randomUUID(), _origem: file.name };
      try {
        const pronto = await prepararArquivo(file);
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: pronto });
        if (!navigator.onLine) { novos.push(provisorio(base, { comprovante_uri: file_uri })); continue; }
        const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri });
        try {
          const res = await base44.functions.invoke("LerReserva", { file_url: signed_url, tipo: tipoAtual, roteiro });
          novos.push({ ...base, ...(res.data?.dados || {}), comprovante_uri: file_uri });
        } catch (e) {
          if (semRede(e)) novos.push(provisorio(base, { comprovante_uri: file_uri }));
          else novos.push({ ...base, tipo: tipoAtual || "hotel", nome: "", cidade: "", estado: "reservado", comprovante_uri: file_uri, _erro: e?.message || "Não consegui ler" });
        }
      } catch {
        novos.push({ ...base, tipo: tipoAtual || "hotel", nome: "", cidade: "", estado: "reservado", _erro: "Falha ao enviar o arquivo" });
      }
    }

    setItens((atual) => [...atual, ...novos]);
    setTextoLinks("");
    setArquivos([]);
    if (inputRef.current) inputRef.current.value = "";
    setLendo(false);
    setProgresso("");
    const semData = novos.filter((x) => !x._repetido && !x._pendenteLeitura && !x.data_inicio).length;
    if (novos.some((x) => x._pendenteLeitura)) {
      toast("Sem internet: dá para salvar agora. A leitura de data e local acontece quando a conexão voltar.", { icon: "📶" });
      return;
    }
    toast.success(semData ? `${novos.length} lida(s). ${semData} sem data: complete abaixo.` : `${novos.length} reserva(s) lida(s). Confira e salve.`);
  }

  const mudar = (id, campo, valor) =>
    setItens((l) => l.map((x) => (x._id === id ? { ...x, [campo]: valor, ...(campo === "cidade" ? { lat: null, lng: null } : {}) } : x)));
  const tirar = (id) => setItens((l) => l.filter((x) => x._id !== id));

  // pronta = tem nome, data e local; ou foi anexada sem internet (será lida e completada depois)
  const prontos = itens.filter((x) => !x._repetido && (
    x._pendenteLeitura || (x.nome?.trim() && x.data_inicio && (x.cidade?.trim() || x.endereco?.trim()))
  ));

  async function salvarTodos() {
    if (!prontos.length) return;
    setSalvando(true);
    let ok = 0;
    const falhas = [];
    for (const x of prontos) {
      try {
        const criada = await base44.entities.Reserva.create({
          tipo: x.tipo,
          nome: x.nome?.trim() || NOME_PROVISORIO,
          cidade: x.cidade,
          endereco: x.endereco,
          lat: x.lat ?? undefined,
          lng: x.lng ?? undefined,
          data_inicio: x.data_inicio,
          data_fim: x.data_fim || undefined,
          horario: x.horario,
          estado: x.estado || "reservado",
          preco: x.preco != null && x.preco !== "" ? parseFloat(x.preco) : undefined,
          moeda: x.moeda || "EUR",
          data_cotacao: new Date().toISOString().slice(0, 10),
          fonte: x.fonte,
          link: x.link || undefined,
          cancelamento: x.cancelamento,
          detalhes: x.detalhes,
          comprovante_uri: x.comprovante_uri || undefined,
        });
        if (x._pendenteLeitura && criada?.id) {
          marcarParaLer(criada.id, { link: x.link, comprovante_uri: x.comprovante_uri, tipo: x.tipo });
        }
        ok++;
      } catch {
        falhas.push(x._id);
      }
    }
    setItens((l) => l.filter((x) => !prontos.some((p) => p._id === x._id) || falhas.includes(x._id)));
    setSalvando(false);
    if (ok) toast.success(`${ok} reserva(s) salva(s)`);
    if (falhas.length) toast.error(`${falhas.length} não foram salvas. Tente de novo.`);
    onSalvo?.();
    if (!falhas.length && itens.length === prontos.length) onFechar?.();
  }

  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-accent/40 shadow-soft p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold text-primary">Anexar reservas já feitas</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Hotel, Airbnb, apartamento, voo, trem, ônibus, barco, aluguel de carro, parques, passeios e ingressos. Cole os links (um por linha) e/ou envie prints, fotos e PDFs das confirmações. O tipo é reconhecido sozinho.
            Cada reserva só é salva com <strong>data e local</strong>, e o sistema confere com o roteiro.
          </p>
        </div>
        <button onClick={onFechar} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Fechar"><X className="w-5 h-5" /></button>
      </div>

      <label className="block">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium inline-flex items-center gap-1"><Link2 className="w-3.5 h-3.5" /> Links das reservas</span>
        <textarea
          value={textoLinks}
          onChange={(e) => setTextoLinks(e.target.value)}
          rows={3}
          placeholder={"https://www.airbnb.com/l/…\nhttps://www.booking.com/…\nhttps://www.getyourguide.com/…"}
          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {extrairLinks(textoLinks).length > 0 && (
          <span className="text-[11px] text-muted-foreground">{extrairLinks(textoLinks).length} link(s) encontrado(s)</span>
        )}
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => setArquivos(Array.from(e.target.files || []))}
        />
        <button onClick={() => inputRef.current?.click()} disabled={lendo}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:border-accent hover:text-accent disabled:opacity-50">
          <Paperclip className="w-4 h-4" /> Prints / PDFs{arquivos.length ? ` (${arquivos.length})` : ""}
        </button>
        <button onClick={lerTudo} disabled={lendo}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {lendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {lendo ? progresso || "Lendo…" : "Ler reservas"}
        </button>
      </div>

      {itens.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Confira antes de salvar</p>
          {itens.map((x) => (
            <ItemLido key={x._id} item={x} dias={dias} cidades={cidades} reservas={reservas}
              onMudar={(c, v) => mudar(x._id, c, v)} onTirar={() => tirar(x._id)} />
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-xs text-muted-foreground">
              {prontos.length} de {itens.filter((x) => !x._repetido).length} pronta(s) para salvar
            </span>
            <button onClick={salvarTodos} disabled={!prontos.length || salvando}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar {prontos.length || ""} reserva(s)
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function ItemLido({ item: x, dias, cidades, reservas, onMudar, onTirar }) {
  if (x._repetido) {
    return (
      <div className="rounded-xl border border-border bg-secondary/40 p-3 text-xs flex items-center justify-between gap-2">
        <span className="truncate">Já está nas reservas: <span className="font-mono">{x._origem}</span></span>
        <button onClick={onTirar} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
      </div>
    );
  }
  const cond = conferirReserva(x, { dias, cidades, reservas });
  return (
    <div className="rounded-xl border border-border p-3 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] text-muted-foreground truncate min-w-0">
          {x._origem}{x._titulo ? ` · ${x._titulo}` : ""}
        </p>
        <button onClick={onTirar} className="text-muted-foreground hover:text-destructive shrink-0" aria-label="Tirar"><Trash2 className="w-4 h-4" /></button>
      </div>
      {x._erro && <p className="text-xs text-destructive">{x._erro}. Preencha à mão.</p>}
      {x._pendenteLeitura && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground bg-secondary/60 rounded-lg px-2.5 py-2">
          <WifiOff className="w-3.5 h-3.5 mt-px shrink-0" />
          Sem internet agora. Pode salvar assim: quando a conexão voltar, o sistema lê {x.comprovante_uri ? "o comprovante" : "o link"} e completa o que estiver vazio. Se já souber a data e o local, preencha.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Campo label="Tipo" valor={x.tipo} onMudar={(v) => onMudar("tipo", v)} opcoes={TIPOS_RESERVA.map((t) => ({ value: t.id, label: t.curto }))} />
        <Campo label="Estado" valor={x.estado} onMudar={(v) => onMudar("estado", v)} opcoes={ESTADOS_RESERVA.map((e) => ({ value: e.id, label: e.label }))} />
        <div className="col-span-2"><Campo label="Nome" valor={x.nome} onMudar={(v) => onMudar("nome", v)} /></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Campo label={x.tipo === "hotel" ? "Check-in" : "Data"} tipo="date" valor={x.data_inicio} onMudar={(v) => onMudar("data_inicio", v)} destaque={!x.data_inicio} />
        <Campo label={x.tipo === "hotel" ? "Check-out" : "Até (opcional)"} tipo="date" valor={x.data_fim} onMudar={(v) => onMudar("data_fim", v)} />
        <Campo label={x.tipo === "voo" || x.tipo === "transporte" ? "Trecho" : "Cidade"} valor={x.cidade} onMudar={(v) => onMudar("cidade", v)} destaque={!x.cidade && !x.endereco} />
        <Campo label="Horário" valor={x.horario} onMudar={(v) => onMudar("horario", v)} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="col-span-2"><Campo label="Endereço / ponto de encontro" valor={x.endereco} onMudar={(v) => onMudar("endereco", v)} /></div>
        <Campo label="Preço" tipo="number" valor={x.preco ?? ""} onMudar={(v) => onMudar("preco", v)} />
        <Campo label="Moeda" valor={x.moeda || "EUR"} onMudar={(v) => onMudar("moeda", v)} opcoes={[{ value: "EUR", label: "EUR (€)" }, { value: "BRL", label: "BRL (R$)" }]} />
      </div>

      {!x._pendenteLeitura && <Condicao cond={cond} />}
    </div>
  );
}

export function Condicao({ cond, compacto = false }) {
  if (!cond) return null;
  const Icone = cond.nivel === "ok" ? Check : cond.nivel === "falta" ? CalendarDays : AlertTriangle;
  return (
    <p className={cn(
      "flex items-start gap-1.5 rounded-lg text-xs",
      compacto ? "px-2 py-1.5" : "px-2.5 py-2",
      cond.nivel === "ok" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      cond.nivel === "aviso" && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      cond.nivel === "falta" && "bg-destructive/10 text-destructive",
    )}>
      <Icone className="w-3.5 h-3.5 mt-px shrink-0" /> <span>{cond.texto}</span>
    </p>
  );
}

function Campo({ label, valor, onMudar, tipo = "text", opcoes, destaque }) {
  const classe = cn(
    "mt-0.5 w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
    destaque ? "border-destructive/60" : "border-input"
  );
  return (
    <label className="block min-w-0">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
      {opcoes ? (
        <select value={valor || ""} onChange={(e) => onMudar(e.target.value)} className={classe}>
          {opcoes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={tipo} value={valor || ""} onChange={(e) => onMudar(e.target.value)} className={classe} />
      )}
    </label>
  );
}

function comprimirImagem(file, maxDim = 1600) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const escala = maxDim / Math.max(width, height);
          width = Math.round(width * escala);
          height = Math.round(height * escala);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error("Falha ao comprimir imagem"));
          resolve(new File([blob], "reserva.jpg", { type: "image/jpeg" }));
        }, "image/jpeg", 0.85);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
