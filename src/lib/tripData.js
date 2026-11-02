// Dados iniciais pré-preenchidos da viagem Europa 2027.
// Servem como fonte de exemplo para a primeira tela; serão substituídos
// por dados reais das entidades assim que o backend estiver pronto.

export const VIAGEM = {
  titulo: "Europa 2027 — Viagem em Família",
  dataInicio: "2027-03-24",
  dataFim: "2027-04-05",
  origem: "Salvador, Bahia, Brasil",
  entradaEuropa: "Roma, Itália",
  saidaEuropa: "Zagreb, Croácia",
  totalViajantes: 4,
};

export const PAISES = [
  { nome: "Itália", bandeira: "🇮🇹", cor: "#1e7d4f" },
  { nome: "Croácia", bandeira: "🇭🇷", cor: "#d6383a" },
  { nome: "Montenegro", bandeira: "🇲🇪", cor: "#c8102e" },
  { nome: "Bósnia e Herzegovina", bandeira: "🇧🇦", cor: "#0093d6" },
];

export const CIDADES = [
  { nome: "Roma", pais: "Itália", lat: 41.9028, lng: 12.4964, foto: "https://images.unsplash.com/photo-1552832230-c0197dd1d65b?w=800&q=80", dias: [0, 1, 2] },
  { nome: "Split", pais: "Croácia", lat: 43.5081, lng: 16.4402, foto: "https://images.unsplash.com/photo-1522199516474-688e74e1c1d6?w=800&q=80", dias: [3, 4] },
  { nome: "Dubrovnik", pais: "Croácia", lat: 42.6507, lng: 18.0944, foto: "https://images.unsplash.com/photo-1543538687-97c9b6773b58?w=800&q=80", dias: [5, 6] },
  { nome: "Kotor", pais: "Montenegro", lat: 42.4247, lng: 18.7712, foto: "https://images.unsplash.com/photo-1601737486881-43e1a6e7e8c2?w=800&q=80", dias: [7] },
  { nome: "Perast", pais: "Montenegro", lat: 42.4892, lng: 18.6986, foto: "https://images.unsplash.com/photo-1605648170861-6a8d3a5b6c8e?w=800&q=80", dias: [8] },
  { nome: "Mostar", pais: "Bósnia e Herzegovina", lat: 43.3438, lng: 17.808, foto: "https://images.unsplash.com/photo-1585264248793-7f6f2c9e1d2a?w=800&q=80", dias: [8, 9] },
  { nome: "Plitvice", pais: "Croácia", lat: 44.8654, lng: 15.5828, foto: "https://images.unsplash.com/photo-1552465011-b9346e7f1c2e?w=800&q=80", dias: [9] },
  { nome: "Zagreb", pais: "Croácia", lat: 45.815, lng: 15.9819, foto: "https://images.unsplash.com/photo-1545553743-3e1c4b7a5b3e?w=800&q=80", dias: [10, 11, 12] },
];

export const DIAS = [
  { data: "2027-03-24", titulo: "Chegada a Roma", cidade: "Roma", destaque: "Desembarque e primeiro contato com a Cidade Eterna" },
  { data: "2027-03-25", titulo: "Roma Antiga", cidade: "Roma", destaque: "Coliseu, Fórum Romano e centro histórico" },
  { data: "2027-03-26", titulo: "Vaticano", cidade: "Roma", destaque: "Basílica de São Pedro e museus do Vaticano" },
  { data: "2027-03-27", titulo: "Voo para Split", cidade: "Split", destaque: "Voo Roma–Split e retirada do carro" },
  { data: "2027-03-28", titulo: "Split", cidade: "Split", destaque: "Palácio de Diocleciano, Riva e Marjan" },
  { data: "2027-03-29", titulo: "Para Dubrovnik", cidade: "Dubrovnik", destaque: "Deslocamento de carro até Dubrovnik" },
  { data: "2027-03-30", titulo: "Dubrovnik", cidade: "Dubrovnik", destaque: "Muralhas, Stradun e Monte Srđ" },
  { data: "2027-03-31", titulo: "Para Kotor", cidade: "Kotor", destaque: "Deslocamento para Montenegro" },
  { data: "2027-04-01", titulo: "Kotor → Mostar", cidade: "Mostar", destaque: "Perast de manhã e viagem para a Bósnia" },
  { data: "2027-04-02", titulo: "Mostar → Plitvice", cidade: "Plitvice", destaque: "Stari Most, centro histórico e estrada até Plitvice" },
  { data: "2027-04-03", titulo: "Plitvice → Zagreb", cidade: "Zagreb", destaque: "Lagos Plitvice e viagem para Zagreb" },
  { data: "2027-04-04", titulo: "Zagreb", cidade: "Zagreb", destaque: "Centro histórico e atrações principais" },
  { data: "2027-04-05", titulo: "Retorno", cidade: "Zagreb", destaque: "Devolução do carro e voo de volta ao Brasil" },
];

