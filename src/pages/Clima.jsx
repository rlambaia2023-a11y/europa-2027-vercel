import { CloudSun, MapPin, Info } from "lucide-react";
import { useCidades } from "@/lib/useTrip";
import { Image } from "@/components/ui/image";

export default function Clima() {
  const { data: cidades } = useCidades();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] tracking-[0.2em] uppercase text-accent font-medium">Previsão do tempo</p>
        <h1 className="font-heading text-3xl font-semibold text-primary mt-1">Clima por cidade</h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
          A previsão detalhada fica disponível próximos à data da viagem (mar/abr 2027).
        </p>
      </header>

      <div className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 flex items-start gap-2.5 text-[13px] text-foreground/80">
        <Info className="w-4 h-4 text-gold shrink-0 mt-0.5" />
        <p>Previsões confiáveis costumam aparecer com <strong>até 14 dias de antecedência</strong>. Próximo à viagem, integraremos uma API de clima; por enquanto, consulte os links externos de cada cidade.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(cidades || []).map((c) => (
          <div key={c.id} className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
            {c.foto && <div className="h-28 relative"><Image src={c.foto} className="w-full h-full object-cover" alt={c.nome} /></div>}
            <div className="p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" /> {c.pais}
              </div>
              <h2 className="font-heading text-lg font-semibold text-primary mt-0.5">{c.nome}</h2>
              <div className="flex items-center gap-2 mt-3 text-muted-foreground">
                <CloudSun className="w-8 h-8" />
                <div>
                  <p className="text-sm font-medium text-foreground">Previsão indisponível</p>
                  <p className="text-[11px]">Dados climáticos em março/abril 2027</p>
                </div>
              </div>
              <a href={`https://www.google.com/search?q=previsão+tempo+${encodeURIComponent(c.nome)}`} target="_blank" rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-accent font-medium hover:underline">
                Consultar previsão externa →
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
        <h2 className="font-heading text-base font-semibold text-primary mb-2">O que esperar na região (mar–abr)</h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
          <p>🇮🇹 <strong className="text-foreground">Roma:</strong> 10–18°C, dias amenos, alguma chuva.</p>
          <p>🇭🇷 <strong className="text-foreground">Croácia:</strong> 12–17°C no litoral, ventos no Adriático.</p>
          <p>🇲🇪 <strong className="text-foreground">Montenegro:</strong> 9–16°C, montanhas mais frias.</p>
          <p>🇧🇦 <strong className="text-foreground">Bósnia:</strong> 6–14°C, noites frias em Mostar.</p>
        </div>
      </div>
    </div>
  );
}