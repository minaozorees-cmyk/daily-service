'use strict';
/* الخدمة اليومية v3.0.18 — الدعم.
   ١) سجل محلي صغير (آخر ٦٠ حدثًا) على كل جهاز: أخطاء الطلبات، أخطاء الصفحة، تحذيرات التطبيق، الاتصال/الخروج.
   ٢) رفع الأخطاء المهمة تلقائيًا للمالك (٥xx/٤٢٩/٤٠١/٤٠٣/انتهاء مهلة/خطأ JS/عملية مرفوضة) — دفعات صغيرة وبحد أقصى.
   ٣) زر «إرسال تقرير للمالك» في إعدادات الخادم (+ «نسخ التقرير» لو تعذّر الإرسال).
   ٤) لوحة «الدعم» في الإدارة (المالك فقط).
   لا يُسجَّل أبدًا: كلمات المرور، محتوى الطلبات، الإجابات، نصوص المشاركات. */
(function () {
  const LK = 'ds_v3_support', PK = 'ds_v3_support_pend', RK = 'ds_v3_support_rep';
  const MAXBUF = 60, MAXPEND = 40, SESSION_CAP = 120, FLUSH_GAP = 20000, BATCH = 20;
  const VER = (typeof APP_VERSION !== 'undefined') ? APP_VERSION : '';
  const $ = (id) => document.getElementById(id);

  /* ---------- تخزين ---------- */
  function lget(k, fb) { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch (e) { return fb; } }
  function lset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ممتلئ: نتجاهل */ } }
  function ldel(k) { try { localStorage.removeItem(k); } catch (e) { /* */ } }

  /* ---------- تنظيف (لا أسرار) ---------- */
  function clean(s, n) {
    s = String(s == null ? '' : s)
      .replace(/Bearer\s+[A-Za-z0-9._~+\/=-]+/gi, 'Bearer ***')
      .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g, '***jwt***')
      .replace(/(password|pass|pwd|كلمة[_ ]?المرور|refresh_token|access_token|apikey)["'\s:=]+[^\s,"'}]{3,}/gi, '$1=***')
      .replace(/\s+/g, ' ').trim();
    return s.length > n ? s.slice(0, n) + '…' : s;
  }
  function shortUA() {
    const u = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
    let os = /Android\s([\d.]+)/.exec(u); os = os ? 'Android ' + os[1] : (/iPhone OS ([\d_]+)/.exec(u) ? 'iOS ' + RegExp.$1.replace(/_/g, '.') : (/Windows/.test(u) ? 'Windows' : (/Mac OS X/.test(u) ? 'macOS' : (/Linux/.test(u) ? 'Linux' : '?'))));
    let br = /(Edg|OPR|SamsungBrowser|CriOS|FxiOS|Firefox|Chrome|Version)\/([\d]+)/.exec(u);
    const nm = br ? ({ Edg: 'Edge', OPR: 'Opera', CriOS: 'Chrome iOS', FxiOS: 'Firefox iOS', Version: 'Safari' }[br[1]] || br[1]) : '?';
    return clean(os + ' · ' + nm + (br ? ' ' + br[2] : ''), 120);
  }

  /* ---------- السجل المحلي ---------- */
  let buf = lget(LK, []); if (!Array.isArray(buf)) buf = [];
  let saveT = null;
  function saveBuf() { if (saveT) return; saveT = setTimeout(function () { saveT = null; lset(LK, buf); }, 400); }
  function addLocal(k, n, s, m) {
    buf.push({ t: Date.now(), k: k, n: clean(n, 80), s: (typeof s === 'number' ? s : null), m: clean(m, 200) });
    if (buf.length > MAXBUF) buf.splice(0, buf.length - MAXBUF);
    saveBuf();
  }

  /* ---------- الرفع ---------- */
  let pend = lget(PK, []); if (!Array.isArray(pend)) pend = [];
  let uploaded = 0, lastFlush = 0, flushing = false, disabled = false;
  function savePend() { if (pend.length > MAXPEND) pend.splice(0, pend.length - MAXPEND); lset(PK, pend); }
  function queue(n, s, m) {
    if (disabled) return;
    n = clean(n, 80); m = clean(m, 300);
    const hit = pend.find(function (x) { return x.n === n && x.s === s && x.m === m; });
    if (hit) hit.c = (hit.c || 1) + 1; else pend.push({ n: n, s: s, m: m, c: 1 });
    savePend();
  }
  const me = function () { try { return (typeof getCurrentUser === 'function') ? getCurrentUser() : null; } catch (e) { return null; } };
  const online = function () { return typeof navigator === 'undefined' || navigator.onLine !== false; };
  async function flush(force) {
    if (flushing || disabled || !online() || !me() || typeof Auth === 'undefined') return;
    if (!force && Date.now() - lastFlush < FLUSH_GAP) return;
    /* تقرير ينتظر الاتصال */
    const rep = lget(RK, null);
    if (rep) {
      lastFlush = Date.now(); flushing = true;
      try {
        const r = await Auth.rpc('support_report', rep);
        if (r.ok || (r.status && r.status < 500 && r.status !== 429 && r.status !== 408)) ldel(RK);
        if (r.ok && typeof showToast === 'function') showToast('وصل تقريرك للمالك ✅', 'success');
        if (r.status === 404) disabled = true;
      } finally { flushing = false; }
      return;
    }
    if (!pend.length || uploaded >= SESSION_CAP) return;
    lastFlush = Date.now(); flushing = true;
    const batch = pend.slice(0, BATCH);
    try {
      const r = await Auth.rpc('support_log_add', { p_items: batch, p_ver: VER, p_ua: shortUA() });
      if (r.ok) { pend.splice(0, batch.length); uploaded += batch.length; savePend(); }
      else if (r.status === 404) { disabled = true; }                       // sql/31 لم يُشغَّل: نتجاهل بهدوء
      else if (r.offline || r.authLost || r.status >= 500 || r.status === 429 || r.status === 408) { /* نعيد لاحقًا */ }
      else { pend.splice(0, batch.length); savePend(); }                   // مرفوضة (مثلًا BAD_INPUT): نُسقطها
    } finally { flushing = false; }
  }
  setInterval(function () { flush(false); }, 5000);

  /* ---------- أسماء الطلبات ---------- */
  function reqName(method, path) {
    path = String(path || '');
    let m = /\/rest\/v1\/rpc\/([a-z0-9_]+)/i.exec(path); if (m) return m[1];
    m = /\/rest\/v1\/([a-z0-9_]+)/i.exec(path); if (m) return method + ' ' + m[1];
    m = /\/auth\/v1\/token\?grant_type=([a-z_]+)/i.exec(path); if (m) return 'auth:' + m[1];
    m = /\/auth\/v1\/([a-z]+)/i.exec(path); if (m) return 'auth:' + m[1];
    return clean(path.split('?')[0], 60);
  }
  const UPLOAD_STATUS = function (s) { return s >= 500 || s === 429 || s === 408 || s === 401 || s === 403; };
  let lastOff = 0;
  function onReq(method, path, r, ms) {
    if (/support_log_add|support_report|staff_support_list|owner_support_clear/.test(String(path))) return;
    if (!r || r.config) return;
    const n = reqName(method, path);
    if (r.ok) {
      if (ms >= 8000) { addLocal('slow', n, null, ms + 'ms'); if (ms >= 10000) queue('slow:' + n, null, Math.round(ms / 1000) + 's'); }
      return;
    }
    if (r.offline) {
      const timeout = ms >= 11500;
      if (timeout) { addLocal('err', n, 0, 'timeout ' + Math.round(ms / 1000) + 's'); queue('timeout:' + n, 0, Math.round(ms / 1000) + 's'); }
      else if (Date.now() - lastOff > 30000) { lastOff = Date.now(); addLocal('off', n, 0, 'network'); }
      return;
    }
    const e = r.error || {}, st = Number(r.status) || 0, code = String(e.code || ''), msg = String(e.message || '');
    if (/^auth:(token|password)/.test(n) && st >= 400 && st < 500 && st !== 429) { addLocal('err', n, st, code || msg); return; }
    addLocal('err', n, st, (code ? code + ' ' : '') + msg);
    if (UPLOAD_STATUS(st) || /^PGRST/.test(code)) queue(n, st, (code ? code + ' ' : '') + msg);
  }
  if (typeof Supa !== 'undefined' && Supa && typeof Supa.request === 'function') {
    const orig = Supa.request;
    Supa.request = async function (method, path) {
      const t0 = Date.now();
      const r = await orig.apply(this, arguments);
      try { onReq(method, path, r, Date.now() - t0); } catch (e) { /* السجل لا يكسر الطلب */ }
      return r;
    };
  }

  /* ---------- أخطاء الصفحة والتحذيرات والأحداث ---------- */
  window.addEventListener('error', function (ev) {
    const m = String((ev && ev.message) || '');
    if (!m || /ResizeObserver loop/i.test(m)) return;
    const f = String((ev && ev.filename) || '').split('/').pop().split('?')[0];
    const where = f ? ' @' + f + ':' + (ev.lineno || 0) + ':' + (ev.colno || 0) : '';
    addLocal('js', 'js', null, m + where); queue('js', null, m + where);
  });
  window.addEventListener('unhandledrejection', function (ev) {
    const r = ev && ev.reason, m = r && (r.message || r.toString && r.toString()) || 'rejection';
    addLocal('js', 'promise', null, m); queue('promise', null, m);
  });
  ['warn', 'error'].forEach(function (k) {
    const o = console[k];
    console[k] = function () {
      try {
        const msg = Array.prototype.map.call(arguments, function (a) { return a && a.message ? a.message : (typeof a === 'object' ? '' : String(a)); }).join(' ');
        if (msg) {
          addLocal(k === 'warn' ? 'warn' : 'cerr', k, null, msg);
          if (/^Sync: عملية مرفوضة/.test(msg)) queue('sync-drop', null, msg);
        }
      } catch (e) { /* */ }
      return o && o.apply(console, arguments);
    };
  });
  document.addEventListener('visibilitychange', function () { addLocal('ev', document.hidden ? 'hidden' : 'visible', null, ''); if (document.hidden) { if (saveT) { clearTimeout(saveT); saveT = null; } lset(LK, buf); } });
  window.addEventListener('online', function () { addLocal('ev', 'online', null, ''); flush(true); });
  window.addEventListener('offline', function () { addLocal('ev', 'offline', null, ''); });
  window.addEventListener('pagehide', function () { lset(LK, buf); });
  addLocal('ev', 'start', null, VER);

  /* ---------- الإبلاغ (الخادم) ---------- */
  function snapshot() {
    const u = me() || {}, s = {};
    try { s.role = u.role || ''; } catch (e) { /* */ }
    try { const t = document.querySelector('.tab-section.active'); s.tab = t ? t.id : ''; } catch (e) { /* */ }
    try { s.ver = VER; s.online = online(); s.visible = !document.hidden; } catch (e) { /* */ }
    try { s.pending = (typeof Sync !== 'undefined' && Sync.pendingCount) ? Sync.pendingCount() : null; } catch (e) { /* */ }
    try { s.pwa = !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches); } catch (e) { /* */ }
    try { s.screen = window.innerWidth + 'x' + window.innerHeight; } catch (e) { /* */ }
    try { s.net = (navigator.connection && navigator.connection.effectiveType) || ''; } catch (e) { /* */ }
    try { s.sw = !!(navigator.serviceWorker && navigator.serviceWorker.controller); } catch (e) { /* */ }
    try { s.ua = shortUA(); s.tz = new Date().getTimezoneOffset(); } catch (e) { /* */ }
    return s;
  }
  function logLines() { return buf.slice(-40).map(function (x) { return { t: x.t, k: x.k, n: x.n, s: x.s, m: x.m }; }); }
  const hhmmss = (t) => { const d = new Date(t); return isNaN(d) ? '' : d.toLocaleTimeString('en-GB', { timeZone: 'Africa/Cairo', hour12: false }); };
  function lineText(x) { return hhmmss(x.t) + ' [' + x.k + '] ' + x.n + (x.s != null ? ' ' + x.s : '') + (x.m ? ' — ' + x.m : ''); }
  function reportText(note) {
    const s = snapshot(), u = me() || {};
    return ['تقرير مشكلة — الخدمة اليومية ' + VER, 'الاسم: ' + (u.name || ''), 'الملاحظة: ' + (note || '—'),
      'الجهاز: ' + s.ua + ' | شاشة ' + s.screen + ' | ' + (s.pwa ? 'تطبيق مثبّت' : 'متصفح') + ' | اتصال: ' + (s.online ? 'نعم' : 'لا') + ' ' + (s.net || '') + ' | عمليات معلّقة: ' + s.pending,
      '— آخر الأحداث —'].concat(logLines().map(lineText)).join('\n');
  }
  function setMsg(t, bad) { const e = $('support-msg'); if (e) { e.textContent = t; e.style.color = bad ? 'var(--danger, #c0392b)' : ''; } }
  window.supportSend = async function () {
    if (!me()) return;
    const btn = $('support-send'), note = ($('support-note') ? $('support-note').value : '').trim().slice(0, 500);
    if (btn) btn.disabled = true;
    const payload = { p_note: note, p_ctx: { snap: snapshot(), log: logLines() }, p_ver: VER, p_ua: shortUA() };
    try {
      const r = await Auth.rpc('support_report', payload);
      if (r.ok) { setMsg('تم إرسال التقرير للمالك ✅ شكرًا لك.'); if ($('support-note')) $('support-note').value = ''; if (typeof showToast === 'function') showToast('تم إرسال التقرير للمالك ✅', 'success'); }
      else if (r.offline) { lset(RK, payload); setMsg('لا يوجد اتصال الآن. سيُرسل التقرير تلقائيًا عند عودة الاتصال (أو اضغط «نسخ التقرير» وأرسله بنفسك).'); }
      else if (r.status === 404) setMsg('خدمة الدعم غير مفعّلة بعد. اضغط «نسخ التقرير» وأرسله للمالك على واتساب.', true);
      else if (/TOO_FAST/i.test(String((r.error && r.error.message) || ''))) setMsg('انتظر لحظات ثم أرسل مرة أخرى.', true);
      else setMsg('تعذّر الإرسال. اضغط «نسخ التقرير» وأرسله للمالك على واتساب.', true);
    } finally { if (btn) btn.disabled = false; }
  };
  async function copyText(t) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(t); return true; } } catch (e) { /* ننتقل للبديل */ }
    try { const a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;opacity:0;'; document.body.appendChild(a); a.select(); const ok = document.execCommand('copy'); a.remove(); return ok; } catch (e) { return false; }
  }
  window.supportCopy = async function () {
    const ok = await copyText(reportText(($('support-note') ? $('support-note').value : '').trim().slice(0, 500)));
    setMsg(ok ? 'تم نسخ التقرير 📋 الصقه في رسالة للمالك.' : 'تعذّر النسخ تلقائيًا.', !ok);
  };

  /* ---------- لوحة المالك ---------- */
  const esc = (s) => (typeof escapeHtml === 'function' ? escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const isOwner = () => { const u = me(); return !!u && u.role === 'owner'; };
  const items = new Map();
  let cursor = null, busy = false, reqId = 0, lastDay = '';
  const fmt = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('ar-EG-u-nu-latn', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' }); };
  function itemText(it) {
    const c = it.ctx || {}, snap = c.snap || {}, log = Array.isArray(c.log) ? c.log : [];
    return [(it.kind === 'report' ? 'تقرير' : 'خطأ') + ' #' + it.id + ' — ' + fmt(it.at), 'الخادم: ' + (it.user_name || '—'), 'النسخة: ' + (it.ver || '—') + ' | ' + (it.ua || '—'),
      it.kind === 'report' ? 'الملاحظة: ' + (it.note || '—') : it.name + (it.status != null ? ' ' + it.status : '') + ' — ' + (it.msg || '') + (it.cnt > 1 ? ' (×' + it.cnt + ')' : '')]
      .concat(Object.keys(snap).length ? ['الحالة: ' + JSON.stringify(snap)] : [])
      .concat(log.length ? ['— السجل —'].concat(log.map(lineText)) : []).join('\n');
  }
  function itemHtml(it) {
    items.set(it.id, it);
    const rep = it.kind === 'report';
    const badge = rep ? '<span class="badge badge-gold">📨 تقرير</span>' : '<span class="badge ' + (it.status >= 500 || it.status === 0 || it.status == null ? 'badge-red' : 'badge-blue') + '">⚠️ خطأ</span>';
    const head = rep ? esc(it.note || 'بلا ملاحظة') : '<b dir="ltr" style="display:inline-block">' + esc(it.name) + (it.status != null ? ' ' + esc(it.status) : '') + '</b> ' + esc(it.msg) + (it.cnt > 1 ? ' <span class="badge badge-blue">×' + it.cnt + '</span>' : '');
    let det = '';
    if (rep) {
      const c = it.ctx || {}, snap = c.snap || {}, log = Array.isArray(c.log) ? c.log : [];
      det = '<details class="act-det"><summary>التفاصيل (' + log.length + ' حدث)</summary>'
        + (Object.keys(snap).length ? '<div dir="ltr" style="font-size:0.74rem;word-break:break-word;margin:6px 0;">' + esc(JSON.stringify(snap)) + '</div>' : '')
        + '<div dir="ltr" style="font-family:monospace;font-size:0.72rem;max-height:220px;overflow:auto;white-space:pre-wrap;word-break:break-word;">' + esc(log.map(lineText).join('\n')) + '</div></details>';
    }
    return '<div class="act-item"><div class="act-head"><span class="act-who">' + esc(it.user_name || 'مستخدم محذوف') + '</span><span class="act-time">' + esc(fmt(it.at)) + '</span></div>'
      + '<div class="act-sum">' + badge + ' ' + head + '</div>'
      + '<div style="font-size:0.72rem;color:var(--text-muted);margin-top:3px;" dir="ltr">' + esc(it.ver) + ' · ' + esc(it.ua) + '</div>' + det
      + '<div style="margin-top:6px;"><button type="button" class="btn btn-outline btn-sm" onclick="supportCopyItem(' + Number(it.id) + ')">📋 نسخ</button></div></div>';
  }
  window.supportCopyItem = async function (id) { const it = items.get(Number(id)); if (!it) return; const ok = await copyText(itemText(it)); if (typeof showToast === 'function') showToast(ok ? 'تم النسخ 📋' : 'تعذّر النسخ', ok ? 'success' : 'error'); };
  function readF() {
    const g = (id) => { const e = $(id); return e ? e.value.trim() : ''; }, a = {};
    if (g('sup-kind')) a.p_kind = g('sup-kind');
    if (g('sup-user')) a.p_user = g('sup-user');
    if (g('sup-q')) a.p_q = g('sup-q');
    return a;
  }
  window.supportLoad = async function (reset) {
    const list = $('sup-list'), more = $('sup-more'); if (!list || !isOwner()) return;
    if (busy && !reset) return;
    if (reset) { cursor = null; lastDay = ''; items.clear(); list.innerHTML = '<div class="json-hint" style="text-align:center;">جارٍ التحميل…</div>'; if (more) more.style.display = 'none'; }
    const my = ++reqId; busy = true;
    const args = Object.assign(readF(), { p_limit: 40 }); if (cursor) args.p_before = cursor;
    const r = await Auth.rpc('staff_support_list', args);
    if (my !== reqId) return;
    busy = false;
    if (!r.ok) {
      const miss = r.status === 404 ? 'خدمة الدعم غير مفعّلة: شغّل sql/31 ثم sql/32 على Supabase.' : 'تعذّر تحميل سجل الدعم.';
      if (reset) list.innerHTML = '<div class="json-hint" style="text-align:center;padding:14px;">' + esc(miss) + '</div>';
      return;
    }
    const d = r.data || {}, arr = Array.isArray(d.items) ? d.items : [];
    if (reset) list.innerHTML = '';
    if (d.stats) { const s = d.stats, e = $('sup-stats'); if (e) e.innerHTML = '⚠️ أخطاء آخر ساعة: <b>' + (s.errors_1h || 0) + '</b> (من <b>' + (s.users_1h || 0) + '</b> خادم) · آخر ٢٤ ساعة: <b>' + (s.errors_24h || 0) + '</b> · 📨 تقارير ٢٤ ساعة: <b>' + (s.reports_24h || 0) + '</b>'; }
    if (Array.isArray(d.users)) { const sel = $('sup-user'), cur = sel.value; sel.innerHTML = '<option value="">كل الخدام</option>' + d.users.map((u) => '<option value="' + esc(u.id) + '">' + esc(u.name || 'بلا اسم') + '</option>').join(''); sel.value = d.users.some((u) => u.id === cur) ? cur : ''; }
    if (reset && !arr.length) list.innerHTML = '<div class="json-hint" style="text-align:center;padding:14px;">لا توجد أخطاء ولا تقارير مطابقة. 👍</div>';
    list.insertAdjacentHTML('beforeend', arr.map(itemHtml).join(''));
    if (arr.length) cursor = arr[arr.length - 1].id;
    if (more) more.style.display = d.has_more ? '' : 'none';
  };
  window.supportMore = function () { if (cursor) window.supportLoad(false); };
  window.supportApply = function () { window.supportLoad(true); };
  window.supportReset = function () { ['sup-kind', 'sup-user', 'sup-q'].forEach((id) => { const e = $(id); if (e) e.value = ''; }); window.supportLoad(true); };
  window.supportClear = async function () {
    if (!isOwner() || !window.confirm('مسح كل سجل الدعم نهائيًا؟')) return;
    const r = await Auth.rpc('owner_support_clear', {});
    if (typeof showToast === 'function') showToast(r.ok ? 'تم مسح السجل' : 'تعذّر المسح', r.ok ? 'success' : 'error');
    if (r.ok) window.supportLoad(true);
  };
  const qEl = $('sup-q'); if (qEl) qEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); window.supportApply(); } });
  const prevSwitch = window.switchAdminSub;
  window.switchAdminSub = function (panel, btn) {
    const out = prevSwitch.apply(this, arguments);
    try { if (panel === 'support') window.supportLoad(true); } catch (e) { /* */ }
    return out;
  };

  /* واجهة صغيرة لباقي الملفات: Support.note('اسم','نص') يسجّل حدثًا محليًا يظهر في التقارير */
  window.Support = { note: function (n, m) { try { addLocal('ev', n, null, m); } catch (e) { /* */ } }, flush: function () { return flush(true); }, _buf: function () { return buf.slice(); }, _pend: function () { return pend.slice(); } };
})();
