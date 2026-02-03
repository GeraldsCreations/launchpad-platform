// Service Worker for Pump Bots PWA
const CACHE_NAME = 'pump-bots-v1';
const RUNTIME_CACHE = 'pump-bots-runtime-v1';

// Assets to cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json'
];

// Install event - cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE)
          .map(cacheName => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API requests - network only (with timeout)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetchWithTimeout(request, 5000)
        .catch(() => new Response(
          JSON.stringify({ error: 'Network request failed' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        ))
    );
    return;
  }

  // Static assets - cache first, then network
  if (request.destination === 'image' || 
      request.destination === 'font' || 
      request.destination === 'style' ||
      request.destination === 'script') {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then(response => {
          // Cache successful responses
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML requests - network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then(response => {
        // Cache successful HTML responses
        if (response.status === 200 && request.destination === 'document') {
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline page if available
            return caches.match('/offline.html');
          });
      })
  );
});

// Helper function for fetch with timeout
function fetchWithTimeout(request, timeout) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error('Request timeout')), timeout);
    
    fetch(request)
      .then(response => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

// Background sync for failed requests
self.addEventListener('sync', event => {
  if (event.tag === 'sync-trades') {
    event.waitUntil(syncPendingTrades());
  }
});

async function syncPendingTrades() {
  // Implement background sync logic for pending trades
  console.log('Syncing pending trades...');
}

// Push notifications
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      { action: 'view', title: 'View' },
      { action: 'close', title: 'Close' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Pump Bots', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
