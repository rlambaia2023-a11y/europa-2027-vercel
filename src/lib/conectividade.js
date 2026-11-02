// Internet no celular durante a viagem. Pesquisa de novembro/2026 — preços aproximados,
// confira no site antes de comprar.
//
// O ponto principal: Itália e Croácia são União Europeia ("roaming como em casa").
// Montenegro e Bósnia NÃO são: um eSIM "Europa" comum para de funcionar na fronteira.

export const RECOMENDACAO = {
  titulo: "Um eSIM que cubra os 4 países",
  texto:
    "O Airalo Eurolink cobre Itália, Croácia, Montenegro e Bósnia num só eSIM (42 países). Compre e instale no Brasil, com Wi-Fi, e ative ao pousar em Roma.",
  link: "https://www.airalo.com/europe-esim",
  rotuloLink: "Ver planos Eurolink (Airalo)",
};

export const ALTERNATIVAS = [
  {
    titulo: "Dois eSIMs: Europa + Bálcãs",
    texto: "Um plano Europa para Itália e Croácia e outro Bálcãs para Montenegro e Bósnia (31/03 a 02/04).",
    links: [
      { rotulo: "eSIM Europa (Holafly)", url: "https://esim.holafly.com/esim-europe/" },
      { rotulo: "eSIM Bálcãs (Holafly)", url: "https://esim.holafly.com/esim-balkans/" },
    ],
  },
  {
    titulo: "Chip físico local",
    texto:
      "Mais barato, mas exige trocar de chip: o croata não funciona em Montenegro/Bósnia, e o montenegrino ou bósnio não funciona na UE (eles valem entre si, pelo acordo de roaming dos Bálcãs).",
  },
];

export const DICAS = [
  "Confira se o celular aceita eSIM: disque *#06# — se aparecer um número EID, aceita. Ele também precisa estar desbloqueado.",
  "Mantenha o chip brasileiro para WhatsApp e códigos do banco, mas desligue o \"roaming de dados\" dele para não ter cobrança.",
  "Com o modo offline do app, roteiro, mapas e fotos já vistos funcionam sem dados. Cerca de 10 GB por pessoa costuma bastar para 13 dias.",
  "Entre Dubrovnik e Kotor a estrada passa pela Bósnia (Neum): normalmente o celular segue na rede croata, mas se aparecer aviso de roaming, é isso.",
];

// Por país: está na UE? E onde comprar chip local nas cidades do roteiro.
export const PAISES = {
  "Itália": {
    ue: true,
    resumo: "União Europeia: eSIM Europa ou Eurolink funcionam.",
    operadoras: [
      { nome: "TIM", url: "https://www.tim.it/" },
      { nome: "Vodafone" },
      { nome: "WindTre" },
    ],
    ondeComprar: "Lojas das operadoras no aeroporto de Fiumicino e no centro de Roma. Leve o passaporte.",
  },
  "Croácia": {
    ue: true,
    resumo: "União Europeia: eSIM Europa ou Eurolink funcionam.",
    operadoras: [
      { nome: "A1", url: "https://www.a1.hr/", destaque: "turista ~€10, 7 dias de dados ilimitados" },
      { nome: "Hrvatski Telekom", destaque: "Visitor SIM" },
      { nome: "Telemach", url: "https://www.telemach.hr/" },
    ],
    ondeComprar: "Quiosques no desembarque do aeroporto de Split (mais caro) ou lojas das operadoras e bancas Tisak no centro de Split e Dubrovnik.",
  },
  "Montenegro": {
    ue: false,
    resumo: "Fora da UE: eSIM Europa comum NÃO funciona. Use Eurolink, eSIM Bálcãs ou chip local.",
    operadoras: [
      { nome: "m:tel", url: "https://mtel.me/", destaque: "Turist 10: €10, 15 dias" },
      { nome: "One", url: "https://www.one.me/" },
      { nome: "Telekom", url: "https://www.telekom.me/" },
    ],
    ondeComprar: "Lojas das operadoras em Kotor, além de supermercados, postos de gasolina e bancas de jornal.",
  },
  "Bósnia e Herzegovina": {
    ue: false,
    resumo: "Fora da UE: eSIM Europa comum NÃO funciona. Use Eurolink, eSIM Bálcãs ou chip local.",
    operadoras: [
      { nome: "BH Telecom", url: "https://www.bhtelecom.ba/", destaque: "turista ~20 KM (€10), 20 GB, 10 dias" },
      { nome: "HT Eronet", url: "https://www.hteronet.ba/", destaque: "boa cobertura em Mostar" },
      { nome: "m:tel", url: "https://mtel.ba/" },
    ],
    ondeComprar: "Lojas das operadoras no centro de Mostar.",
  },
};

export const TAREFAS_ESIM = [
  "Comprar eSIM que cubra Itália, Croácia, Montenegro e Bósnia",
  "Instalar o eSIM no Brasil (com Wi-Fi) antes do embarque",
  "Desligar o roaming de dados do chip brasileiro",
];

export function infoPais(pais) {
  return PAISES[pais] || null;
}
