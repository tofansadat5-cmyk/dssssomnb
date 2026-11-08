/* Service Worker — دفتر کهاته سلطان: کار آفلاین + آنلاین
   هر وقت index.html را تغییر دادی، عدد VERSION را بالا ببر تا گوشی‌ها نسخهٔ تازه را بگیرند. */
var VERSION = 'kahata-v2';
var SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
var CDN = [
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return Promise.all(
      SHELL.map(function (u) { return c.add(u).catch(function () {}); })
        .concat(CDN.map(function (u) { return c.add(new Request(u, { mode: 'no-cors' })).catch(function () {}); }))
    );
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  /* صفحهٔ اصلی: اول شبکه (نسخهٔ تازه)، اگر نبود از حافظه */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put('./index.html', copy); });
        return res;
      }).catch(function () {
        return caches.match('./index.html').then(function (r) { return r || caches.match('./'); });
      })
    );
    return;
  }

  /* کتابخانهٔ Firebase و فایل‌های همین سایت: اول حافظه، پشت‌صحنه تازه می‌شود */
  var isSdk = url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/') === 0;
  if (isSdk || url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && (res.ok || res.type === 'opaque')) {
            var copy = res.clone();
            caches.open(VERSION).then(function (c) { c.put(req, copy); });
          }
          return res;
        }).catch(function () { return hit; });
        return hit || net;
      })
    );
  }
  /* بقیه (Firestore، ورود گوگل و ...) دست‌نخورده از شبکه می‌روند */
});
