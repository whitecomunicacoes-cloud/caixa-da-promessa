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
  '/promessas_dinheiro.json', // Faltava uma vírgula aqui
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

// ===================================================
// ✨ NOVOS EVENTOS PARA NOTIFICAÇÕES PUSH
// ===================================================

/**
 * Evento 'push'
 * Chamado quando o servidor envia uma notificação push.
 * O 'event.data.json()' é o payload enviado pelo seu servidor.
 */
self.addEventListener('push', (event) => {
  console.log('🔔 Push Recebido!');
  
  let data = { title: 'Sua Promessa Diária', body: 'Deus tem uma nova palavra para você!', icon: 'icon-192x192.png' };
  
  try {
    // Tenta ler o JSON enviado pelo servidor
    const serverData = event.data.json();
    data = { ...data, ...serverData };
  } catch (e) {
    console.warn('Não foi possível ler o payload do push, usando dados padrão.');
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: 'icon-192x192.png', // Ícone para Android
    vibrate: [200, 100, 200],
    data: {
      url: self.location.origin // URL para abrir ao clicar
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/**
 * Evento 'notificationclick'
 * Chamado quando o usuário clica na notificação.
 */
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notificação clicada!');
  
  event.notification.close(); // Fecha a notificação

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Se o app já estiver aberto, foca na janela existente
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Se não estiver aberto, abre uma nova janela
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});