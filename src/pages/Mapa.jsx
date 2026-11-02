import { useState, useMemo, useEffect } from "react";
import {
  MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap, useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { MapPin, Navigation, ExternalLink, Plus, Trash2, MapPinPlus, X, GripVertical } from "lucide-react";
import { useCidades, useAtividadesAll, useDias, useInvalidate, doRoteiro } from "@/lib/useTrip";
import { formatarData } from "@/lib/tripData";
import { base44 } from "@/api/base44Client";
import { toast } from "react-hot-toast";
import { usePermissao } from "@/lib/usePermissao";
import { cn } from "@/lib/utils";

function pinIcon(cor = "#c06b4a", label) {
  return L.divIcon({
    className: "",
    html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:${cor};transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);color:#fff;font-size:11px;font-weight:700">${label || ""}</span></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });
}

function newPinIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#1e2a4a;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);color:#fff;font-size:14px;font-weight:700">+</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, zoom || 8, { duration: 0.8 }); }, [center, zoom]);
  return null;
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => [p[0], p[1]]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [points]);
  return null;
}

function MapClickHandler({ active, onClick }) {
  useMapEvents({
    click(e) { if (active) onClick(e.latlng); },
  });
  return null;
}

export default function Mapa() {
  const urlParams = new URLSearchParams(window.location.search);
  const [diaSel, setDiaSel] = useState(urlParams.get("dia") || "");
  const { data: cidades } = useCidades();
  const { data: todasAtividades } = useAtividadesAll();
  const atividadesAll = doRoteiro(todasAtividades);
  const { data: todosDias } = useDias();
  const dias = doRoteiro(todosDias);
  const invalidate = useInvalidate();
  const { podeEditar } = usePermissao();

  const [addingStop, setAddingStop] = useState(false);
  const [newPin, setNewPin] = useState(null);
  const [newNome, setNewNome] = useState("");
  const [newPais, setNewPais] = useState("");
  const [saving, setSaving] = useState(false);

  const cidadesRoteiro = useMemo(
    () => [...(cidades || [])].filter((c) => c.lat && c.lng).sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999)),
    [cidades]
  );

  const atividadesDoDia = useMemo(() => {
    if (!diaSel) return [];
    return (atividadesAll || [])
      .filter((a) => a.dia_data === diaSel && a.lat && a.lng)
      .slice()
      .sort((a, b) => (a.horario || "99").localeCompare(b.horario || "99"));
  }, [diaSel, atividadesAll]);

  const centro = diaSel && atividadesDoDia[0]
    ? [atividadesDoDia[0].lat, atividadesDoDia[0].lng]
    : (cidadesRoteiro[0] ? [cidadesRoteiro[0].lat, cidadesRoteiro[0].lng] : [42.5, 15]);

  const rota = cidadesRoteiro.map((c) => [c.lat, c.lng]);
  const rotaDia = atividadesDoDia.map((a) => [a.lat, a.lng]);
  const gmapsRotaUrl = useMemo(() => {
    if (rotaDia.length < 2) return null;
    const origem = rotaDia[0];
    const destino = rotaDia[rotaDia.length - 1];
    const waypoints = rotaDia.slice(1, -1).map((p) => `${p[0]},${p[1]}`).join("|");
    return `https://www.google.com/maps/dir/?api=1&origin=${origem[0]},${origem[1]}&destination=${destino[0]},${destino[1]}${waypoints ? `&waypoints=${waypoints}` : ""}&travelmode=driving`;
  }, [rotaDia]);

  async function onDragEnd(result) {
    if (!result.destination || result.destination.index === result.source.index) return;
    const reordered = Array.from(cidadesRoteiro);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    try {
      await base44.entities.Cidade.bulkUpdate(
        reordered.map((c, i) => ({ id: c.id, ordem: i }))
      );
      invalidate([["cidades"]]);
      toast.success("Rota reordenada");
    } catch {
      toast.error("Erro ao salvar ordem");
    }
  }

  async function removerCidade(cidade) {
    if (!confirm(`Remover ${cidade.nome} da rota?`)) return;
    try {
      await base44.entities.Cidade.delete(cidade.id);
      invalidate([["cidades"]]);
      toast.success("Parada removida");
    } catch {
      toast.error("Erro ao remover");
    }
  }

  async function salvarNovaParada(e) {
    e.preventDefault();
    if (!newNome.trim() || !newPin) return;
    setSaving(true);
    try {
      await base44.entities.Cidade.create({
        nome: newNome.trim(),
        pais: newPais.trim() || "—",
        lat: newPin.lat,
        lng: newPin.lng,
        ordem: cidadesRoteiro.length,
      });
      invalidate([["cidades"]]);
      toast.success("Parada adicionada à rota");
      setNewPin(null);
      setNewNome("");
      setNewPais("");
      setAddingStop(false);
    } catch {
      toast.error("Erro ao adicionar parada");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] tracking-[0.2em] uppercase text-accent font-medium">Mapa interativo</p>
        <h1 className="font-heading text-3xl font-semibold text-primary mt-1">Mapa da viagem</h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
          Rota entre as cidades e pontos do dia. Arraste as paradas para reordenar, clique no mapa para adicionar uma nova parada — tudo salvo automaticamente.
        </p>
      </header>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button onClick={() => setDiaSel("")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${!diaSel ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground"}`}>
          Rota completa
        </button>
        {(dias || []).map((d) => (
          <button key={d.id} onClick={() => setDiaSel(d.data)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${diaSel === d.data ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground"}`}>
            {formatarData(d.data)}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-border shadow-soft h-[420px] sm:h-[520px] relative">
          <MapContainer center={centro} zoom={6} scrollWheelZoom className="w-full h-full">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
            <MapClickHandler active={addingStop} onClick={(latlng) => setNewPin(latlng)} />
            <FlyTo center={centro} zoom={diaSel ? 12 : 6} />
            {diaSel && rotaDia.length > 0 && <FitBounds points={rotaDia} />}
            {!diaSel && cidadesRoteiro.map((c, i) => (
              <Marker key={c.id} position={[c.lat, c.lng]} icon={pinIcon("#1e2a4a", String(i + 1))}>
                <Popup>
                  <strong>{c.nome}</strong><br />{c.pais}
                  <br /><a href={`https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`} target="_blank" rel="noreferrer">Abrir no Google Maps</a>
                </Popup>
                <Tooltip direction="top" permanent className="map-label">
                  {i + 1}. {c.nome}
                </Tooltip>
              </Marker>
            ))}
            {!diaSel && rota.length > 1 && (
              <>
                <Polyline positions={rota} pathOptions={{ color: "#c06b4a", weight: 10, opacity: 0.18 }} />
                <Polyline positions={rota} pathOptions={{ color: "#c06b4a", weight: 4.5, opacity: 0.9 }} />
              </>
            )}
            {diaSel && rotaDia.length > 1 && (
              <>
                <Polyline positions={rotaDia} pathOptions={{ color: "#c06b4a", weight: 12, opacity: 0.2 }} />
                <Polyline positions={rotaDia} pathOptions={{ color: "#c06b4a", weight: 5, opacity: 0.95 }} />
              </>
            )}
            {diaSel && atividadesDoDia.map((a, i) => (
              <Marker key={a.id} position={[a.lat, a.lng]} icon={pinIcon("#c06b4a", String(i + 1))}>
                <Popup>
                  <strong>{a.nome}</strong><br />{a.horario || ""}{a.endereco ? `<br/>${a.endereco}` : ""}
                  <br /><a href={`https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}`} target="_blank" rel="noreferrer">Google Maps</a>
                </Popup>
              </Marker>
            ))}
            {newPin && (
              <Marker position={[newPin.lat, newPin.lng]} icon={newPinIcon()}>
                <Popup>
                  <strong>Nova parada</strong><br />{newPin.lat.toFixed(4)}, {newPin.lng.toFixed(4)}
                </Popup>
              </Marker>
            )}
          </MapContainer>
          {addingStop && (
            <div className="absolute top-3 left-3 right-3 z-[1000] bg-primary text-primary-foreground px-3 py-2 rounded-lg shadow-card text-xs font-medium flex items-center gap-2">
              <MapPinPlus className="w-4 h-4 text-gold" />
              <span className="flex-1">Clique no mapa para posicionar a nova parada.</span>
              <button onClick={() => { setAddingStop(false); setNewPin(null); }} className="p-1 hover:bg-white/10 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-soft p-4 max-h-[520px] overflow-y-auto">
          <h2 className="font-heading text-base font-semibold text-primary mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent" />
            {diaSel ? `Pontos do dia ${formatarData(diaSel)}` : "Paradas da rota"}
          </h2>

          {diaSel && gmapsRotaUrl && (
            <a href={gmapsRotaUrl} target="_blank" rel="noreferrer"
              className="mb-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90">
              <Navigation className="w-4 h-4" /> Abrir rota no Google Maps
            </a>
          )}

          {!diaSel && podeEditar && (
            <button
              onClick={() => { setAddingStop((v) => !v); setNewPin(null); }}
              className={cn("mb-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                addingStop ? "bg-accent text-accent-foreground border-accent" : "border-dashed border-accent text-accent hover:bg-accent/10")}
            >
              {addingStop ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {addingStop ? "Cancelar adição" : "Adicionar parada no mapa"}
            </button>
          )}

          {newPin && !diaSel && podeEditar && (
            <form onSubmit={salvarNovaParada} className="mb-3 p-3 rounded-xl border border-accent/40 bg-accent/5 space-y-2">
              <p className="text-[11px] font-medium text-accent">Nova parada · {newPin.lat.toFixed(4)}, {newPin.lng.toFixed(4)}</p>
              <input value={newNome} onChange={(e) => setNewNome(e.target.value)} placeholder="Nome da cidade"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <input value={newPais} onChange={(e) => setNewPais(e.target.value)} placeholder="País"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <div className="flex gap-2">
                <button type="submit" disabled={saving || !newNome.trim()}
                  className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                  {saving ? "Salvando…" : "Salvar parada"}
                </button>
                <button type="button" onClick={() => setNewPin(null)} className="px-3 py-2 rounded-lg border border-border text-sm">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {diaSel ? (
            atividadesDoDia.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum ponto com coordenadas neste dia.</p>
            ) : (
              <div className="space-y-2">
                {atividadesDoDia.map((a, i) => (
                  <a key={a.id} href={`https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}`} target="_blank" rel="noreferrer"
                    className="flex gap-2.5 p-2.5 rounded-lg border border-border hover:border-accent transition-colors">
                    <span className="w-6 h-6 rounded-full bg-accent text-white text-[11px] font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight">{a.nome}</p>
                      {a.horario && <p className="text-[11px] text-muted-foreground">{a.horario}</p>}
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground self-center ml-auto shrink-0" />
                  </a>
                ))}
              </div>
            )
          ) : (
            cidadesRoteiro.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma parada cadastrada.</p>
            ) : (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="rota">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                      {cidadesRoteiro.map((c, i) => (
                        <Draggable key={c.id} draggableId={c.id} index={i} isDragDisabled={!podeEditar}>
                          {(p, snapshot) => (
                            <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
                              className={cn("flex gap-2.5 p-2.5 rounded-lg border bg-card transition-colors",
                                snapshot.isDragging ? "border-accent shadow-card" : "border-border hover:border-accent")}>
                              <span className="w-6 h-6 rounded-full bg-primary text-white text-[11px] font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
                              <GripVertical className="w-4 h-4 text-muted-foreground self-center shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium leading-tight">{c.nome}</p>
                                <p className="text-[11px] text-muted-foreground">{c.pais}</p>
                              </div>
                              <a href={`https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`} target="_blank" rel="noreferrer"
                                className="self-center text-muted-foreground hover:text-accent p-1">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              {podeEditar && (
                                <button onClick={() => removerCidade(c)} className="self-center text-muted-foreground hover:text-destructive p-1" aria-label="Remover cidade">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )
          )}
        </div>
      </div>
    </div>
  );
}