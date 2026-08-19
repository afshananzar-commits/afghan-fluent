const CACHE_VERSION = 'afghan-fluent-offline-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const CORE_ASSETS = ['/', '/manifest.webmanifest', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png', '/images/coach/farangis-almost.png', '/images/coach/farangis-celebrate.png', '/images/coach/farangis-correct.png', '/images/coach/farangis-explain.png', '/images/coach/farangis-fact.png', '/images/coach/farangis-help.png', '/images/coach/farangis-listen.png', '/images/coach/farangis-think.png', '/images/coach/farangis-tip.png', '/images/coach/farangis-welcome.png'].map(String);
const OFFLINE_ASSETS = ['/apple-touch-icon.png', '/icon-192.png', '/icon-512.png', '/images/coach/farangis-almost.png', '/images/coach/farangis-celebrate.png', '/images/coach/farangis-correct.png', '/images/coach/farangis-explain.png', '/images/coach/farangis-fact.png', '/images/coach/farangis-help.png', '/images/coach/farangis-listen.png', '/images/coach/farangis-think.png', '/images/coach/farangis-tip.png', '/images/coach/farangis-welcome.png', '/images/farangis-coach.png', '/images/game/afghan-backdrop.svg', '/images/game/afghan-city-v10.jpg', '/images/game/afghan-city.jpg', '/images/game/boy-climb.png', '/images/game/boy-idle.png', '/images/game/boy-jump.png', '/images/game/boy-run.png', '/images/game/game-manifest-v13.json', '/images/game/game-manifest-v14.json', '/images/game/girl-climb.png', '/images/game/girl-idle.png', '/images/game/girl-jump.png', '/images/game/girl-run.png', '/images/game/kite.png', '/images/game/kite.svg', '/images/game/watermelon.png', '/images/game/world-01.PNG', '/images/game/world-01.jpg', '/images/game/world-02.jpg', '/images/game/world-03.jpg', '/images/game/world-04.jpg', '/images/game/world-05.jpg', '/images/game/world-06.jpg', '/images/game/world-07.jpg', '/images/game/world-08.jpg', '/images/game/world-09.jpg', '/images/game/world-10.jpg', '/images/game-v7/afghan-rooftops.svg', '/images/game-v7/kite.svg', '/images/game-v7/player-boy.svg', '/images/game-v7/player-girl.svg', '/images/game-v7/watermelon.svg', '/images/game-v8/afghan-backdrop.svg', '/images/game-v8/boy-climb.png', '/images/game-v8/boy-idle.png', '/images/game-v8/boy-jump.png', '/images/game-v8/boy-run.png', '/images/game-v8/girl-climb.png', '/images/game-v8/girl-idle.png', '/images/game-v8/girl-jump.png', '/images/game-v8/girl-run.png', '/images/game-v8/kite.png', '/images/game-v8/kite.svg', '/images/game-v8/watermelon.png', '/images/words/001.png', '/images/words/002.png', '/images/words/003.png', '/images/words/004.png', '/images/words/005.png', '/images/words/006.png', '/images/words/007.png', '/images/words/008.png', '/images/words/009.png', '/images/words/010.png', '/images/words/011.png', '/images/words/012.png', '/images/words/013.png', '/images/words/014.png', '/images/words/015.png', '/images/words/016.png', '/images/words/017.png', '/images/words/018.png', '/images/words/019.png', '/images/words/020.png', '/images/words/022.png', '/images/words/023.png', '/images/words/024.png', '/images/words/025.png', '/images/words/026.png', '/images/words/027.png', '/images/words/028.png', '/images/words/029.png', '/images/words/030.png', '/images/words/031.png', '/images/words/032.png', '/images/words/033.png', '/images/words/034.png', '/images/words/035.png', '/images/words/036.png', '/images/words/037.png', '/images/words/038.png', '/images/words/039.png', '/images/words/040.png', '/images/words/041.png', '/images/words/042.png', '/images/words/043.png', '/images/words/044.png', '/images/words/045.png', '/images/words/046.png', '/images/words/047.png', '/images/words/048.png', '/images/words/049.png', '/images/words/050.png', '/images/words/051.png', '/images/words/052.png', '/images/words/053.png', '/images/words/054.png', '/images/words/055.png', '/images/words/056.png', '/images/words/057.png', '/images/words/058.png', '/images/words/059.png', '/images/words/060.png', '/images/words/061.png', '/images/words/062.png', '/images/words/063.png', '/images/words/064.png', '/images/words/065.png', '/images/words/066.png', '/images/words/067.png', '/images/words/068.png', '/images/words/069.png', '/images/words/070.png', '/images/words/071.png', '/images/words/072.png', '/images/words/073.png', '/images/words/074.png', '/images/words/075.png', '/images/words/076.png', '/images/words/077.png', '/images/words/078.png', '/images/words/079.png', '/images/words/080.png', '/images/words/081.png', '/images/words/082.png', '/images/words/083.png', '/images/words/084.png', '/images/words/085.png', '/images/words/086.png', '/images/words/087.png', '/images/words/088.png', '/images/words/089.png', '/images/words/090.png', '/images/words/091.png', '/images/words/092.png', '/images/words/093.png', '/images/words/094.png', '/images/words/095.png', '/images/words/096.png', '/images/words/097.png', '/images/words/098.png', '/images/words/099.png', '/images/words/100.png', '/manifest.webmanifest'].map(String);

