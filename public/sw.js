/* Hyper Tutor Service Worker for Web Push Notifications */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {
    title: 'Hyper Tutor',
    body: 'You have a new notification.',
    url: '/Dashboard',
    tag: 'general-notification',
  };

  if (event.data) {
    try {
      const data = event.data.json();
      payload = {
        title: data.title || payload.title,
        body: data.body || payload.body,
        url: data.url || payload.url,
        tag: data.tag || payload.tag,
      };
    } catch (e) {
      console.warn('Failed to parse push event payload JSON:', e);
      try {
        const text = event.data.text();
        if (text) payload.body = text;
      } catch (err) {
        // Fallback to default
      }
    }
  }

  const options = {
    body: payload.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: payload.tag,
    renotify: false,
    data: {
      url: payload.url,
    },
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  let targetUrl = event.notification.data?.url || '/Dashboard';

  // Ensure targetUrl is relative or same-origin
  try {
    const parsed = new URL(targetUrl, self.location.origin);
    if (parsed.origin !== self.location.origin) {
      targetUrl = '/Dashboard';
    } else {
      targetUrl = parsed.pathname + parsed.search + parsed.hash;
    }
  } catch (err) {
    targetUrl = '/Dashboard';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
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
