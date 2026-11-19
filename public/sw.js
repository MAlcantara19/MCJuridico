// Service worker: permite instalar o painel e a área do cliente como app
// e mostra as notificações (etapa do pedido e lembretes de prazo).
// Não guarda nada em cache (sempre busca dados novos).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { titulo: 'Novidade', corpo: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'Novidade no seu pedido', {
    body: d.corpo || '',
    icon: '/icone-192.png',
    badge: '/icone-192.png',
    tag: d.tag || undefined,
    data: { url: d.url || '/' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const alvo = new URL((e.notification.data && e.notification.data.url) || '/', self.location.origin).href;
  e.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of abertas) {
      if (c.url.split('#')[0] === alvo && 'focus' in c) return c.focus();
    }
    return self.clients.openWindow(alvo);
  })());
});
