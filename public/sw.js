const CACHE_VERSION = 'afghan-fluent-offline-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const CORE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/images/coach/.gitkeep",
  "/images/coach/farangis-almost.png",
  "/images/coach/farangis-celebrate.png",
  "/images/coach/farangis-correct.png",
  "/images/coach/farangis-explain.png",
  "/images/coach/farangis-fact.png",
  "/images/coach/farangis-help.png",
  "/images/coach/farangis-listen.png",
  "/images/coach/farangis-think.png",
  "/images/coach/farangis-tip.png",
  "/images/coach/farangis-welcome.png",
  "/images/farangis-coach.png",
  "/images/game/.gitkeep",
  "/images/game/afghan-backdrop.svg",
  "/images/game/afghan-city-v10.jpg",
  "/images/game/afghan-city.jpg",
  "/images/game/boy-climb.png",
  "/images/game/boy-idle.png",
  "/images/game/boy-jump.png",
  "/images/game/boy-run.png",
  "/images/game/game-manifest-v13.json",
  "/images/game/game-manifest-v14.json",
  "/images/game/girl-climb.png",
  "/images/game/girl-idle.png",
  "/images/game/girl-jump.png",
  "/images/game/girl-run.png",
  "/images/game/kite.png",
  "/images/game/kite.svg",
  "/images/game/watermelon.png",
  "/images/game/world-01.PNG",
  "/images/game/world-01.jpg",
  "/images/game/world-02.jpg",
  "/images/game/world-03.jpg",
  "/images/game/world-04.jpg",
  "/images/game/world-05.jpg",
  "/images/game/world-06.jpg",
  "/images/game/world-07.jpg",
  "/images/game/world-08.jpg",
  "/images/game/world-09.jpg",
  "/images/game/world-10.jpg",
  "/images/game-v7/.gitkeep",
  "/images/game-v7/afghan-rooftops.svg",
  "/images/game-v7/kite.svg",
  "/images/game-v7/player-boy.svg",
  "/images/game-v7/player-girl.svg",
  "/images/game-v7/watermelon.svg",
  "/images/game-v8/.gitkeep",
  "/images/game-v8/afghan-backdrop.svg",
  "/images/game-v8/boy-climb.png",
  "/images/game-v8/boy-idle.png",
  "/images/game-v8/boy-jump.png",
  "/images/game-v8/boy-run.png",
  "/images/game-v8/girl-climb.png",
  "/images/game-v8/girl-idle.png",
  "/images/game-v8/girl-jump.png",
  "/images/game-v8/girl-run.png",
  "/images/game-v8/kite.png",
  "/images/game-v8/kite.svg",
  "/images/game-v8/watermelon.png",
  "/images/words/.gitkeep",
  "/images/words/001.png",
  "/images/words/002.png",
  "/images/words/003.png",
  "/images/words/004.png",
  "/images/words/005.png",
  "/images/words/006.png",
  "/images/words/007.png",
  "/images/words/008.png",
  "/images/words/009.png",
  "/images/words/010.png",
  "/images/words/011.png",
  "/images/words/012.png",
  "/images/words/013.png",
  "/images/words/014.png",
  "/images/words/015.png",
  "/images/words/016.png",
  "/images/words/017.png",
  "/images/words/018.png",
  "/images/words/019.png",
  "/images/words/020.png",
  "/images/words/022.png",
  "/images/words/023.png",
  "/images/words/024.png",
  "/images/words/025.png",
  "/images/words/026.png",
  "/images/words/027.png",
  "/images/words/028.png",
  "/images/words/029.png",
  "/images/words/030.png",
  "/images/words/031.png",
  "/images/words/032.png",
  "/images/words/033.png",
  "/images/words/034.png",
  "/images/words/035.png",
  "/images/words/036.png",
  "/images/words/037.png",
  "/images/words/038.png",
  "/images/words/039.png",
  "/images/words/040.png",
  "/images/words/041.png",
  "/images/words/042.png",
  "/images/words/043.png",
  "/images/words/044.png",
  "/images/words/045.png",
  "/images/words/046.png",
  "/images/words/047.png",
  "/images/words/048.png",
  "/images/words/049.png",
  "/images/words/050.png",
  "/images/words/051.png",
  "/images/words/052.png",
  "/images/words/053.png",
  "/images/words/054.png",
  "/images/words/055.png",
  "/images/words/056.png",
  "/images/words/057.png",
  "/images/words/058.png",
  "/images/words/059.png",
  "/images/words/060.png",
  "/images/words/061.png",
  "/images/words/062.png",
  "/images/words/063.png",
  "/images/words/064.png",
  "/images/words/065.png",
  "/images/words/066.png",
  "/images/words/067.png",
  "/images/words/068.png",
  "/images/words/069.png",
  "/images/words/070.png",
  "/images/words/071.png",
  "/images/words/072.png",
  "/images/words/073.png",
  "/images/words/074.png",
  "/images/words/075.png",
  "/images/words/076.png",
  "/images/words/077.png",
  "/images/words/078.png",
  "/images/words/079.png",
  "/images/words/080.png",
  "/images/words/081.png",
  "/images/words/082.png",
  "/images/words/083.png",
  "/images/words/084.png",
  "/images/words/085.png",
  "/images/words/086.png",
  "/images/words/087.png",
  "/images/words/088.png",
  "/images/words/089.png",
  "/images/words/090.png",
  "/images/words/091.png",
  "/images/words/092.png",
  "/images/words/093.png",
  "/images/words/094.png",
  "/images/words/095.png",
  "/images/words/096.png",
  "/images/words/097.png",
  "/images/words/098.png",
  "/images/words/099.png",
  "/images/words/100.png",
  "/manifest.webmanifest"
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    // Cache de app-shell en alle bestanden uit public. addAll is bewust niet
    // gebruikt: één ontbrekend optioneel bestand mag offline installatie niet breken.
    await Promise.allSettled(CORE_ASSETS.map(url => cache.add(new Request(url, {cache: 'reload'}))));

    // Na een Vite build staan de gehashte JS/CSS-bestanden in /assets/. Lees de
    // gebouwde index en cache die bestanden ook meteen.
    try {
      const response = await fetch(new Request('/', {cache: 'reload'}));
      if (response.ok) {
        await cache.put('/', response.clone());
        const html = await response.text();
        const urls = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
          .map(match => match[1])
          .filter(url => url.startsWith('/') && !url.startsWith('/api/'));
        await Promise.allSettled([...new Set(urls)].map(url => cache.add(new Request(url, {cache: 'reload'}))));
      }
    } catch (_) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([STATIC_CACHE, RUNTIME_CACHE]);
    await Promise.all((await caches.keys()).filter(key => !keep.has(key)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // API/Supabase blijven netwerkfuncties. De app zelf heeft lokale fallbacks
  // voor woorden, zinnen en voortgang en mag dus niet een oude API-response krijgen.
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co')) return;

  // Navigatie: online eerst de nieuwste app, offline terugvallen op de app-shell.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        if (fresh.ok) (await caches.open(STATIC_CACHE)).put('/', fresh.clone());
        return fresh;
      } catch (_) {
        return (await caches.match('/')) || Response.error();
      }
    })());
    return;
  }

  // Zelfde-origin assets: cache-first. Nieuwe bestanden worden tijdens normaal
  // gebruik automatisch toegevoegd, zodat ook later toegevoegde illustraties offline werken.
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const fresh = await fetch(request);
        if (fresh.ok) (await caches.open(RUNTIME_CACHE)).put(request, fresh.clone());
        return fresh;
      } catch (_) {
        return Response.error();
      }
    })());
    return;
  }

  // Externe fonts e.d.: network-first met runtime fallback.
  event.respondWith((async () => {
    try {
      const fresh = await fetch(request);
      if (fresh.ok || fresh.type === 'opaque') (await caches.open(RUNTIME_CACHE)).put(request, fresh.clone());
      return fresh;
    } catch (_) {
      return (await caches.match(request)) || Response.error();
    }
  })());
});
