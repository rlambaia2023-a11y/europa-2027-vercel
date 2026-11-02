import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Wallet } from "lucide-react";

const CATEGORIAS = [
  { id: "voos", label: "Voos", cor: "#202c50" },
  { id: "hoteis", label: "Hotéis", cor: "#c2693a" },
  { id: "carro", label: "Carro", cor: "#c8a44a" },
  { id: "alimentacao", label: "Alimentação", cor: "#3b82a8" },
  { id: "atracoes", label: "Atrações", cor: "#b85c5c" },
  { id: "extras", label: "Extras", cor: "#8b7fa8" },
];

function eurToBrl(v, moeda, taxa) {
  return moeda === "EUR" ? v * taxa : v;
}

export default function DespesasCategoria({ despesas, taxa }) {
  const dados = CATEGORIAS.map((cat) => {
    const total = (despesas || [])
      .filter((d) => d.categoria === cat.id)
      .reduce((s, d) => s + eurToBrl(d.valor || 0, d.moeda, taxa), 0);
    return { name: cat.label, value: Math.round(total), cor: cat.cor };
  }).filter((d) => d.value > 0);

  const total = dados.reduce((s, d) => s + d.value, 0);

  if (dados.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-4.5 h-4.5 text-accent" />
          <h2 className="font-heading text-lg font-semibold text-primary">Despesas por categoria</h2>
        </div>
        <div className="py-10 text-center text-muted-foreground text-sm">
          Nenhuma despesa lançada ainda. Adicione despesas no orçamento para ver a distribuição.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-4.5 h-4.5 text-accent" />
          <h2 className="font-heading text-lg font-semibold text-primary">Despesas por categoria</h2>
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          Total: R$ {total.toLocaleString("pt-BR")}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="w-full sm:w-1/2 h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dados}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
              >
                {dados.map((d) => (
                  <Cell key={d.name} fill={d.cor} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => `R$ ${v.toLocaleString("pt-BR")}`}
                contentStyle={{
                  background: "#202c50",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "13px",
                }}
                labelStyle={{ color: "#fff" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="w-full sm:w-1/2 space-y-2">
          {dados
            .slice()
            .sort((a, b) => b.value - a.value)
            .map((d) => {
              const pct = ((d.value / total) * 100).toFixed(0);
              return (
                <div key={d.name} className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: d.cor }} />
                  <span className="text-sm flex-1">{d.name}</span>
                  <span className="text-sm font-medium text-primary">R$ {d.value.toLocaleString("pt-BR")}</span>
                  <span className="text-xs text-muted-foreground w-9 text-right">{pct}%</span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}