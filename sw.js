/* الخدمة اليومية — Service Worker (v2.0)
   غيّر VERSION مع كل إصدار (وفي js/version.js).
   v1.2: تحديث آمن —
   - كل ملفات الصدفة (index + css + js + manifest + أيقونات) في كاش واحد بنسخة واحدة، فلا تلتقي صفحة جديدة بملفات قديمة.
   - الـSW الجديد يُحمِّل نسخته كاملة في الخلفية ثم ينتظر. لا skipWaiting تلقائي: التفعيل بطلب من الصفحة (js/update.js)
     بعد التأكد أن لا مسابقة قيد الحل ولا بيانات غير مرفوعة. */
const VERSION = 'v3.0.10';
const CACHE = 'ds-' + VERSION;
const BOOKS = 'ds-books-v1';              // v1.4: نصوص القراءة (books/) — كاش مستقل لا يُمسح عند تغيّر VERSION
const FONTS = 'ds-fonts-v1';              // خطوط محلية (fonts/): كاش مستقل لا يُمسح عند تغيّر VERSION
const SCOPE = self.registration.scope;    // ينتهي بـ /
const INDEX = SCOPE + 'index.html';

/* أساسي: لو فشل أي ملف منها يفشل التثبيت كله ويبقى الـSW القديم (تحديث كامل أو لا شيء) */
const CORE = [
  './', 'index.html', 'manifest.json',
  'css/app.css', 'css/chmap.css',
  'js/version.js', 'js/config.js', 'js/supa.js', 'js/auth.js', 'js/sync.js', 'js/books.js', 'js/xlsx-lite.js', 'js/app.js', 'js/admin15.js', 'js/admin16.js', 'js/admin20.js', 'js/admin21.js', 'js/quiz3.js', 'js/chmap.js', 'js/chmap-logic.js', 'js/update.js', 'js/pwa.js'
];
/* ثانوي: فشله لا يوقف التثبيت */
const EXTRA = ['icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(CORE.map((u) => c.add(new Request(u, { cache: 'reload' }))));
    await Promise.allSettled(EXTRA.map((u) => c.add(new Request(u, { cache: 'reload' }))));
  })());
  /* لا self.skipWaiting() هنا — مقصود (يُطلب بالرسالة أدناه). */
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('ds-') && k !== CACHE && k !== FONTS && k !== BOOKS).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* الصفحة تطلب التفعيل بعد التحقق من أمانه */
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

const isFont = (u) => u.origin === location.origin && /\/fonts\/[^/]+\.(woff2?|ttf|otf)$/i.test(u.pathname);
const isBooks = (u) => u.origin === location.origin && /\/books\/[^/]+\.json$/i.test(u.pathname);
const isStatic = (u) => u.origin === location.origin && /\/(css|js|icons)\/|\/manifest\.json$/.test(u.pathname);
const isIndex = (req, u) =>
  req.mode === 'navigate' ||
  (u.origin === location.origin && (u.pathname === new URL(SCOPE).pathname || /\/index\.html$/.test(u.pathname)));

/* cache-first من كاش النسخة الحالية (ignoreSearch يطابق ?v=1.6 مع المخزَّن) */
async function fromShell(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok && res.type !== 'opaque') cache.put(req, res.clone());
  return res;
}

/* التنقّل: الصفحة من كاش النسخة (متطابقة مع css/js)، وإن لم توجد فالشبكة */
async function navigation(req) {
  const cache = await caches.open(CACHE);
  const hit = (await cache.match(req, { ignoreSearch: true })) || (await cache.match(INDEX)) || (await cache.match(SCOPE));
  if (hit) return hit;
  return fetch(req);
}

/* الخطوط المحلية: cache-first في كاش مستقل */
async function fontFirst(req) {
  const cache = await caches.open(FONTS);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok) cache.put(req, res.clone());
  return res;
}

/* v1.4: نصوص القراءة books/ (تُحمَّل عند الطلب).
   - index.json: الشبكة أولًا (مهلة ٤ ثوانٍ) ثم آخر نسخة مخزَّنة، فيصل أي سفر جديد/رقم rev جديد للمتصل ويبقى العمل أوفلاين.
   - <id>.json?r=N: cache-first بالرابط كاملًا (الرقم N يتغيّر مع كل تعديل للنص)، ونحذف الإصدارات الأقدم من نفس الملف. */
async function booksIndex(req) {
  const cache = await caches.open(BOOKS);
  try {
    const res = await Promise.race([
      fetch(req, { cache: 'no-store' }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))
    ]);
    if (res && res.ok) { cache.put(req, res.clone()); return res; }
    const hit = await cache.match(req);
    return hit || res;
  } catch (err) {
    const hit = await cache.match(req);
    if (hit) return hit;
    throw err;
  }
}
async function booksFile(req) {
  const cache = await caches.open(BOOKS);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok) {
    const path = new URL(req.url).pathname;
    const keys = await cache.keys();
    await Promise.all(keys.filter((k) => new URL(k.url).pathname === path && k.url !== req.url).map((k) => cache.delete(k)));
    cache.put(req, res.clone());
  }
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (isFont(u)) { e.respondWith(fontFirst(req)); return; }
  if (isBooks(u)) { e.respondWith(/\/index\.json$/i.test(u.pathname) ? booksIndex(req) : booksFile(req)); return; }
  if (isIndex(req, u)) { e.respondWith(navigation(req)); return; }
  if (isStatic(u)) { e.respondWith(fromShell(req)); return; }
});
