const CACHE_NAME = 'smart-kitchen-v1';
const OFFLINE_PAGES = ['/dashboard', '/pantry', '/recipes', '/chat', '/collections', '/preferences'];

const urlsToCache = [
  ...OFFLINE_PAGES,
  '/',
  '/login',
  '/register',
  '/manifest.json',
];

// Install event - cache all essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Failed to cache during install:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache first, then network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip non-HTTP(S) requests (chrome-extension, etc.)
  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Skip API calls and external URLs
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('themealdb.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request because it's a stream
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then((response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response because it's a stream
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.log('Fetch failed, serving offline page:', error);
            // Serve offline fallback for navigation requests
            if (event.request.destination === 'document') {
              return caches.match('/dashboard');
            }
          });
      })
  );
});

// Background sync for shopping list items added offline
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-shopping-list') {
    event.waitUntil(syncShoppingList());
  }
});

async function syncShoppingList() {
  // This would sync any offline shopping list changes
  // For now, it's a placeholder for future enhancement
  console.log('Syncing shopping list...');
}

// Push notifications for expiring items
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Smart Kitchen';
  const options = {
    body: data.body || 'Check your pantry for expiring items!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/pantry')
  );
});
