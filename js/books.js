'use strict';
/* الخدمة اليومية v1.7 — تحميل نصوص القراءة عند الطلب (lazy) من مجلد books/ بصيغتين مقبولتين (Flexible Parser):
   - books/index.json: { rev, books: [ { id, title, testament?, rev?, kind? } ] } — لا sections ولا file.
   - (أ) سفر عادي: { id, title, testament?, kind?, titles?, chapters: [ { n, verses: [ [رقم, نص], ... ] } ] }
   - (ب) أجبية: { title, hours: [ { id, title, sections: [ { title, content } ] } ] } — الساعة = وحدة قراءة، والقسم بعنوانه ونصه.
     لو وُجد chapters وhours معًا يُعتمد chapters. ملف hours يُعامَل kind='agpeya' دائمًا، و id فيه اختياري (لو وُجد لازم يطابق).
   - الصيغة القديمة (chapters ككائن) تُرفض بالخطأ BAD، بلا fallback.
   - Books.load(id) يحوّل داخليًا إلى الشكل الذي يستعمله app.js:
       { id, title, kind, testament, chapters: { "n": { title, verses: [نصوص], blocks?: [ { title, text } ] } }, sections: [ { n, title } ] }
     (blocks موجودة لوحدات الأجبية فقط؛ verses فيها فاضية)
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
  function toAr(n) { return String(n); }   /* v3.0.8: أرقام إنجليزية (الاسم قديم) */

  function validIndex(d) {
    return !!d && typeof d === 'object' && Array.isArray(d.books) && d.books.every(function (b) {
      return b && typeof b.id === 'string' && ID_RE.test(b.id) && typeof b.title === 'string' && b.title.length >= 1 && b.title.length <= 80 &&
        (b.testament == null || b.testament === 'ot' || b.testament === 'nt') &&
        (b.kind == null || b.kind === 'bible' || b.kind === 'agpeya') &&
        (b.rev == null || (typeof b.rev === 'number' && isFinite(b.rev)));
    });
  }
  function isHours(d) { return !!d && !Array.isArray(d.chapters) && Array.isArray(d.hours); }
  function hourNum(h, i) { return Number.isInteger(h && h.id) ? h.id : i + 1; }
  function validHours(d) {
    var seen = {};
    return d.hours.every(function (h, i) {
      var n = hourNum(h, i);
      if (!h || typeof h !== 'object' || n < 1 || n > 400 || seen[n] || typeof h.title !== 'string' || !h.title.trim()) return false;
      seen[n] = 1;
      return Array.isArray(h.sections) && h.sections.length > 0 && h.sections.every(function (s) {
        return s && typeof s === 'object' && typeof s.title === 'string' && typeof s.content === 'string';
      });
    });
  }
  function validBook(d, id) {
    if (!d || typeof d !== 'object' || typeof d.title !== 'string') return false;
    if (isHours(d)) return (d.id === undefined || d.id === id) && validHours(d);
    if (d.id !== id || !Array.isArray(d.chapters)) return false;
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
  function convert(d, id) {
    if (isHours(d)) {
      var hc = {}, hs = [];
      d.hours.map(function (h, i) { return { n: hourNum(h, i), h: h }; }).sort(function (a, b) { return a.n - b.n; }).forEach(function (x) {
        var title = x.h.title.trim();
        hc[String(x.n)] = { title: title, verses: [], blocks: x.h.sections.map(function (s) { return { title: s.title.trim(), text: s.content }; }) };
        hs.push({ n: x.n, title: title });
      });
      return { id: id, title: d.title, kind: 'agpeya', testament: null, chapters: hc, sections: hs };
    }
    var kind = d.kind || 'bible', chapters = {}, sections = [];
    d.chapters.slice().sort(function (a, b) { return a.n - b.n; }).forEach(function (c) {
      var title = secTitle({ titles: d.titles, kind: kind }, c.n);
      chapters[String(c.n)] = { title: title, verses: c.verses.map(function (v) { return v[1]; }), nums: c.verses.map(function (v) { return v[0]; }) };
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
    var p = fetchBook(id).then(function (d) { var b = convert(d, id); mem[id] = b; return b; });
    loading[id] = p;
    var done = function () { delete loading[id]; };
    p.then(done, done);
    return p;
  }

  function sections(id) { return load(id).then(function (b) { return b.sections.slice(); }); }

  /* يفحص ملفًا ويعيد تقريرًا بلا تخزينه في الذاكرة: { id, title, kind, testament, count, ok, problems[] } */
  function inspect(id) {
    return fetchBook(id, true).then(function (d) {
      var hours = isHours(d);
      var ns = hours ? d.hours.map(hourNum).sort(function (a, b) { return a - b; }) : d.chapters.map(function (c) { return c.n; }).sort(function (a, b) { return a - b; });
      var problems = [];
      if (!ns.length) problems.push('لا توجد أقسام');
      for (var i = 0; i < ns.length; i++) if (ns[i] !== i + 1) { problems.push('أرقام الأقسام غير متتابعة (متوقع ' + (i + 1) + ' وجاء ' + ns[i] + ')'); break; }
      if (!hours) d.chapters.forEach(function (c) {
        if (!c.verses.length) problems.push('القسم ' + c.n + ' بلا آيات');
        else if (c.verses.some(function (v) { return !v[1].trim(); })) problems.push('القسم ' + c.n + ' فيه آية فاضية');
      });
      return { id: id, title: d.title, kind: hours ? 'agpeya' : (d.kind || 'bible'), testament: hours ? null : (d.testament || null), count: ns.length, ok: problems.length === 0, problems: problems.slice(0, 5) };
    }).catch(function (e) {
      var msg = e && e.code === 'MISSING' ? 'الملف غير موجود' : e && e.code === 'BAD' ? 'الصيغة غير صالحة (أو الصيغة القديمة)' : e && e.code === 'OFFLINE' ? 'لا يوجد اتصال' : 'تعذّر تحميل الملف';
      return { id: id, ok: false, count: 0, problems: [msg] };
    });
  }

  /* v2.0: مواصفة الآيات: «٤» أو «٤-٥» أو «١,٣-٤». تقبل الأرقام العربية و«،» و«–». ترجع { spec, nums } أو null */
  function parseVerseSpec(spec) {
    var s = String(spec == null ? '' : spec).replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); })
      .replace(/[،؛;]/g, ',').replace(/[–—−]/g, '-').replace(/\s+/g, '');
    if (!/^\d{1,3}(-\d{1,3})?(,\d{1,3}(-\d{1,3})?)*$/.test(s)) return null;
    var nums = [], seen = {}, ok = true;
    s.split(',').forEach(function (tok) {
      var p = tok.split('-'), a = parseInt(p[0], 10), b = p.length > 1 ? parseInt(p[1], 10) : a;
      if (a < 1 || b < a) { ok = false; return; }
      for (var n = a; n <= b; n++) { if (seen[n]) { ok = false; return; } seen[n] = 1; nums.push(n); }
    });
    return ok ? { spec: s, nums: nums } : null;
  }
  function humanSpec(spec) { return toAr(spec.replace(/,/g, '، ').replace(/-/g, ' - ')); }

  /* يستخرج آيات من سفر محمَّل: Promise → { ok:true, book, nums, texts } أو { ok:false, error } (بلا رفض) */
  function pick(id, ch, spec) {
    var ps = parseVerseSpec(spec);
    if (!ps) return Promise.resolve({ ok: false, error: 'صيغة الآيات غير صالحة (مثال: 4 أو 4-5 أو 1،3-4)' });
    return load(id).then(function (b) {
      if (b.kind === 'agpeya') return { ok: false, error: 'الأجبية غير مدعومة في الشواهد' };
      var c = b.chapters[String(ch)];
      if (!c) return { ok: false, error: 'الأصحاح ' + toAr(ch) + ' غير موجود في «' + b.title + '»' };
      var texts = [];
      for (var i = 0; i < ps.nums.length; i++) {
        var at = c.nums.indexOf(ps.nums[i]);
        if (at < 0) return { ok: false, error: 'الآية ' + toAr(ps.nums[i]) + ' غير موجودة في «' + b.title + '» ' + toAr(ch) };
        texts.push(c.verses[at]);
      }
      return { ok: true, book: b.title, spec: ps.spec, label: b.title + ' ' + toAr(ch) + ' : ' + humanSpec(ps.spec), nums: ps.nums, texts: texts };
    }, function (e) {
      return { ok: false, error: e && e.code === 'MISSING' ? 'السفر «' + id + '» غير موجود في الفهرس' : e && e.code === 'BAD' ? 'ملف السفر «' + id + '» غير صالح' : 'تعذّر تحميل السفر «' + id + '»' };
    });
  }
  function release(id) { delete mem[id]; }

  function chapterTitle(id, n) { return mem[id] && mem[id].chapters[String(n)] ? mem[id].chapters[String(n)].title : null; }

  return {
    index: index, load: load, sections: sections, inspect: inspect, chapterTitle: chapterTitle,
    pick: pick, parseVerseSpec: parseVerseSpec, release: release,
    reset: function () { indexP = null; loading = {}; mem = {}; }
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Books;
