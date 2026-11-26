/* Service worker: tumatanggap ng push kahit sarado ang app at nagpapakita ng OTP. */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
importScripts('/config.js');

firebase.initializeApp(self.FIREBASE_CONFIG);
const messaging = firebase.messaging();

// Data-only message ang ipinapadala ng server, kaya tayo ang nagpapakita ng notification.
messaging.onBackgroundMessage(async (payload) => {
  const d = payload.data || {};
  if (!/^\d{6}$/.test(d.otp || '')) return;
  const ts = Number(d.ts) || Date.now();

  // Ipaalam sa mga bukas na window ng app (kung meron).
  const wins = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  wins.forEach((c) => c.postMessage({ type: 'otp', otp: d.otp, ts }));

  return self.registration.showNotification('SSS OTP: ' + d.otp, {
    body: 'Valid ng 5 minuto. I-tap para buksan at i-copy.',
    tag: 'sss-otp',
    renotify: true,
    requireInteraction: true,
    data: { otp: d.otp, ts }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  if (!d.otp) return;
  const url = '/?otp=' + encodeURIComponent(d.otp) + '&ts=' + encodeURIComponent(d.ts || '');
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.postMessage({ type: 'otp', otp: d.otp, ts: d.ts });
          return c.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
