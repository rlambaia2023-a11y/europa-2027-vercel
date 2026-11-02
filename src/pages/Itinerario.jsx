import { useState } from "react";
import { useDias, useCidades, useAtividadesAll, doRoteiro } from "@/lib/useTrip";
import GerenciarCidades from "@/components/itinerario/GerenciarCidades";
import NovoDia from "@/components/itinerario/NovoDia";
import DiaCard from "@/components/itinerario/DiaCard";
import ImportarRoteiro from "@/components/itinerario/ImportarRoteiro";
import BuscaInteligente from "@/components/itinerario/BuscaInteligente";
import { cn } from "@/lib/utils";
import { usePermissao } from "@/lib/usePermissao";

const ABAS = [
  { id: "principal", label: "Roteiro principal" },
  { id: "alternativo", label: "Roteiro alternativo" },
];

export default function Itinerario() {
  const { data: todosDias, isLoading } = useDias();
  const { data: cidades } = useCidades();
  const { podeEditar } = usePermissao();
  // mantém as atividades de todos os dias salvas no aparelho para consulta offline
  useAtividadesAll();
  const [roteiro, setRoteiro] = useState(
    new URLSearchParams(window.location.search).get("roteiro") === "alternativo" ? "alternativo" : "principal"
  );

  const todos = todosDias || [];
  const dias = doRoteiro(todos, roteiro);
  const alternativo = roteiro === "alternativo";

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] tracking-[0.2em] uppercase text-accent font-medium">Roteiro editável</p>
        <h1 className="font-heading text-3xl font-semibold text-primary mt-1">Itinerário dia a dia</h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
          {alternativo
            ? "Opção alternativa da viagem, guardada à parte do roteiro principal. O que você colar no painel abaixo entra sempre aqui."
            : "13 dias de 24 de março a 5 de abril de 2027. Toque em um dia para ajustar horários, atrações e deslocamentos — as reservas já registradas não são afetadas."}
        </p>
      </header>

      <div className="inline-flex rounded-xl border border-border bg-card p-1 gap-1">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setRoteiro(a.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              roteiro === a.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {a.label}
            {doRoteiro(todos, a.id).length > 0 && (
              <span className="ml-1.5 opacity-70">{doRoteiro(todos, a.id).length}</span>
            )}
          </button>
        ))}
      </div>

      {podeEditar && (
        <>
          <ImportarRoteiro />
          <BuscaInteligente roteiro={roteiro} dias={dias} cidades={cidades || []} />
        </>
      )}

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground text-sm">Carregando roteiro…</div>
      ) : dias.length === 0 ? (
        <div className="py-12 px-4 text-center text-muted-foreground text-sm bg-card rounded-2xl border border-border">
          {alternativo
            ? "Nenhum dia no roteiro alternativo ainda. Cole um roteiro no painel acima para criar esta versão."
            : "Nenhum dia no roteiro ainda. Crie um novo dia abaixo."}
        </div>
      ) : (
        <div className="space-y-3">
          {dias.map((dia, i) => (
            <DiaCard key={dia.id} dia={dia} index={i} cidades={cidades || []} roteiro={roteiro} />
          ))}
        </div>
      )}

      {!alternativo && podeEditar && (
        <div className="space-y-4 pt-2">
          <NovoDia />
          <GerenciarCidades />
        </div>
      )}
    </div>
  );
}