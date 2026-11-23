'use strict';
/* الخدمة اليومية v1.4 — تحميل نصوص القراءة عند الطلب (lazy) من مجلد books/.
   - books/index.json: قائمة الأسفار وأقسامها (عناوين فقط، صغير) — يُحمَّل عند أول فتح لتبويب القراءة.
   - books/<id>.json: نص السفر كله، يُحمَّل عند أول اختيار له، ثم يُخزَّن (كاش الـService Worker ds-books-v1 + الذاكرة).
   - بلا اتصال: ما سبق تحميله يعمل، وغيره يرجع خطأ 'OFFLINE' ليعرض app.js رسالة مناسبة.
   الواجهة: Books.index() · Books.load(id) · Books.chapterTitle(id, n) · Books.reset() (للاختبار). */
var Books = (function () {
  var BASE = 'books/';
  var indexP = null, loading = {}, mem = {};

  function getJson(url, opts) {
    return fetch(url, opts || {}).then(function (r) {
      if (!r.ok) { var e = new Error('HTTP ' + r.status); e.code = r.status === 404 ? 'MISSING' : 'HTTP'; throw e; }
      return r.json();
    }, function () { var e = new Error('offline'); e.code = 'OFFLINE'; throw e; });
  }
  function validIndex(d) {
    return d && typeof d === 'object' && Array.isArray(d.books) && d.books.every(function (b) {
      return b && typeof b.id === 'string' && /^[a-z][a-z0-9_-]{1,40}$/.test(b.id) && typeof b.title === 'string' && Array.isArray(b.sections);
    });
  }
  function validBook(d, id) {
    if (!d || typeof d !== 'object' || d.id !== id || !d.chapters || typeof d.chapters !== 'object') return false;
    return Object.keys(d.chapters).every(function (k) {
      var c = d.chapters[k];
      return /^[0-9]{1,3}$/.test(k) && c && typeof c.title === 'string' && Array.isArray(c.verses) && c.verses.every(function (v) { return typeof v === 'string'; });
    });
  }

  function index() {
    if (!indexP) {
      indexP = getJson(BASE + 'index.json').then(function (d) {
        if (!validIndex(d)) { var e = new Error('bad index'); e.code = 'BAD'; throw e; }
        return d;
      });
      indexP.catch(function () { indexP = null; });   // لا نخزّن الفشل: المحاولة التالية تعيد الطلب
    }
    return indexP;
  }

  function load(id) {
    if (mem[id]) return Promise.resolve(mem[id]);
    if (loading[id]) return loading[id];
    var p = index().then(function (ix) {
      var b = ix.books.filter(function (x) { return x.id === id; })[0];
      if (!b) { var e = new Error('missing'); e.code = 'MISSING'; throw e; }
      var file = String(b.file || (id + '.json'));
      if (!/^[a-z0-9_-]+\.json$/i.test(file)) { var e2 = new Error('bad file'); e2.code = 'BAD'; throw e2; }
      return getJson(BASE + file + '?r=' + encodeURIComponent(String(b.rev || 1)));
    }).then(function (d) {
      if (!validBook(d, id)) { var e = new Error('bad book'); e.code = 'BAD'; throw e; }
      mem[id] = d;
      return d;
    });
    loading[id] = p;
    var done = function () { delete loading[id]; };
    p.then(done, done);
    return p;
  }

  return {
    index: index, load: load,
    reset: function () { indexP = null; loading = {}; mem = {}; }
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Books;
