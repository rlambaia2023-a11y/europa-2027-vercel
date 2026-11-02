// Service worker: deixa o app abrindo e funcionando sem conexão.
// - páginas e código do app: guardados ao abrir (o código novo entra quando há internet)
// - fotos já vistas, mapas e fontes: guardados para reabrir offline
// Os dados (roteiro, despesas…) não passam por aqui: ficam na cópia do aparelho feita pelo app.
const VERSAO = "v2";
const APP = `app-${VERSAO}`;
const FOTOS = `fotos-${VERSAO}`;
const MAPA = `mapa-${VERSAO}`;
const LIMITE_MAPA = 600; // pedaços de mapa guardados (os mais antigos saem)

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(APP).then((c) => c.add("/")).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  const atuais = [APP, FOTOS, MAPA];
  event.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((c) => !atuais.includes(c)).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

async function guardar(nomeCache, chave, resposta) {
  try {
    const cache = await caches.open(nomeCache);
    await cache.put(chave, resposta);
    if (nomeCache === MAPA) {
      const chaves = await cache.keys();
      for (const velha of chaves.slice(0, Math.max(0, chaves.length - LIMITE_MAPA))) await cache.delete(velha);
    }
  } catch {
    // sem espaço: segue sem guardar
  }
}

const serve = (resposta) => resposta && (resposta.ok || resposta.type === "opaque");

// primeiro o guardado; se não tiver, busca e guarda
async function guardadoPrimeiro(nomeCache, request, chave = request) {
  const salvo = await caches.match(chave);
  if (salvo) return salvo;
  const resposta = await fetch(request);
  if (serve(resposta)) guardar(nomeCache, chave, resposta.clone());
  return resposta;
}

// primeiro a rede (para pegar o mais novo); sem rede, o guardado
async function redePrimeiro(request) {
  try {
    const resposta = await fetch(request);
    if (resposta.ok) guardar(APP, request, resposta.clone());
    return resposta;
  } catch {
    const salvo = (await caches.match(request)) || (request.mode === "navigate" ? await caches.match("/") : null);
    if (salvo) return salvo;
    return new Response("Sem conexão", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/api/")) return;
    // arquivos com hash no nome nunca mudam
    if (url.pathname.startsWith("/assets/")) {
      event.respondWith(guardadoPrimeiro(APP, request).catch(() => redePrimeiro(request)));
      return;
    }
    event.respondWith(redePrimeiro(request));
    return;
  }

  // fotos e comprovantes do Supabase: o endereço assinado muda, a foto não — guarda pelo caminho
  if (url.hostname.endsWith(".supabase.co") && url.pathname.includes("/storage/v1/object/")) {
    const chave = new Request(url.origin + url.pathname.replace("/object/sign/", "/object/"));
    event.respondWith(guardadoPrimeiro(FOTOS, request, chave).catch(() => caches.match(chave)));
    return;
  }

  // mapa (OpenStreetMap), fotos das cidades e fontes
  if (/(^|\.)tile\.openstreetmap\.org$/.test(url.hostname)) {
    event.respondWith(guardadoPrimeiro(MAPA, request).catch(() => caches.match(request)));
    return;
  }
  if (request.destination === "image" || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    event.respondWith(guardadoPrimeiro(FOTOS, request).catch(() => caches.match(request)));
  }
});
