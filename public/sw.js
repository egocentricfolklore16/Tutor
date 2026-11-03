/* Hyper Tutor Service Worker for PWA & Web Push Notifications */

const CACHE_NAME = 'hyper-tutor-shell-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/logo.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-192.png',
  '/icons/badge-72.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignored
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return null;
          })
        )
      )
    ])
  );
});

// Fetch handler: Never cache Supabase, Groq/AI, or Paystack requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Explicitly NEVER cache API / external service endpoints
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('groq.com') ||
    url.hostname.includes('paystack.co') ||
    url.pathname.startsWith('/functions/v1') ||
    url.pathname.startsWith('/rest/v1') ||
    url.pathname.startsWith('/auth/v1')
  ) {
    return;
  }

  // Handle navigate / static asset requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // Network-first with cache fallback for static assets
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Push Notification Handler
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Hyper Tutor',
    body: 'You have a new update in Hyper Tutor.',
    url: '/community/chat',
    tag: 'general-notification',
    icon: '/icons/icon-192.png',
  };

  if (event.data) {
    try {
      const data = event.data.json();
      payload = {
        title: data.title || payload.title,
        body: data.body || payload.body,
        url: data.url || payload.url,
        tag: data.tag || payload.tag,
        icon: data.icon || payload.icon,
      };
    } catch {
      try {
        const text = event.data.text();
        if (text) payload.body = text;
      } catch {
        // Fallback
      }
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: payload.tag,
    renotify: true,
    data: {
      url: payload.url,
    },
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Notification Click Handler with Deep Link Focus & Navigation
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  let targetUrl = event.notification.data?.url || '/community/chat';

  try {
    const parsed = new URL(targetUrl, self.location.origin);
    if (parsed.origin !== self.location.origin) {
      targetUrl = '/community/chat';
    } else {
      targetUrl = parsed.pathname + parsed.search + parsed.hash;
    }
  } catch {
    targetUrl = '/community/chat';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. Focus active open window if already open
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          client.postMessage({ type: 'NAVIGATE_NOTIFICATION', url: targetUrl });
          return client.focus();
        }
      }
      // 2. Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGE' });
      }
    })
  );
});
