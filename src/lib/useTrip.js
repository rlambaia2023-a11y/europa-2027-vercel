import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export const q = {
  dias: () => ["dias"],
  cidades: () => ["cidades"],
  viajantes: () => ["viajantes"],
  reservas: () => ["reservas"],
  despesas: () => ["despesas"],
  cambio: () => ["cambio"],
  checklist: () => ["checklist"],
  atividades: (diaData) => ["atividades", diaData],
  atividadesAll: () => ["atividades", "all"],
  diario: (diaData) => ["diario", diaData],
  diarioAll: () => ["diario", "all"],
};

export const doRoteiro = (lista, roteiro = "principal") =>
  (lista || []).filter((item) => (item.roteiro || "principal") === roteiro);

export function useDias() {
  return useQuery({
    queryKey: q.dias(),
    queryFn: async () => {
      const res = await base44.entities.Dia.filter({}, { sort: "data", limit: 100 });
      return res.items;
    },
  });
}

export function useCidades() {
  return useQuery({
    queryKey: q.cidades(),
    queryFn: async () => {
      const res = await base44.entities.Cidade.filter({}, { sort: "ordem", limit: 100 });
      return res.items;
    },
  });
}

export function useViajantes() {
  return useQuery({
    queryKey: q.viajantes(),
    queryFn: async () => {
      const res = await base44.entities.Viajante.filter({}, { limit: 50 });
      return res.items;
    },
  });
}

export function useReservas() {
  return useQuery({
    queryKey: q.reservas(),
    queryFn: async () => {
      const res = await base44.entities.Reserva.filter({}, { sort: "-created_date", limit: 200 });
      return res.items;
    },
  });
}

export function useDespesas() {
  return useQuery({
    queryKey: q.despesas(),
    queryFn: async () => {
      const res = await base44.entities.Despesa.filter({}, { sort: "-created_date", limit: 500 });
      return res.items;
    },
  });
}

export function useCambio() {
  return useQuery({
    queryKey: q.cambio(),
    queryFn: async () => {
      // a mais recente buscada (o app guarda o histórico das cotações)
      const res = await base44.entities.Cambio.filter({}, { sort: "-created_date", limit: 1 });
      return res.items[0] || null;
    },
  });
}

export function useChecklist() {
  return useQuery({
    queryKey: q.checklist(),
    queryFn: async () => {
      const res = await base44.entities.ChecklistItem.filter({}, { limit: 500 });
      return res.items;
    },
  });
}

export function useAtividades(diaData, roteiro = "principal") {
  return useQuery({
    queryKey: [...q.atividades(diaData || "none"), roteiro],
    enabled: !!diaData,
    queryFn: async () => {
      const res = await base44.entities.Atividade.filter({ dia_data: diaData }, { sort: "horario", limit: 200 });
      return doRoteiro(res.items, roteiro);
    },
  });
}

export function useAtividadesAll() {
  return useQuery({
    queryKey: q.atividadesAll(),
    queryFn: async () => {
      const res = await base44.entities.Atividade.filter({}, { limit: 500 });
      return res.items;
    },
  });
}

export function useDiario(diaData) {
  return useQuery({
    queryKey: q.diario(diaData || "all"),
    queryFn: async () => {
      const query = diaData ? { dia_data: diaData } : {};
      const res = await base44.entities.DiarioEntrada.filter(query, { sort: "-created_date", limit: 200 });
      return res.items;
    },
  });
}

export function useInvalidate() {
  const qc = useQueryClient();
  return (keys) => keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
}