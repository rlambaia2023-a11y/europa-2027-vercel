// Service worker simples: mantém o app abrindo sem conexão.
// Somente recursos do próprio app; nada de dados privados em cache.
const CACHE = "hmma-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

async function guardar(request, response) {
  try {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  } catch {
    // ignora falhas de cache
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/functions/") || url.pathname.startsWith("/api/")) return;

  event.respondWith((async () => {
    try {
      const resposta = await fetch(request);
      if (resposta && resposta.ok) guardar(request, resposta);
      return resposta;
    } catch {
      const salvo = (await caches.match(request)) || (await caches.match("/"));
      if (salvo) return salvo;
      return new Response("Sem conexão", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
  })());
});