async function cacheOne(cache, url) {
  try {
    const req = new Request(url, { cache: 'reload' });
    const res = await fetch(req);
    if (res && res.ok) {
      await cache.put(url, res.clone());
      return true;
    }
  } catch (_) {}
  return false;
}

async function cacheSequential(cache, urls) {
  for (const url of [...new Set(urls)]) {
    await cacheOne(cache, url);
  }
}

async function cacheBuiltAssets(cache) {
  try {
    const response = await fetch(new Request('/', { cache: 'reload' }));
    if (!response.ok) return;
    await cache.put('/', response.clone());
    const html = await response.text();
    const urls = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
      .map(match => match[1])
      .filter(url => url.startsWith('/') && !url.startsWith('/api/'));
    await cacheSequential(cache, urls);
  } catch (_) {}
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    // Eerst de app-shell en alle Farangis-afbeeldingen. Zo zijn de belangrijkste
    // schermen direct compleet in vliegtuigmodus.
    await cacheSequential(cache, CORE_ASSETS);
    await cacheBuiltAssets(cache);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([STATIC_CACHE, RUNTIME_CACHE]);
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => !keep.has(key)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

// De app stuurt dit bericht na een online start. We cachen dan alle lokale
// afbeeldingen die daadwerkelijk in public staan. Dit is betrouwbaarder op iOS
// dan honderden bestanden tijdens de install-event proberen te downloaden.
self.addEventListener('message', event => {
  if (event.data?.type !== 'CACHE_OFFLINE_ASSETS') return;
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cacheSequential(cache, OFFLINE_ASSETS);
    await cacheBuiltAssets(cache);
    event.source?.postMessage?.({ type: 'OFFLINE_ASSETS_CACHED', version: CACHE_VERSION });
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        if (fresh.ok) {
          const cache = await caches.open(STATIC_CACHE);
          await cache.put('/', fresh.clone());
        }
        return fresh;
      } catch (_) {
        return (await caches.match('/', { ignoreSearch: true })) || Response.error();
      }
    })());
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      // Gebruik pathname + ignoreSearch zodat Vite/iOS querystrings op afbeeldingen
      // niet voorkomen dat een reeds gecachte afbeelding wordt gevonden.
      const cached = await caches.match(url.pathname, { ignoreSearch: true });
      if (cached) return cached;
      try {
        const fresh = await fetch(request);
        if (fresh.ok) {
          const cache = await caches.open(RUNTIME_CACHE);
          await cache.put(url.pathname, fresh.clone());
        }
        return fresh;
      } catch (_) {
        return Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    try {
      const fresh = await fetch(request);
      if (fresh.ok || fresh.type === 'opaque') {
        const cache = await caches.open(RUNTIME_CACHE);
        await cache.put(request, fresh.clone());
      }
      return fresh;
    } catch (_) {
      return (await caches.match(request, { ignoreSearch: true })) || Response.error();
    }
  })());
});
