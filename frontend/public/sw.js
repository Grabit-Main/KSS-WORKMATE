// KSS Workmate - Service Worker for Desktop Push Notifications
// Compliant with W3C Push API and Notification API standards

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 1. Handle incoming Web Push events (for closed-tab push delivery from VAPID push service)
self.addEventListener('push', (event) => {
  let data = {
    title: 'KSS Workmate',
    body: 'You have a new message in Workmate.',
    icon: '/logo.webp',
    badge: '/favicon.ico',
    url: '/collaboration',
    tag: 'workmate-chat'
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      const text = event.data.text();
      if (text) data.body = text;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo.webp',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || `workmate-chat-${Date.now()}`,
    data: {
      url: data.url || '/collaboration',
      conversationId: data.conversationId || null,
      chatType: data.chatType || null
    },
    renotify: true,
    requireInteraction: false,
    vibrate: [150, 80, 150]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 2. Handle notification click: Focus active tab or open a new one and navigate to chat
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) 
    ? event.notification.data.url 
    : '/collaboration';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          client.postMessage({
            type: 'NOTIFICATION_NAVIGATE',
            url: targetUrl,
            data: event.notification.data
          });
          return;
        }
      }
      // If no window is open, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// 3. Handle messages sent from client tabs
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});

