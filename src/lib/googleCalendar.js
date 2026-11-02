// Gera um link "adicionar ao Google Calendar" para um dia do roteiro.
// Cria um evento de dia inteiro com a programação completa (horários inclusos) na descrição.
export function buildDayCalendarUrl(dia, atividades) {
  const start = dia.data.replace(/-/g, "");
  const endDate = new Date(dia.data + "T00:00:00");
  endDate.setDate(endDate.getDate() + 1);
  const end = endDate.toISOString().slice(0, 10).replace(/-/g, "");

  const schedule = [...(atividades || [])]
    .sort((a, b) => (a.horario || "99:99").localeCompare(b.horario || "99:99"))
    .map((a) => {
      const time = a.horario ? `${a.horario} - ` : "";
      let block = `${time}${a.nome}`;
      if (a.endereco) block += `\nEnd.: ${a.endereco}`;
      const meta = [];
      if (a.tempo_visita) meta.push(`Visita: ${a.tempo_visita}`);
      if (a.deslocamento) meta.push(`Desloc.: ${a.deslocamento}`);
      if (meta.length) block += `\n${meta.join(" · ")}`;
      return block;
    })
    .join("\n\n");

  const details = [dia.destaque, schedule].filter(Boolean).join("\n\n---\n\n");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Europa 2027 - ${dia.titulo}`,
    dates: `${start}/${end}`,
    details,
    location: dia.cidade || "",
  });

  return `https://www.google.com/calendar/render?${params.toString()}`;
}