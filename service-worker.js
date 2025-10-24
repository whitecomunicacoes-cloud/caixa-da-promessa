const CACHE_NAME = 'caixa-promessa-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/pwa_manifest.json',
  '/harp_music.mp3',
  '/caixa_abrindo.mp4',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/promessas_espiritual.json',
  '/promessas_familia.json',
  '/promessas_saude.json',
  '/promessas_negocios.json',
  '/promessas_dinheiro.json'
  '/service-worker.js'
];

// Instalação - Cache dos recursos essenciais
self.addEventListener('install', (event) => {
  console.log('🔄 Service Worker instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Cache aberto - Adicionando recursos:', urlsToCache);
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('❌ Erro no cache:', error);
      })
  );
  self.skipWaiting();
});

// Ativação - Limpeza de caches antigos
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker ativando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - Estratégia Cache First
self.addEventListener('fetch', (event) => {
  // Só interceptar requisições GET do mesmo origin
  if (event.request.method === 'GET' && event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          // Retorna do cache se existir
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Se não estiver em cache, busca na rede e adiciona ao cache
          return fetch(event.request)
            .then((networkResponse) => {
              // Só cachear respostas válidas
              if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, responseToCache);
                  });
              }
              return networkResponse;
            })
            .catch(() => {
              // Fallback para página offline se necessário
              if (event.request.destination === 'document') {
                return caches.match('/index.html');
              }
            });
        })
    );
  }
});

// Mensagem para atualizar o app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});