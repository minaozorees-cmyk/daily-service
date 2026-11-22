'use strict';
/* الخدمة اليومية v1.2 — المزامنة: طابور رفع + سحب دوري + توقيت القاهرة
   - الاتصال عبر Auth (js/auth.js: rpc / get). لا يعتمد على app.js وقت التحميل (يستعمل contestId() وقت التشغيل فقط).
   - الواجهة تقرأ كما كانت من localStorage (مفاتيح ds_v2_*)، وهذا الملف يملؤها من السيرفر ويرفع تغييراتها.
   - كل عملية في الطابور آمنة لإعادة الإرسال (معرّفات uuid + upsert/on conflict في الدوال).
   - الحماية الحقيقية في السيرفر (RLS + دوال SQL)، وليست هنا. */
const Sync = (function () {
  const KEYS = {
    plan: 'ds_v2_plan', schedule: 'ds_v2_schedule', contest: 'ds_v2_contest',
    progress: 'ds_v2_progress', results: 'ds_v2_results', posts: 'ds_v2_posts'
  };
  const K = {
    outbox: 'ds_v2_outbox', meta: 'ds_v2_sync_meta', clock: 'ds_v2_clock', bests: 'ds_v2_bests',
    legacy: 'ds_v2_legacy_v11', ver: 'ds_v2_sync_v', cid: 'ds_v2_server_cid'
  };
  const TASKS = ['reading', 'meditation', 'prayer', 'challenge'];
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const STAFF_GAP = 15000;     // المسؤول/المالك: سحب كل ١٥ ثانية والتطبيق ظاهر (معيار القبول ≤ ٣٠ ثانية)
  const SERVANT_GAP = 60000;   // الخادم: كل دقيقة + عند الفتح والرجوع
  const PAGE = 1000;
  const on = { updated: null, notice: null };

  /* ---------- تخزين ---------- */
  function lraw(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lget(k, fb) { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch (e) { return fb; } }
  function lset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function lsetRaw(k, s) { try { localStorage.setItem(k, s); return true; } catch (e) { return false; } }
  function ldel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function uuid() {
    try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    const b = new Uint8Array(16);
    try { crypto.getRandomValues(b); } catch (e) { for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256); }
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  /* ---------- توقيت القاهرة (الفرق عن السيرفر يُحسب مرة ويُحفظ، فيعمل أوفلاين) ---------- */
  let offset = Number((lget(K.clock, {}) || {}).off) || 0;
  let dtf = null;
  try {
    dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo', hourCycle: 'h23',
      year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'
    });
  } catch (e) { dtf = null; }
  function nowMs() { return Date.now() + offset; }
  function cairoParts(ms) {
    if (dtf) {
      const o = {};
      dtf.formatToParts(new Date(ms)).forEach(function (p) { if (p.type !== 'literal') o[p.type] = parseInt(p.value, 10); });
      return { y: o.year, m: o.month, d: o.day, hh: o.hour === 24 ? 0 : o.hour, mm: o.minute, ss: o.second };
    }
    const d = new Date(ms);
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), hh: d.getHours(), mm: d.getMinutes(), ss: d.getSeconds() };
  }
  /* كائن Date "حقوله المحلية" = ساعة القاهرة الآن (ليعمل كود الواجهة القديم المبني على getDate() وغيرها) */
  function cairoNow() { const p = cairoParts(nowMs()); return new Date(p.y, p.m - 1, p.d, p.hh, p.mm, p.ss); }
  function todayKey() { const p = cairoParts(nowMs()); return p.y + '-' + p.m + '-' + p.d; }
  const pad = function (n) { return (n < 10 ? '0' : '') + n; };
  function keyToIso(k) { const a = String(k).split('-').map(Number); return a[0] + '-' + pad(a[1]) + '-' + pad(a[2]); }
  function isoToKey(s) { const a = String(s).slice(0, 10).split('-').map(Number); return a[0] + '-' + a[1] + '-' + a[2]; }
  let lastClock = 0;
  async function syncClock() {
    const t0 = Date.now();
    const r = await Auth.rpc('server_now', {});
    const t1 = Date.now();
    if (!r.ok || typeof r.data !== 'string') return false;
    const srv = Date.parse(r.data);
    if (isNaN(srv)) return false;
    offset = srv - Math.round((t0 + t1) / 2);
    lset(K.clock, { off: offset, at: t1 });
    lastClock = t1;
    return true;
  }
  function fmtPostDate(iso) {
    try {
      return new Date(iso).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    } catch (e) { return ''; }
  }
  function fmtResultDate(iso) {
    try { return new Date(iso).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }); } catch (e) { return ''; }
  }

  /* ---------- إشعارات للواجهة ---------- */
  let pendingKinds = null;
  function emit(kinds) {
    if (!kinds || !kinds.length) return;
    if (pendingKinds) { kinds.forEach(function (k) { if (pendingKinds.indexOf(k) === -1) pendingKinds.push(k); }); return; }
    pendingKinds = kinds.slice();
    setTimeout(function () {
      const k = pendingKinds; pendingKinds = null;
      try { if (on.updated) on.updated(k); } catch (e) { if (typeof console !== 'undefined') console.warn('Sync.updated', e); }
    }, 0);
  }
  function notice(msg, type) { try { if (on.notice) on.notice(msg, type || ''); } catch (e) {} }

  /* ---------- الطابور ---------- */
  let epoch = 0;        // يزيد مع كل تغيير محلي: يمنع أن يمحو سحبٌ قديم تغييرًا حديثًا
  let hold = false;     // أثناء التهيئة الأولى (رفع الإعدادات قبل النتائج)
  let flushing = false, pulling = false, retryAt = 0, lastPull = 0, initFor = null, started = false;

  function outbox() { const a = lget(K.outbox, []); return Array.isArray(a) ? a : []; }
  function saveOutbox(a) { lset(K.outbox, a); }
  function me() { return Auth.getUser(); }
  function pendingCount() {
    const u = me(); if (!u) return 0;
    return outbox().filter(function (o) { return o.uid === u.id; }).length;
  }
  function opKey(o) {
    if (o.t === 'task') return 't:' + o.day + ':' + o.task;
    if (o.t === 'like') return 'l:' + o.pid;
    if (o.t === 'post_edit') return 'e:' + o.pid;
    if (o.t === 'post_hide') return 'h:' + o.pid;
    return null;
  }
  function pushOp(op) {
    const u = me(); if (!u) return;
    op.id = uuid(); op.uid = u.id; op.at = Date.now();
    let a = outbox();
    const key = opKey(op);
    if (key) a = a.filter(function (o) { return !(o.uid === u.id && opKey(o) === key); });   // يبقى آخر قرار فقط
    a.push(op);
    saveOutbox(a);
    epoch++;
    setTimeout(flush, 0);
  }

  function rpcName(op) {
    return ({ task: 'save_task', result: 'submit_result', post_new: 'post_create', post_edit: 'post_edit',
      post_pub: 'post_publish', post_del: 'post_delete', post_hide: 'post_hide', like: 'post_like',
      import_progress: 'import_my_progress' })[op.t];
  }
  function rpcArgs(op) {
    switch (op.t) {
      case 'task': return { p_day: op.day, p_task: op.task, p_done: !!op.on };
      case 'result': return { p_cid: op.cid, p_answers: op.answers || {} };
      case 'post_new': return { p_id: op.pid, p_text: op.text, p_visibility: op.vis };
      case 'post_edit': return { p_id: op.pid, p_text: op.text };
      case 'post_pub': return { p_id: op.pid };
      case 'post_del': return { p_id: op.pid };
      case 'post_hide': return { p_id: op.pid, p_hidden: !!op.hidden };
      case 'like': return { p_id: op.pid, p_on: !!op.on };
      case 'import_progress': return { p_days: op.days };
    }
    return null;
  }
  /* ok | stop (انقطاع/جلسة: نوقف ونعيد لاحقًا) | retry (خطأ خادم مؤقت) | drop (رفض نهائي) */
  function classify(r) {
    if (r.ok) return 'ok';
    if (r.authLost || r.offline || r.config) return 'stop';
    const s = r.status || 0;
    if (s === 0 || s >= 500 || s === 429 || s === 408) return 'retry';
    if (s === 404 && /^PGRST/.test(String((r.error && r.error.code) || ''))) return 'retry';   // دالة SQL لم تُشغَّل بعد: لا نُسقط بيانات المستخدم
    return 'drop';
  }
  function errMsg(r) { return String((r && r.error && r.error.message) || ''); }

  function localResultsRef(uid, cid) {
    const all = lget(KEYS.results, []);
    return { all: all, idx: all.findIndex(function (x) { return x.userId === uid && x.cid === cid; }) };
  }
  function onSuccess(op, r) {
    if (op.t === 'result' && r.data && typeof r.data === 'object') {
      const ref = localResultsRef(op.uid, op.cid);
      if (ref.idx > -1) {
        const x = ref.all[ref.idx];
        x.score = r.data.score; x.total = r.data.total;
        if (r.data.created_at) { x.date = fmtResultDate(r.data.created_at); x.at = Date.parse(r.data.created_at) || x.at; }
        lset(KEYS.results, ref.all);
        emit(['results']);
      }
    }
  }
  function onDrop(op, r) {
    const m = errMsg(r).toUpperCase();
    if (op.t === 'result' && m.indexOf('STALE_CONTEST') !== -1) {
      const ref = localResultsRef(op.uid, op.cid);
      if (ref.idx > -1) { ref.all.splice(ref.idx, 1); lset(KEYS.results, ref.all); }
      emit(['results']);
      notice('تحدّثت المسابقة قبل وصول إجاباتك فلم تُسجَّل هذه المحاولة. افتح المسابقة الحالية وأعد المحاولة.', 'warning');
      setTimeout(pull, 0);
      return;
    }
    if (m.indexOf('NOT_FOUND') !== -1 && /^post_|^like$/.test(op.t)) { setTimeout(pull, 0); return; }   // المشاركة اتحذفت من جهاز آخر
    if (typeof console !== 'undefined') console.warn('Sync: عملية مرفوضة', op.t, m);
  }

  async function flush() {
    if (flushing || hold) return { ok: true, busy: true };
    const u = me(); if (!u) return { ok: false };
    flushing = true;
    try {
      for (let guard = 0; guard < 500; guard++) {
        const op = outbox().find(function (o) { return o.uid === u.id; });
        if (!op) { retryAt = 0; return { ok: true }; }
        const name = rpcName(op);
        let res;
        if (!name) res = { ok: false, status: 400, error: { message: 'BAD_OP' } };
        else res = await Auth.rpc(name, rpcArgs(op));
        const c = classify(res);
        if (c === 'stop' || c === 'retry') { retryAt = Date.now() + (c === 'stop' ? 5000 : 15000); return { ok: false, offline: c === 'stop' }; }
        saveOutbox(outbox().filter(function (o) { return o.id !== op.id; }));
        if (c === 'ok') onSuccess(op, res); else onDrop(op, res);
      }
      return { ok: true };
    } finally { flushing = false; }
  }

  /* ---------- السحب ---------- */
  function getRows(path) { return Auth.get(path); }
  function isoCursor(maxTs) {
    const t = Date.parse(maxTs);
    return isNaN(t) ? null : new Date(t - 5000).toISOString();   // تداخل ٥ ثوانٍ: إعادة جلب صف لا تضرّ (الدمج بالمفتاح)
  }
  function meta() { return lget(K.meta, {}) || {}; }
  function saveMeta(m) { lset(K.meta, m); }

  async function pullConfig(changed, ep) {
    const r = await getRows('/rest/v1/app_config?select=key,body,updated_at');
    if (!r.ok) return !(r.offline || r.authLost);
    if (ep !== epoch) return false;
    (Array.isArray(r.data) ? r.data : []).forEach(function (row) {
      if (row.key === 'cid') {
        if (lraw(K.cid) !== row.body) { lsetRaw(K.cid, row.body); changed.add('config'); }
      } else if (KEYS[row.key] && ['plan', 'schedule', 'contest'].indexOf(row.key) !== -1) {
        if (lraw(KEYS[row.key]) !== row.body) { lsetRaw(KEYS[row.key], row.body); changed.add('config'); }
      }
    });
    return true;
  }

  async function pullPaged(base, tsField, cursorField, apply, changed, ep) {
    const m = meta();
    let cursor = m[cursorField] || null, maxSeen = null;
    for (let loop = 0; loop < 30; loop++) {
      const url = base + (cursor ? '&' + tsField + '=gt.' + encodeURIComponent(cursor) : '') + '&order=' + tsField + '.asc&limit=' + PAGE;
      const r = await getRows(url);
      if (!r.ok) return !(r.offline || r.authLost);
      if (ep !== epoch) return false;
      const rows = Array.isArray(r.data) ? r.data : [];
      if (rows.length) {
        apply(rows, changed);
        maxSeen = rows[rows.length - 1][tsField];
        cursor = maxSeen;
        const nm = meta(); nm[cursorField] = isoCursor(maxSeen); saveMeta(nm);
      }
      if (rows.length < PAGE) break;
    }
    return true;
  }

  function applyProgress(rows, changed) {
    const all = lget(KEYS.progress, {});
    let ch = false;
    rows.forEach(function (r) {
      const k = r.user_id + ':' + isoToKey(r.day);
      const cur = all[k] || {};
      const nt = { reading: false, meditation: false, prayer: false, challenge: false };
      TASKS.forEach(function (t) { if (r.tasks && r.tasks[t] === true) nt[t] = true; });
      if (TASKS.some(function (t) { return !!cur[t] !== nt[t]; }) || !all[k]) { all[k] = nt; ch = true; }
    });
    if (ch) { lset(KEYS.progress, all); changed.add('progress'); }
  }

  function applyResults(rows, changed) {
    const all = lget(KEYS.results, []);
    let ch = false;
    rows.forEach(function (r) {
      const rec = {
        userId: r.user_id || ('deleted:' + r.id), userName: r.user_name || '',
        score: r.score, total: r.total, cid: r.cid, answers: r.answers || {},
        date: fmtResultDate(r.created_at), at: Date.parse(r.created_at) || 0
      };
      const i = all.findIndex(function (x) { return x.userId === rec.userId && x.cid === rec.cid; });
      if (i === -1) { all.push(rec); ch = true; }
      else if (all[i].score !== rec.score || all[i].total !== rec.total || JSON.stringify(all[i].answers) !== JSON.stringify(rec.answers)) { all[i] = rec; ch = true; }
      else if (!all[i].at) { all[i].at = rec.at; ch = true; }
    });
    if (ch) {
      all.sort(function (a, b) { return (a.at || 0) - (b.at || 0); });
      lset(KEYS.results, all);
      changed.add('results');
    }
  }

  async function pullBests(changed, ep) {
    const r = await Auth.rpc('results_bests', {});
    if (!r.ok) return !(r.offline || r.authLost);
    if (ep !== epoch) return false;
    const map = {};
    (Array.isArray(r.data) ? r.data : []).forEach(function (x) { if (x && x.user_id) map[x.user_id] = Number(x.best) || 0; });
    if (JSON.stringify(map) !== JSON.stringify(lget(K.bests, {}))) { lset(K.bests, map); changed.add('results'); }
    return true;
  }

  async function pullPosts(changed, ep) {
    const r = await getRows('/rest/v1/posts?select=id,author_id,author_name,text,visibility,hidden,created_at,post_likes(user_id)&order=created_at.desc&limit=300');
    if (!r.ok) return !(r.offline || r.authLost);
    if (ep !== epoch) return false;
    const list = (Array.isArray(r.data) ? r.data : []).map(function (p) {
      return {
        id: p.id, authorId: p.author_id, authorName: p.author_name, text: p.text,
        visibility: p.visibility, hidden: !!p.hidden,
        likes: (p.post_likes || []).map(function (l) { return l.user_id; }),
        createdAt: fmtPostDate(p.created_at), at: Date.parse(p.created_at) || 0
      };
    });
    const s = JSON.stringify(list);
    if (s !== lraw(KEYS.posts)) { lsetRaw(KEYS.posts, s); changed.add('posts'); }
    return true;
  }

  async function pull() {
    const u = me();
    if (pulling || hold || !u) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    pulling = true; lastPull = Date.now();
    const changed = new Set();
    try {
      if (pendingCount()) { await flush(); if (pendingCount()) return; }   // لا نسحب فوق تغييرات لم تُرفع
      const ep = epoch;
      if (Date.now() - lastClock > 600000) syncClock();
      if (!(await pullConfig(changed, ep))) return;
      if (!(await pullPaged('/rest/v1/progress?select=user_id,day,tasks,updated_at', 'updated_at', 'prog', applyProgress, changed, ep))) return;
      if (!(await pullPaged('/rest/v1/results?select=id,user_id,user_name,score,total,cid,answers,created_at', 'created_at', 'res', applyResults, changed, ep))) return;
      if (u.role === 'servant') { if (!(await pullBests(changed, ep))) return; }
      if (!(await pullPosts(changed, ep))) return;
      if (u.role === 'admin' || u.role === 'owner') {
        const m = meta();
        if (!m.accAt || Date.now() - m.accAt > 55000) {
          const before = JSON.stringify(Auth.getAccounts());
          const ar = await Auth.loadAccounts();
          if (ar.ok) {
            m.accAt = Date.now(); saveMeta(Object.assign(meta(), { accAt: m.accAt }));
            if (before !== JSON.stringify(Auth.getAccounts())) changed.add('accounts');
          }
        }
      }
    } finally {
      pulling = false;
      if (changed.size) emit(Array.from(changed));
    }
  }

  /* ---------- حفظ الإعدادات (يتطلب اتصالًا؛ لا يُحفظ في الطابور حتى لا يتعارض معرّف المسابقة) ---------- */
  async function saveConfig(key, body, cid) {
    const r = await Auth.rpc('admin_set_config', { p_key: key, p_body: body, p_cid: cid || null });
    if (r.ok) { if (cid) lsetRaw(K.cid, cid); return { ok: true }; }
    if (r.offline) return { ok: false, error: 'يلزم اتصال بالإنترنت لحفظ هذا الإعداد للجميع. حاول مرة أخرى عند توفر الإنترنت.' };
    if (r.authLost) return { ok: false, error: 'انتهت الجلسة. سجّل الدخول من جديد.' };
    return { ok: false, error: Auth.errText(r, 'تعذّر حفظ الإعداد.') };
  }

  /* ---------- التهيئة والترحيل (مرة واحدة لكل جهاز) ---------- */
  function clearCaches() {
    [KEYS.progress, KEYS.results, KEYS.posts, K.bests, K.meta].forEach(ldel);
    lset(KEYS.progress, {}); lset(KEYS.results, []); lset(KEYS.posts, []);
  }
  /* v1.1 كانت كل البيانات محلية: نحفظ نسخة كاملة، ونُبقي بيانات الحساب الحالي فقط ونرفعها للسيرفر */
  function migrateLegacy(u) {
    try {
      const prog = lget(KEYS.progress, {}) || {};
      const res = lget(KEYS.results, []) || [];
      const posts = lget(KEYS.posts, []) || [];
      if (Object.keys(prog).length || res.length || posts.length) {
        lset(K.legacy, { at: new Date().toISOString(), uid: u.id, progress: prog, results: res, posts: posts });
      }
      const mineProg = {}, days = {};
      Object.keys(prog).forEach(function (k) {
        if (k.indexOf(u.id + ':') !== 0) return;
        mineProg[k] = prog[k];
        const t = prog[k] || {}, d = {};
        TASKS.forEach(function (x) { if (t[x] === true) d[x] = true; });
        if (Object.keys(d).length) days[keyToIso(k.slice(u.id.length + 1))] = d;
      });
      const mineRes = res.filter(function (r) { return r && r.userId === u.id; });
      const minePosts = posts.filter(function (p) { return p && p.authorId === u.id; });
      lset(KEYS.progress, mineProg); lset(KEYS.results, mineRes); lset(KEYS.posts, minePosts);
      if (Object.keys(days).length) pushOp({ t: 'import_progress', days: days });
      const cid = typeof contestId === 'function' ? contestId() : null;
      mineRes.forEach(function (r) {
        if (cid && r.cid === cid) pushOp({ t: 'result', cid: r.cid, answers: r.answers || {} });
      });
      minePosts.forEach(function (p) {
        if (!p.text) return;
        pushOp({ t: 'post_new', pid: uuid(), text: String(p.text).slice(0, 4000), vis: p.visibility === 'public' ? 'public' : 'private' });
      });
    } catch (e) { if (typeof console !== 'undefined') console.warn('Sync.migrate', e); }
    lsetRaw(K.ver, '1.2');
  }
  /* أول مسؤول/مالك يفتح v1.2: ينشر خطته وجدوله (والمالك أسئلته) إن لم تكن منشورة بعد */
  async function maybePushConfig(u) {
    if (u.role !== 'admin' && u.role !== 'owner') return;
    const m = meta();
    if (m.cfgPushed) return;
    const r = await getRows('/rest/v1/app_config?select=key');
    if (!r.ok) return;
    const have = {};
    (Array.isArray(r.data) ? r.data : []).forEach(function (x) { have[x.key] = true; });
    const order = ['plan', 'schedule'].concat(u.role === 'owner' ? ['contest'] : []);
    for (let i = 0; i < order.length; i++) {
      const key = order[i];
      if (have[key]) continue;
      const raw = lraw(KEYS[key]);
      if (!raw) continue;
      const cid = key === 'plan' ? null : (typeof contestId === 'function' ? contestId() : null);
      const w = await Auth.rpc('admin_set_config', { p_key: key, p_body: raw, p_cid: cid });
      if (!w.ok && (w.offline || w.authLost)) return;
    }
    const nm = meta(); nm.cfgPushed = true; saveMeta(nm);
  }

  async function init() {
    const u = me(); if (!u) return;
    if (initFor === u.id) { kick(); return; }
    initFor = u.id;
    hold = true;
    try {
      let m = meta();
      if (m.uid && m.uid !== u.id) { clearCaches(); m = {}; }
      m.uid = u.id; saveMeta(m);
      if (lraw(K.ver) !== '1.2') migrateLegacy(u);
      startTimers();
      await syncClock();
      await maybePushConfig(u);
    } finally { hold = false; }
    await flush();
    await pull();
  }
  function kick() { if (pendingCount()) flush(); pull(); }
  /* عند تسجيل الخروج: نمسح نسخة بيانات الحساب من الجهاز (الطابور يبقى ليُرفع عند الدخول التالي لنفس الحساب) */
  function reset() { initFor = null; clearCaches(); }

  function startTimers() {
    if (started) return;
    started = true;
    setInterval(function () {
      if (typeof document !== 'undefined' && document.hidden) return;
      const u = me(); if (!u || hold) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      const now = Date.now();
      if (pendingCount() && now >= retryAt) { flush(); return; }
      const gap = (u.role === 'admin' || u.role === 'owner') ? STAFF_GAP : SERVANT_GAP;
      if (now - lastPull >= gap) pull();
    }, 5000);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', function () { if (!document.hidden && me()) kick(); });
    if (typeof window !== 'undefined') window.addEventListener('online', function () { if (me()) { retryAt = 0; kick(); } });
  }

  /* ---------- واجهة الاستعمال من app.js ---------- */
  function validPid(id) { return UUID_RE.test(String(id)); }
  return {
    on: on, uuid: uuid,
    cairoNow: cairoNow, todayKey: todayKey,
    init: init, reset: reset, flush: flush, pull: pull,
    pendingCount: pendingCount, serverCid: function () { return lraw(K.cid); },
    bests: function () { return lget(K.bests, {}); },
    saveConfig: saveConfig,
    setTask: function (dayKey, task, isOn) { if (TASKS.indexOf(task) !== -1) pushOp({ t: 'task', day: keyToIso(dayKey), task: task, on: !!isOn }); },
    submitResult: function (cid, answers) { pushOp({ t: 'result', cid: cid, answers: answers || {} }); },
    postNew: function (pid, text, vis) { pushOp({ t: 'post_new', pid: pid, text: text, vis: vis === 'public' ? 'public' : 'private' }); },
    postEdit: function (pid, text) { if (validPid(pid)) pushOp({ t: 'post_edit', pid: pid, text: text }); },
    postPublish: function (pid) { if (validPid(pid)) pushOp({ t: 'post_pub', pid: pid }); },
    postDelete: function (pid) { if (validPid(pid)) pushOp({ t: 'post_del', pid: pid }); },
    postHide: function (pid, hidden) { if (validPid(pid)) pushOp({ t: 'post_hide', pid: pid, hidden: !!hidden }); },
    like: function (pid, isOn) { if (validPid(pid)) pushOp({ t: 'like', pid: pid, on: !!isOn }); },
    validPid: validPid,
    _debug: { outbox: outbox }
  };
})();