export const VIAJANTES = [
  { nome: "Ana Paula", papel: "Organizadora", cor: "#1e2a4a", iniciais: "AP" },
  { nome: "Bruno", papel: "Editor", cor: "#c06b4a", iniciais: "BR" },
  { nome: "Carla", papel: "Editora", cor: "#c4a35a", iniciais: "CA" },
  { nome: "Diego", papel: "Leitor", cor: "#3a6b8a", iniciais: "DI" },
];

export const ESTADOS_RESERVA = [
  { id: "planejado", label: "Planejado", cor: "#94a3b8" },
  { id: "pesquisado", label: "Pesquisado", cor: "#c4a35a" },
  { id: "reservado", label: "Reservado", cor: "#3a6b8a" },
  { id: "pago", label: "Pago", cor: "#1e7d4f" },
  { id: "cancelado", label: "Cancelado", cor: "#c0392b" },
];

export const RESERVAS = [
  { tipo: "hotel", nome: "Hotel Colosseum", cidade: "Roma", estado: "pesquisado", preco: 120, moeda: "EUR", nota: 4.3, dataCotacao: "2026-10-15", fonte: "Booking.com" },
  { tipo: "hotel", nome: "Hotel Split Center", cidade: "Split", estado: "planejado", preco: 95, moeda: "EUR", nota: 4.1, dataCotacao: "2026-10-15", fonte: "Booking.com" },
  { tipo: "hotel", nome: "Old Town Dubrovnik", cidade: "Dubrovnik", estado: "planejado", preco: 110, moeda: "EUR", nota: 4.5, dataCotacao: "2026-10-15", fonte: "Hotels.com" },
  { tipo: "voo", nome: "Salvador → Roma (FCO)", cidade: "Roma", estado: "pesquisado", preco: 4200, moeda: "BRL", dataCotacao: "2026-10-12", fonte: "Google Flights" },
  { tipo: "voo", nome: "Roma → Split (SPU)", cidade: "Split", estado: "planejado", preco: 85, moeda: "EUR", dataCotacao: "2026-10-12", fonte: "Croatia Airlines" },
  { tipo: "carro", nome: "Carro alugado (Split→Zagreb)", cidade: "Split", estado: "planejado", preco: 38, moeda: "EUR", dataCotacao: "2026-10-12", fonte: "Rentalcars" },
];

export const CAMBIO = { taxa: 5.45, moedaBase: "BRL", data: "2026-10-15", fonte: "Banco Central do Brasil" };

export const ORCAMENTO = {
  categorias: [
    { nome: "Voos", previsto: 16800, pago: 0, moeda: "BRL" },
    { nome: "Hotéis", previsto: 1450, pago: 0, moeda: "EUR" },
    { nome: "Carro", previsto: 420, pago: 0, moeda: "EUR" },
    { nome: "Alimentação", previsto: 1300, pago: 0, moeda: "EUR" },
    { nome: "Atrações", previsto: 380, pago: 0, moeda: "EUR" },
    { nome: "Extras", previsto: 300, pago: 0, moeda: "EUR" },
  ],
};

export const CHECKLIST_BASE = [
  { item: "Passaporte válido (validade mínima 6 meses)", categoria: "Documentos" },
  { item: "Visto Schengen (se necessário)", categoria: "Documentos" },
  { item: "Seguro-viagem (cobertura Schengen €30.000)", categoria: "Seguros" },
  { item: "Habilitação Internacional (PID)", categoria: "Documentos" },
  { item: "Carta verde do carro", categoria: "Carro" },
  { item: "Autorização para cruzar fronteiras", categoria: "Carro" },
  { item: "Comprovante de hospedagem", categoria: "Documentos" },
  { item: "Cartões de crédito internacionais", categoria: "Finanças" },
  { item: "Cópias digitais dos documentos", categoria: "Documentos" },
];

export function diasAte(dataStr) {
  const alvo = new Date(dataStr + "T00:00:00");
  const agora = new Date();
  return Math.ceil((alvo - agora) / (1000 * 60 * 60 * 24));
}

export function formatarData(dataStr, estilo = "curto") {
  const d = new Date(dataStr + "T00:00:00");
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const mesesLongo = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const diasSemana = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  if (estilo === "curto") return `${d.getDate()} ${meses[d.getMonth()]}`;
  if (estilo === "dia") return diasSemana[d.getDay()];
  return `${d.getDate()} de ${mesesLongo[d.getMonth()]} de ${d.getFullYear()}`;
}