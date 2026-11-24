'use strict';
/* الخدمة اليومية v1.6 — تحميل نصوص القراءة عند الطلب (lazy) من مجلد books/ بالصيغة الجديدة الوحيدة.
   - books/index.json: { rev, books: [ { id, title, testament?, rev?, kind? } ] } — لا sections ولا file.
   - books/<id>.json: { id, title, testament?, kind?, titles?, chapters: [ { n, verses: [ [رقم, نص], ... ] } ] }
   - الصيغة القديمة (chapters ككائن) تُرفض بالخطأ BAD، بلا fallback.
   - Books.load(id) يحوّل داخليًا إلى الشكل الذي يستعمله app.js:
       { id, title, kind, testament, chapters: { "n": { title, verses: [نصوص] } }, sections: [ { n, title } ] }
   الواجهة: index() · load(id) · sections(id) · inspect(id) · chapterTitle(id, n) · reset() */
var Books = (function () {
  var BASE = 'books/';
  var ID_RE = /^[a-z][a-z0-9_-]{1,40}$/;
  var indexP = null, loading = {}, mem = {};

  function getJson(url, opts) {
    return fetch(url, opts || {}).then(function (r) {
      if (!r.ok) { var e = new Error('HTTP ' + r.status); e.code = r.status === 404 ? 'MISSING' : 'HTTP'; throw e; }
      return r.json();
    }, function () { var e = new Error('offline'); e.code = 'OFFLINE'; throw e; });
  }
  function bad(msg) { var e = new Error(msg || 'bad'); e.code = 'BAD'; return e; }
  function toAr(n) { return String(n).replace(/[0-9]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }); }

  function validIndex(d) {
    return !!d && typeof d === 'object' && Array.isArray(d.books) && d.books.every(function (b) {
      return b && typeof b.id === 'string' && ID_RE.test(b.id) && typeof b.title === 'string' && b.title.length >= 1 && b.title.length <= 80 &&
        (b.testament == null || b.testament === 'ot' || b.testament === 'nt') &&
        (b.kind == null || b.kind === 'bible' || b.kind === 'agpeya') &&
        (b.rev == null || (typeof b.rev === 'number' && isFinite(b.rev)));
    });
  }
  function validBook(d, id) {
    if (!d || typeof d !== 'object' || d.id !== id || typeof d.title !== 'string' || !Array.isArray(d.chapters)) return false;
    if (d.kind != null && d.kind !== 'bible' && d.kind !== 'agpeya') return false;
    if (d.testament != null && d.testament !== 'ot' && d.testament !== 'nt') return false;
    var seen = {};
    return d.chapters.every(function (c) {
      if (!c || typeof c !== 'object' || !Number.isInteger(c.n) || c.n < 1 || c.n > 400 || seen[c.n]) return false;
      seen[c.n] = 1;
      return Array.isArray(c.verses) && c.verses.every(function (v) { return Array.isArray(v) && Number.isInteger(v[0]) && typeof v[1] === 'string'; });
    });
  }
  function secTitle(d, n) {
    var t = d.titles && typeof d.titles === 'object' ? d.titles[String(n)] : null;
    if (typeof t === 'string' && t) return t;
    return (d.kind === 'agpeya' ? 'الصلاة ' : 'الأصحاح ') + toAr(n);
  }
  /* الشكل الداخلي. الأقسام مرتبة بالرقم، والآيات تُعرض بترتيب القائمة. */
  function convert(d) {
    var kind = d.kind || 'bible', chapters = {}, sections = [];
    d.chapters.slice().sort(function (a, b) { return a.n - b.n; }).forEach(function (c) {
      var title = secTitle({ titles: d.titles, kind: kind }, c.n);
      chapters[String(c.n)] = { title: title, verses: c.verses.map(function (v) { return v[1]; }) };
      sections.push({ n: c.n, title: title });
    });
    return { id: d.id, title: d.title, kind: kind, testament: d.testament || null, chapters: chapters, sections: sections };
  }

  function index() {
    if (!indexP) {
      indexP = getJson(BASE + 'index.json').then(function (d) {
        if (!validIndex(d)) throw bad('bad index');
        d.books = d.books.map(function (b) { return Object.assign({}, b, { kind: b.kind || 'bible' }); });
        return d;
      });
      indexP.catch(function () { indexP = null; });   // لا نخزّن الفشل: المحاولة التالية تعيد الطلب
    }
    return indexP;
  }

  /* يجلب ملف السفر الخام ويتحقق منه (بلا تخزين). noCache=true يتجاوز كاش المتصفح (للتسجيل الجماعي). */
  function fetchBook(id, noCache) {
    return index().then(function (ix) {
      var b = ix.books.filter(function (x) { return x.id === id; })[0];
      if (!b) { var e = new Error('missing'); e.code = 'MISSING'; throw e; }
      return getJson(BASE + id + '.json?r=' + encodeURIComponent(String(b.rev || 1)), noCache ? { cache: 'no-store' } : {});
    }).then(function (d) {
      if (!validBook(d, id)) throw bad('bad book');
      return d;
    });
  }

  function load(id) {
    if (mem[id]) return Promise.resolve(mem[id]);
    if (loading[id]) return loading[id];
    var p = fetchBook(id).then(function (d) { var b = convert(d); mem[id] = b; return b; });
    loading[id] = p;
    var done = function () { delete loading[id]; };
    p.then(done, done);
    return p;
  }

  function sections(id) { return load(id).then(function (b) { return b.sections.slice(); }); }

  /* يفحص ملفًا ويعيد تقريرًا بلا تخزينه في الذاكرة: { id, title, kind, testament, count, ok, problems[] } */
  function inspect(id) {
    return fetchBook(id, true).then(function (d) {
      var ns = d.chapters.map(function (c) { return c.n; }).sort(function (a, b) { return a - b; });
      var problems = [];
      if (!ns.length) problems.push('لا توجد أقسام');
      for (var i = 0; i < ns.length; i++) if (ns[i] !== i + 1) { problems.push('أرقام الأقسام غير متتابعة (متوقع ' + (i + 1) + ' وجاء ' + ns[i] + ')'); break; }
      d.chapters.forEach(function (c) {
        if (!c.verses.length) problems.push('القسم ' + c.n + ' بلا آيات');
        else if (c.verses.some(function (v) { return !v[1].trim(); })) problems.push('القسم ' + c.n + ' فيه آية فاضية');
      });
      return { id: id, title: d.title, kind: d.kind || 'bible', testament: d.testament || null, count: ns.length, ok: problems.length === 0, problems: problems.slice(0, 5) };
    }).catch(function (e) {
      var msg = e && e.code === 'MISSING' ? 'الملف غير موجود' : e && e.code === 'BAD' ? 'الصيغة غير صالحة (أو الصيغة القديمة)' : e && e.code === 'OFFLINE' ? 'لا يوجد اتصال' : 'تعذّر تحميل الملف';
      return { id: id, ok: false, count: 0, problems: [msg] };
    });
  }

  function chapterTitle(id, n) { return mem[id] && mem[id].chapters[String(n)] ? mem[id].chapters[String(n)].title : null; }

  return {
    index: index, load: load, sections: sections, inspect: inspect, chapterTitle: chapterTitle,
    reset: function () { indexP = null; loading = {}; mem = {}; }
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Books;
