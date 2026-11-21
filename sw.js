/* الخدمة اليومية — Service Worker (v1.1)
   غيّر VERSION مع كل إصدار. لا skipWaiting عمدًا (التحديث الآمن في v1.2). */
const VERSION = 'v1.1';
const CACHE = 'ds-' + VERSION;
const FONTS = 'ds-fonts-v1';              // كاش الخطوط مستقل: لا يُمسح عند تغيّر VERSION
const SCOPE = self.registration.scope;    // ينتهي بـ / (مثال: https://user.github.io/daily-service/)
const ROOT = SCOPE;
const INDEX = SCOPE + 'index.html';
const NAV_TIMEOUT_MS = 5000;              // شبكة بطيئة/متقطعة → نعود للكاش بدل التعليق

const SHELL = [
  './', 'index.html', 'manifest.json',
  'css/app.css',
  'js/version.js', 'js/config.js', 'js/supa.js', 'js/auth.js', 'js/app.js', 'js/pwa.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  /* allSettled: ملف ناقص لا يُفشل التثبيت كله. cache:'reload' يتجاوز كاش المتصفح. */
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.allSettled(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' }))))
    )
  );
  /* لا self.skipWaiting() هنا — مقصود. */
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('ds-') && k !== CACHE && k !== FONTS).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())   // يتحكم في أول زيارة ليعمل أوفلاين فورًا (لا علاقة له بـ skipWaiting)
  );
});

const isFontHost = (u) => u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';
const isStatic = (u) => u.origin === location.origin && /\/(css|js|icons)\/|\/manifest\.json$/.test(u.pathname);
const isIndex = (req, u) =>
  req.mode === 'navigate' ||
  (u.origin === location.origin && (u.pathname === new URL(ROOT).pathname || /\/index\.html$/.test(u.pathname)));

/* stale-while-revalidate: الخطوط */
async function fontsSWR(req) {
  const cache = await caches.open(FONTS);
  const cached = await cache.match(req);
  const net = fetch(req).then((res) => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  }).catch(() => undefined);
  return cached || (await net) || Response.error();
}

/* cache-first: css / js / icons / manifest */
async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok) cache.put(req, res.clone());
  return res;
}

/* network-first مع fallback للكاش: index.html والتنقّل.
   المفتاح في الكاش دائمًا INDEX و ROOT (بدون query) و ignoreSearch يغطي './?source=pwa' بلا شبكة. */
async function indexNetworkFirst(req) {
  const cache = await caches.open(CACHE);
  const net = fetch(req).then((res) => {
    if (res && res.ok && res.type !== 'opaque') {
      cache.put(INDEX, res.clone());
      cache.put(ROOT, res.clone());
    }
    return res;
  });
  const fallback = async () =>
    (await cache.match(req, { ignoreSearch: true })) ||
    (await cache.match(INDEX)) ||
    (await cache.match(ROOT));
  try {
    return await Promise.race([
      net,
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), NAV_TIMEOUT_MS))
    ]);
  } catch (err) {
    const cached = await fallback();
    if (cached) return cached;
    return net;   // لا كاش بعد (أول زيارة): ننتظر الشبكة مهما طالت
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (isFontHost(u)) { e.respondWith(fontsSWR(req)); return; }
  if (isIndex(req, u)) { e.respondWith(indexNetworkFirst(req)); return; }
  if (isStatic(u)) { e.respondWith(cacheFirst(req)); return; }
});
