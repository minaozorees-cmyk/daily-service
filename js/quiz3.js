'use strict';
/* الخدمة اليومية v3.0 — مسابقة على نمط مسابقة بطرس: إصحاح بإصحاح (قراءة ← أسئلة ← حفظ) ثم الامتحان الشامل.
   • محاولة واحدة لكل إصحاح. الخروج أثناء الحل يُلغي المحاولة. أي محاولة إضافية تحتاج كود فتح من المسؤول (إصحاح واحد، مرة واحدة).
   • الدرجة تُحسب في السيرفر (quiz_finish). الخادم لا يرى درجة ولا تصحيحًا إلا بعد الامتحان الشامل.
   • أوفلاين: البدء/التسليم/الإلغاء تدخل طابور Sync وتُرفع فور عودة الاتصال.
   سكربت عادي يُحمَّل بعد admin21.js ويستبدل دوال app.js بالإسناد على window (نفس أسلوب admin15/16). */
(function () {
  const LS = 'ds_v3_quiz', REV = 'ds_v3_review';
  const PER_CH = 15, FINAL_N = 30, DEF_Q = 30, DEF_TL = 60;
  const TYPES = ['🔍', '💭', '🧩', '🏛', '🎭', '⚡', '🏆'];
  const ERR = {
    NEED_CODE: 'هذا الإصحاح استُهلكت محاولته. اطلب كودًا من المسؤول.', CLOSED: 'الإصحاح غير مفتوح الآن. اطلب كودًا من المسؤول.',
    NOT_YET: 'أكمل الإصحاح السابق أولًا.', BAD_CODE: 'الكود غير صحيح لهذا الإصحاح أو لهذا الحساب.', CODE_USED: 'هذا الكود استُعمل من قبل.',
    CODE_EXPIRED: 'انتهت مدة الكود. اطلب كودًا جديدًا.', STALE_CONTEST: 'تحدّثت المسابقة. حدّث الصفحة ثم أعد المحاولة.',
    CANCELLED: 'أُلغيت هذه المحاولة.', MOVED_TO_V3: 'هذه النسخة قديمة. حدّث التطبيق.'
  };
  let CM = null, cmFail = false, cmLoading = false, codeTyped = {};
  let leftNotice = false, view = 'home', Q = null, readStep = null, pendingCode = null, timerId = null, tickT = 0, reviewBusy = false, busy = false;

  /* ---------- أدوات ---------- */
  const el = () => $('quiz-container');
  const esc = (s) => escapeHtml(String(s == null ? '' : s));
  const ar = (n) => String(n);   /* v3.0.8: أرقام إنجليزية (الاسم قديم) */
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const me = () => getCurrentUser();
  function contest() { const c = getStore(STORE.contest, null); return c && !Array.isArray(c) && c.v === 3 && Array.isArray(c.chapters) ? c : null; }
  const timing = (c) => ({ q: (function () { const s = getStore(STORE.schedule, DEFAULT_SCHEDULE) || {}; const v = parseInt(s.timer, 10); return isNaN(v) ? DEF_Q : Math.max(0, v); })(), tl: c && c.timing && c.timing.tl != null ? Math.max(0, parseInt(c.timing.tl, 10) || 0) : DEF_TL });
  const stepLabel = (c, s) => (s === 0 ? 'الامتحان الشامل' : c.chapters[s - 1].book + ' — إصحاح ' + ar(c.chapters[s - 1].num));
  const pool = (c, s) => (s === 0 ? (c.final || []) : c.chapters[s - 1].qs || []);

  function ls() {
    const u = me(), cid = Sync.serverCid() || '';
    const s = getStore(LS, null);
    if (s && u && s.uid === u.id && s.cid === cid) return s;
    return { uid: u ? u.id : '', cid: cid, steps: {}, active: null };
  }
  const lsSave = (s) => setStore(LS, s);
  const srv = () => { const s = getStore('ds_v3_state', null); return s && s.cid === Sync.serverCid() ? s : { steps: [], codes: [], final_done: false }; };
  function info(step) {
    const L = ls().steps[step] || {}, S = (srv().steps || []).find((x) => x.step === step) || {};
    return { done: !!(S.has_done || L.done), used: (S.attempts | 0) > 0 || !!L.used, state: S.state || 'open' };
  }
  function codeFor(step) {
    const now = Sync.nowMs();
    return (srv().codes || []).find((k) => k.step === step && Date.parse(k.expires_at) > now) || null;
  }
  function prevDone(c, step) {
    if (step === 1) return true;
    if (step === 0) { for (let i = 1; i <= c.chapters.length; i++) if (!info(i).done) return false; return true; }
    return info(step - 1).done;
  }
  /* done | retry | locked | needcode | closed | ready */
  function status(c, step) {
    const i = info(step);
    if (i.done) return codeFor(step) ? 'retry' : 'done';
    if (!prevDone(c, step)) return 'locked';
    if (i.used) return 'needcode';
    if (i.state !== 'open' && !codeFor(step)) return 'closed';
    return 'ready';
  }
  const finalDone = () => !!srv().final_done || !!(ls().steps[0] || {}).done;

  function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }

  /* ---------- الشاشة الرئيسية ---------- */
  function renderHome() {
    const box = el(); if (!box) return;
    const w = contestWindow();
    if (w.state === 'none') { box.innerHTML = '<p class="results-empty">لا توجد مسابقة حالية. تابع إعلان المسؤول.</p>'; return; }
    if (w.state === 'not_started') { box.innerHTML = '<p class="results-empty">المسابقة لم تبدأ بعد.</p>'; return; }
    const c = contest();
    if (!c) { box.innerHTML = '<p class="results-empty">لا توجد أسئلة حاليًا.</p>'; return; }
    if (finalDone()) return renderDone(c);
    const n = c.chapters.length, doneN = c.chapters.filter((x, i) => info(i + 1).done).length;
    const useMap = !!CM && !cmFail;
    if (!CM && !cmFail) loadCM();
    const rows = [];
    if (!useMap) for (let s = 1; s <= n; s++) rows.push(row(c, s));
    rows.push(row(c, 0));
    const books = c.chapters.map((x) => x.book).filter((b, i, a) => b && a.indexOf(b) === i);
    const mapBox = useMap ? `<div class="q3-map">${CM.html(books.length === 1 ? books[0] : 'المسابقة', { verses: false, back: false })}</div>` : '';
    const pend = Sync.pendingCount() > 0;
    box.innerHTML = `
      <div class="q3-prog"><div class="q3-prog-top"><span>تقدّمك في المسابقة</span><strong>${ar(doneN)} / ${ar(n)} إصحاح</strong></div>
        <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${Math.round((doneN / n) * 100)}%"></div></div></div>
      ${pend ? '<div class="sched-note">⏳ بعض إجاباتك محفوظة على جهازك وستُرسل فور عودة الاتصال.</div>' : ''}
      ${mapBox}
      <div class="q3-rules">محاولة واحدة لكل إصحاح · الخروج من المسابقة أثناء الأسئلة (بالانتقال لتبويب آخر أو مغادرة التطبيق) يُلغي المحاولة · لن تظهر درجتك إلا بعد الامتحان الشامل.</div>
      ${rows.join('')}
      ${manualHtml()}`;
    if (useMap) {
      const root = box.querySelector('.cm');
      if (root) CM.init(root, {
        key: (me() ? me().id : '') + '|' + (Sync.serverCid() || ''),
        chapters: mapData(c),
        verify: mapVerify,
        unlock: () => {},
        reload: async () => mapData(contest() || c),
        open: (step) => { const cd = codeTyped[step] || null; delete codeTyped[step]; window.q3Go(step, cd); },
        resumable: () => false
      });
      bindMap();
    }
  }
  /* ---------- v3.0.9: خريطة الإصحاحات (js/chmap.js، تُحمَّل عند الحاجة؛ لو فشل التحميل تبقى قائمة الصفوف) ---------- */
  function loadCM() {
    if (CM || cmLoading || cmFail) return;
    cmLoading = true;
    let u; try { u = new URL('js/chmap.js?v=' + String(typeof APP_VERSION === 'string' ? APP_VERSION : '').replace(/^v/, ''), document.baseURI).href; } catch (e) { cmFail = true; cmLoading = false; return; }
    import(u).then((m) => { CM = m; cmLoading = false; if (view === 'home' && !Q && el() && el().isConnected) renderHome(); })
      .catch(() => { cmFail = true; cmLoading = false; if (view === 'home' && !Q && el() && el().isConnected) renderHome(); });
  }
  /* حالة الصف في q3 ← شكل بيانات الخريطة. step = رقم الخطوة (1..n)؛ num = رقم الإصحاح للعرض */
  function mapData(c) {
    return c.chapters.map((ch, i) => {
      const s = i + 1, st = status(c, s), k = codeFor(s), sr = (srv().steps || []).find((x) => x.step === s) || {};
      const o = { step: s, num: ch.num, sub: ch.book || '', lock: null, first: null, attempts: (sr.attempts | 0) || (info(s).used ? 1 : 0) };
      const typed = !!codeTyped[s] && !info(s).done;
      if (st === 'done' || st === 'retry') {
        o.first = { score: null, total: null };
        o.msg = st === 'retry' ? 'تم الحفظ — فُتحت لك محاولة إعادة. تُحتسب آخر نتيجة مكتملة.' : 'تم الحفظ. تظهر الدرجة بعد الامتحان الشامل.';
        if (st === 'retry') o.cta = ' 🔁 إعادة بالكود';
      } else if (st === 'locked') {
        o.lock = { why: 'before' }; o.noCode = true; o.msg = 'يُفتح بعد إنهاء الإصحاح السابق.';
      } else if (st === 'needcode' || st === 'closed') {
        if (k || typed) { o.cta = ' 🔑 كود جاهز — ابدأ'; o.msg = 'معك كود فتح لهذا الإصحاح. محاولة واحدة.'; }
        else if (st === 'needcode') { o.lock = { why: 'after' }; o.msg = 'استُهلكت المحاولة. يلزم كود من المسؤول.'; }
        else if (sr.state === 'upcoming') { o.lock = { why: 'before' }; o.msg = 'لم يُفتح هذا الإصحاح بعد. إن كان معك كود من المسؤول فاستخدمه.'; }
        else { o.lock = { why: 'after' }; o.msg = 'أُغلق هذا الإصحاح. إن كان معك كود من المسؤول فاستخدمه.'; }
      }
      return o;
    });
  }
  async function mapVerify(step, code) {
    const v = String(code || '').toUpperCase().replace(/[^0-9A-F]/g, '');
    if (v.length !== 10) return 'bad';
    const r = await Sync.call('check_unlock_code', { p_code: v });
    if (!r.ok) return 'error';
    const d = r.data || {};
    if (!d.ok) return d.reason === 'USED' ? 'used' : d.reason === 'EXPIRED' ? 'expired' : 'bad';
    if (d.step !== step) return 'wrongstep';
    codeTyped[step] = v;
    return 'ok';
  }
  function bindMap() {
    const box = el(); if (!box || box.dataset.cmBound) return;
    box.dataset.cmBound = '1';
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a="chap"]'); if (!b) return;
      const c = contest(), s = parseInt(b.dataset.n, 10); if (!c || Q || !(s >= 1 && s <= c.chapters.length)) return;
      const k = codeFor(s), code = status(c, s) === 'ready' ? null : (k ? k.code : (codeTyped[s] || null));
      delete codeTyped[s]; window.q3Go(s, code);
    });
  }
  /* v3.0.1: خانة الكود اليدوي مشتركة بين الشاشة الرئيسية وشاشة ما بعد الشامل */
  function manualHtml() {
    return `<details class="q3-manual"><summary>لدي كود من المسؤول</summary>
        <div class="q3-manual-row"><input id="q3-code" class="form-control" dir="ltr" placeholder="XXXXX-XXXXX" autocapitalize="characters" />
        <button class="btn btn-primary btn-sm" onclick="q3UseTypedCode()">استخدام</button></div></details>`;
  }
  /* v3.0.1: بعد الشامل تبقى الإعادة بالكود ممكنة: نعرض الإصحاحات التي لها كود جاهز + خانة الكود */
  function retryBlock(c) {
    const rows = [];
    for (let s = 1; s <= c.chapters.length; s++) if (info(s).done && codeFor(s)) rows.push(row(c, s));
    if (info(0).done && codeFor(0)) rows.push(row(c, 0));
    return (rows.length ? '<div class="q3-rules">فتح لك المسؤول محاولة إعادة. تُحتسب آخر نتيجة مكتملة.</div>' + rows.join('') : '') + manualHtml();
  }
  function row(c, s) {
    const st = status(c, s), k = codeFor(s), label = esc(stepLabel(c, s));
    const map = {
      done: ['✅', 'تم الحفظ', ''], locked: ['🔒', 'يُفتح بعد إنهاء السابق', ''], closed: ['⏳', 'غير مفتوح الآن', ''],
      needcode: ['🔑', 'استُهلكت المحاولة — يلزم كود من المسؤول', ''], ready: ['📖', 'جاهز', `<button class="btn btn-primary btn-sm" onclick="q3Go(${s}, null)">ابدأ</button>`],
      retry: ['✅', 'تم الحفظ — فُتحت لك محاولة جديدة', `<button class="btn btn-gold btn-sm" onclick="q3Go(${s}, ${jsArg(k ? k.code : '')})">🔁 إعادة بالكود</button>`]
    };
    let btn = map[st][2];
    if ((st === 'needcode' || st === 'closed') && k) btn = `<button class="btn btn-gold btn-sm" onclick="q3Go(${s}, ${jsArg(k.code)})">🔑 كود جاهز — ابدأ</button>`;
    return `<div class="q3-row q3-${st}"><span class="q3-ic">${map[st][0]}</span><div class="q3-info"><strong>${label}</strong><small>${map[st][1]}</small></div>${btn}</div>`;
  }

  /* ---------- كود يكتبه الخادم يدويًا (احتياطي؛ الأصل أن يصله تلقائيًا) ---------- */
  window.q3UseTypedCode = async function () {
    const v = ($('q3-code').value || '').toUpperCase().replace(/[^0-9A-F]/g, '');
    if (v.length !== 10) return showToast('الكود 10 خانات (أرقام وحروف A–F)', 'error');
    const r = await Sync.call('check_unlock_code', { p_code: v });
    if (!r.ok) return showToast(r.error, 'error');
    const d = r.data || {};
    if (!d.ok) return showToast(d.reason === 'USED' ? ERR.CODE_USED : d.reason === 'EXPIRED' ? ERR.CODE_EXPIRED : ERR.BAD_CODE, 'error');
    if (d.step == null) return showToast('هذا كود قديم لا يخص إصحاحًا محددًا.', 'error');
    window.q3Go(d.step, v);
  };

  /* ---------- القراءة ---------- */
  window.q3Go = async function (step, code) {
    const c = contest(); if (!c || Q) return;
    readStep = step; pendingCode = code || null; view = 'read';
    const box = el();
    if (step === 0) { box.innerHTML = introHtml(c, 0); return; }
    const ch = c.chapters[step - 1];
    box.innerHTML = `<div class="q3-read"><div class="q3-read-h">📖 ${esc(stepLabel(c, step))}</div><div id="q3-text" class="q3-text">…جارٍ تحميل النص</div>${startBar()}</div>`;
    let html = '';
    try {
      if (!ch.bookId) throw new Error('nobook');
      const b = await Books.load(ch.bookId);
      const cc = b.chapters && b.chapters[String(ch.num)];
      if (!cc) throw new Error('nochap');
      html = (cc.verses || []).map((t, i) => `<p class="q3-verse"><sup>${ar(i + 1)}</sup> ${esc(t)}</p>`).join('') ||
        (cc.blocks || []).map((x) => `<h4>${esc(x.title)}</h4><p>${esc(x.text)}</p>`).join('');
    } catch (e) { html = '<p class="results-empty">تعذّر تحميل نص الإصحاح الآن. يمكنك بدء الأسئلة.</p>'; }
    const t = $('q3-text'); if (t && view === 'read') t.innerHTML = html;
  };
  function startBar() { return `<div class="q3-bar"><button class="btn btn-outline" onclick="q3Home()">رجوع</button><button class="btn btn-primary" onclick="q3Begin()">ابدأ الأسئلة ←</button></div>`; }
  function introHtml(c, s) {
    return `<div class="q3-read"><div class="q3-read-h">🏁 ${esc(stepLabel(c, s))}</div>
      <p class="q3-text">${ar(Math.min(FINAL_N, pool(c, 0).length))} سؤالًا من كل الإصحاحات. محاولة واحدة.</p>${startBar()}</div>`;
  }
  window.q3Home = function () { view = 'home'; readStep = null; pendingCode = null; renderQuiz(); };

  /* ---------- اختيار الأسئلة (من مسابقة بطرس) ---------- */
  const lvl = (q) => { const l = String(q.level || '').toLowerCase(); if (/easy|سهل/.test(l)) return 'e'; if (/med|متوسط/.test(l)) return 'm'; if (/hard|صعب/.test(l)) return 'h'; return null; };
  function pickChapter(qs) {
    const want = Math.min(PER_CH, qs.length), res = [];
    const byT = {}; qs.forEach((q) => { (byT[q.type] = byT[q.type] || []).push(q); });
    let hasTl = false;
    TYPES.forEach((t) => {
      const p = shuffle((byT[t] || []).filter((q) => !(q.events && hasTl)));
      if (p.length && res.length < want) { res.push(p[0]); if (p[0].events) hasTl = true; }
    });
    shuffle(qs).forEach((q) => { if (res.length < want && res.indexOf(q) < 0 && !(q.events && hasTl)) { res.push(q); if (q.events) hasTl = true; } });
    shuffle(qs).forEach((q) => { if (res.length < want && res.indexOf(q) < 0) res.push(q); });
    return shuffle(res);
  }
  function pickFinal(qs) {
    const want = Math.min(FINAL_N, qs.length), res = [], g = { e: [], m: [], h: [] };
    qs.forEach((q) => { const l = lvl(q); if (l) g[l].push(q); });
    ['e', 'm', 'h'].forEach((k) => shuffle(g[k]).slice(0, Math.floor(FINAL_N / 3)).forEach((q) => res.push(q)));
    shuffle(qs).forEach((q) => { if (res.length < want && res.indexOf(q) < 0) res.push(q); });
    return shuffle(res.slice(0, want));
  }
  function prep(q) {
    if (q.events) return Object.assign({}, q, { _ev: shuffle(q.events), _order: [] });
    const idx = shuffle(q.opts.map((_, i) => i));
    return Object.assign({}, q, { _opts: idx.map((i) => q.opts[i]), _map: idx });
  }

  /* ---------- بدء المحاولة ---------- */
  window.q3Begin = async function () {
    if (busy) return; busy = true;
    try {
      const c = contest(), step = readStep; if (!c || step == null) return;
      const id = Sync.uuid(), cid = Sync.serverCid(), code = pendingCode;
      let queued = false;
      if (navigator.onLine !== false) {
        if (Sync.pendingCount() > 0) { try { await Sync.flush(); } catch (e) {} }
        if (Sync.pendingCount() === 0) {
          const r = await Sync.call('quiz_start', { p_cid: cid, p_step: step, p_attempt: id, p_code: code });
          if (!r.ok && !r.offline) { showToast(ERR[r.code] || r.error, 'error'); Sync.pull(); if (r.code) q3Home(); return; }
          queued = !r.ok;
        } else queued = true;
      } else queued = true;
      if (queued) Sync.quizOp({ t: 'qstart', cid: cid, step: step, attempt: id, code: code });
      const picked = (step === 0 ? pickFinal(pool(c, 0)) : pickChapter(pool(c, step))).map(prep);
      if (!picked.length) { showToast('لا توجد أسئلة في هذا الإصحاح.', 'error'); return; }
      const s = ls(); s.steps[step] = Object.assign({}, s.steps[step], { used: true }); s.active = { id: id, step: step, ts: Date.now() }; lsSave(s);
      Q = { id: id, step: step, qs: picked, i: 0, answers: {}, t0: Date.now(), left: 0, locked: false };
      view = 'q'; pendingCode = null;
      drawQ();
    } finally { busy = false; }
  };

  /* ---------- عرض السؤال ---------- */
  function limitFor(q) { const t = timing(contest()); return q.events ? t.tl : t.q; }
  function drawQ() {
    stopTimer();
    const q = Q.qs[Q.i], c = contest(), box = el(), total = Q.qs.length, lim = limitFor(q);
    Q.locked = false;
    let body;
    if (q.events) {
      body = `<div class="q3-tl-hint">اضغط الأحداث بترتيب حدوثها (من الأول إلى الأخير)</div><div id="q3-tl">${q._ev.map((e) => `<button class="q3-tl-item" id="q3-e${e.id}" onclick="q3Pick(${e.id})">${esc(e.text)}<span class="q3-tl-n"></span></button>`).join('')}</div>
        <div class="q3-bar"><button class="btn btn-outline btn-sm" onclick="q3TlReset()">↺ إعادة</button><button class="btn btn-primary btn-sm" id="q3-tl-ok" disabled onclick="q3TlDone()">تأكيد</button></div>`;
    } else {
      body = q._opts.map((o, i) => `<button class="quiz-option" onclick="q3Ans(${i})">${esc(o)}</button>`).join('');
    }
    box.innerHTML = `
      <div class="quiz-progress"><span>${esc(stepLabel(c, Q.step))}</span><span>${ar(Q.i + 1)} / ${ar(total)}</span></div>
      <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${Math.round((Q.i / total) * 100)}%"></div></div>
      ${lim ? `<div class="quiz-timer"><span id="q3-left">${ar(lim)}</span><div class="quiz-timer-track"><div class="quiz-timer-fill" id="q3-fill"></div></div></div>` : ''}
      <div class="quiz-card"><div class="q3-type">${esc(q.type || '')}</div><div class="quiz-q">${esc(q.q)}</div>${body}</div>`;
    if (lim) {
      Q.left = lim; tickT = Date.now();
      timerId = setInterval(() => {
        if (!Q || Q.locked) return;
        const rem = Math.max(0, lim - Math.floor((Date.now() - tickT) / 1000));
        const l = $('q3-left'), f = $('q3-fill');
        if (l) l.textContent = ar(rem); if (f) f.style.width = (rem / lim) * 100 + '%';
        if (rem <= 0) timeUp();
      }, 250);
    }
  }
  function record(val) { const q = Q.qs[Q.i]; if (val !== undefined) Q.answers[q.id] = val; }
  function next() {
    stopTimer();
    if (Q.i + 1 < Q.qs.length) { Q.i++; drawQ(); } else finish();
  }
  function timeUp() { if (!Q || Q.locked) return; Q.locked = true; stopTimer(); showToast('انتهى الوقت', 'warning'); next(); }
  window.q3Ans = function (i) {
    if (!Q || Q.locked) return; Q.locked = true; stopTimer();
    record(Q.qs[Q.i]._map[i]);                     // نخزّن رقم الخيار الأصلي لا المعروض
    document.querySelectorAll('#quiz-container .quiz-option').forEach((b, k) => b.classList.toggle('selected', k === i));
    setTimeout(next, 250);
  };
  window.q3Pick = function (id) {
    if (!Q || Q.locked) return; const q = Q.qs[Q.i];
    if (q._order.indexOf(id) >= 0) return;
    q._order.push(id);
    const b = $('q3-e' + id); b.classList.add('picked'); b.querySelector('.q3-tl-n').textContent = ar(q._order.length);
    $('q3-tl-ok').disabled = q._order.length !== q._ev.length;
  };
  window.q3TlReset = function () {
    if (!Q || Q.locked) return; const q = Q.qs[Q.i]; q._order = [];
    document.querySelectorAll('#q3-tl .q3-tl-item').forEach((b) => { b.classList.remove('picked'); b.querySelector('.q3-tl-n').textContent = ''; });
    $('q3-tl-ok').disabled = true;
  };
  window.q3TlDone = function () {
    if (!Q || Q.locked) return; const q = Q.qs[Q.i];
    if (q._order.length !== q._ev.length) return;
    Q.locked = true; stopTimer(); record(q._order.slice()); next();
  };

  /* ---------- التسليم والإلغاء ---------- */
  function finish() {
    const done = Q, s = ls();
    Sync.quizOp({ t: 'qdone', attempt: done.id, step: done.step, picked: done.qs.map((q) => q.id), answers: done.answers, secs: Math.round((Date.now() - done.t0) / 1000) });
    s.steps[done.step] = Object.assign({}, s.steps[done.step], { done: true, used: true }); s.active = null; lsSave(s);
    Q = null; view = 'saved'; setStore(REV, null);   // v3.0.1: نتيجة محفوظة قد تتغيّر بإعادة بعد الشامل
    const c = contest(), box = el(), isFinal = done.step === 0;
    box.innerHTML = `<div class="q3-saved"><div class="q3-saved-ic">✅</div><h3>تم حفظ إجاباتك</h3>
      <p id="q3-sync">${Sync.pendingCount() ? '⏳ ستُرسل للمسؤول فور توفر الاتصال.' : '📤 أُرسلت للمسؤول.'}</p>
      <p class="q3-note">${isFinal ? 'سيظهر لك التصحيح والدرجة بعد لحظات.' : 'الدرجة تظهر بعد الامتحان الشامل.'}</p>
      <button class="btn btn-primary" onclick="q3Home()">متابعة</button></div>`;
    haptic && haptic([30, 40, 30]);
    setTimeout(() => { const p = $('q3-sync'); if (p && view === 'saved') p.textContent = Sync.pendingCount() ? '⏳ ستُرسل للمسؤول فور توفر الاتصال.' : '📤 أُرسلت للمسؤول.'; }, 1500);
    setTimeout(() => { Sync.pull(); }, 800);
  }
  function cancelActive(msg, silent) {
    stopTimer();
    const s = ls(), a = s.active;
    if (!a) { Q = null; return; }
    Sync.quizOp({ t: 'qcancel', attempt: a.id });
    s.active = null; s.steps[a.step] = Object.assign({}, s.steps[a.step], { used: true }); lsSave(s);
    Q = null; view = 'home';
    if (silent && !msg) leftNotice = true;
    if (!silent) { showToast(msg || 'أُلغيت المحاولة لأنك غادرت الصفحة. يلزم كود من المسؤول للإعادة.', 'warning'); renderQuiz(); }
  }
  /* الخروج من التطبيق/التبويب أثناء الحل ← إلغاء (كما في مسابقة بطرس) */
  document.addEventListener('visibilitychange', () => { if (document.hidden && Q) cancelActive(null, true); else if (!document.hidden && !Q) { if (leftNotice) { leftNotice = false; showToast('أُلغيت المحاولة لأنك غادرت الصفحة. يلزم كود من المسؤول للإعادة.', 'warning'); } renderQuiz(); } });
  /* الانتقال لتبويب آخر داخل التطبيق أثناء الحل ← إلغاء (بعد تأكيد حتى لا تُلغى بلمسة خاطئة) */
  const _switchTab = window.switchTab;
  window.switchTab = function (name) {
    if (Q && name !== 'contest') {
      if (!window.confirm('الانتقال لتبويب آخر سيلغي محاولتك الحالية، ويلزم كود من المسؤول للإعادة. هل تريد الخروج؟')) return;
      cancelActive('أُلغيت المحاولة لأنك غادرت المسابقة. يلزم كود من المسؤول للإعادة.');
    }
    return _switchTab.apply(this, arguments);
  };
  window.addEventListener('pagehide', () => { if (Q) cancelActive(null, true); });
  /* صفحة اتقفلت أثناء الحل: نلغي المحاولة المعلّقة عند أول تشغيل */
  function recoverActive() {
    const s = ls();
    if (s.active && !Q) { cancelActive(null, true); setTimeout(() => showToast('أُلغيت محاولة سابقة لم تكتمل. يلزم كود من المسؤول للإعادة.', 'warning'), 600); }
  }

  /* ---------- بعد الامتحان الشامل: الدرجات والتصحيح ---------- */
  async function renderDone(c) {
    const box = el(); view = 'done';
    const cached = getStore(REV, null);
    if (cached && cached.cid === Sync.serverCid() && cached.uid === (me() || {}).id) return paintReview(c, cached);
    if (Sync.pendingCount() > 0) { box.innerHTML = '<div class="q3-saved"><div class="q3-saved-ic">⏳</div><h3>إجاباتك محفوظة</h3><p>ستظهر النتيجة فور وصولها للسيرفر.</p></div>'; return; }
    box.innerHTML = '<p class="results-empty">…جارٍ تحميل النتيجة</p>';
    if (reviewBusy) return; reviewBusy = true;
    const r = await Sync.call('quiz_review', { p_cid: Sync.serverCid() });
    reviewBusy = false;
    if (!r.ok) { box.innerHTML = `<p class="results-empty">${esc(r.error)}</p><div style="text-align:center"><button class="btn btn-outline btn-sm" onclick="q3Home()">إعادة المحاولة</button></div>`; return; }
    const d = Object.assign({ cid: Sync.serverCid(), uid: (me() || {}).id }, r.data);
    setStore(REV, d);
    if (view === 'done') paintReview(c, d);
  }
  function itemHtml(it, n) {
    const q = it.q, mine = it.mine; let ok = false, ans;
    if (q.events) {
      const right = q.events.slice().sort((a, b) => a.correctOrder - b.correctOrder);
      ok = Array.isArray(mine) && mine.length === right.length && right.every((e, i) => e.id === mine[i]);
      const txt = (id) => (q.events.find((e) => e.id === id) || {}).text || '—';
      ans = `<div>الترتيب الصحيح: ${right.map((e) => esc(e.text)).join(' ← ')}</div>${ok ? '' : `<div class="q3-mine">ترتيبك: ${Array.isArray(mine) ? mine.map((i) => esc(txt(i))).join(' ← ') : 'لم تُجب'}</div>`}`;
    } else {
      ok = typeof mine === 'number' && mine === q.ans;
      ans = `<div>الصحيح: ${esc(q.opts[q.ans])}</div>${ok ? '' : `<div class="q3-mine">إجابتك: ${typeof mine === 'number' ? esc(q.opts[mine]) : 'لم تُجب'}</div>`}`;
    }
    return `<div class="q3-rev ${ok ? 'ok' : 'bad'}"><div class="q3-rev-q">${ar(n)}. ${esc(q.q)}</div>${ans}${q.ref ? `<small>📖 ${esc(q.ref)}</small>` : ''}</div>`;
  }
  function paintReview(c, d) {
    const pct = d.total_total ? Math.round((d.total_score / d.total_total) * 100) : 0;
    el().innerHTML = `<div class="q3-final"><div class="q3-final-ic">🏆</div><h3>أنهيت المسابقة</h3>
      <div class="q3-final-score" dir="ltr">${ar(d.total_score)} / ${ar(d.total_total)} · ${ar(pct)}%</div></div>
      ${(d.steps || []).map((s) => `<details class="q3-step"><summary><span>${esc(s.title)}</span><b dir="ltr">${ar(s.score)} / ${ar(s.total)}</b></summary>${(s.items || []).map((it, i) => itemHtml(it, i + 1)).join('')}</details>`).join('')}
      ${retryBlock(c)}`;
  }

  /* ---------- نقاط الدخول التي يستدعيها app.js ---------- */
  window.renderQuiz = function () { if (Q) return; if (view === 'read' && readStep != null) return; if (view === 'saved') return; if (view !== 'done') view = 'home'; renderHome(); };
  window.isQuizInProgress = function () { return !!Q; };
  window.resetQuizState = function () { if (Q) cancelActive('أُلغيت المحاولة.', true); stopTimer(); if (view === 'q') view = 'home'; const rb = $('quiz-result-box'); if (rb) rb.style.display = 'none'; };

  /* خطاف Sync: نتيجة عمليات البدء/التسليم/الإلغاء من الطابور */
  Sync.hook({
    ok: function (op) { if (op.t === 'qdone') { setStore(REV, null); Sync.pull(); } },
    drop: function (op, msg) {
      const s = ls();
      if (op.t === 'qstart' || op.t === 'qdone') { s.steps[op.step] = {}; lsSave(s); }
      const k = Object.keys(ERR).find((x) => msg.indexOf(x) >= 0);
      if (op.t !== 'qcancel') showToast('لم تُسجَّل محاولتك: ' + (k ? ERR[k] : 'رفضها السيرفر.'), 'warning');
      Sync.pull(); if (!Q) renderQuiz();
    }
  });

  /* ============================================================
     لوحة النتائج المباشرة (مسؤول/مالك): كل إصحاح على حدة + الإجمالي، والترتيب بالدرجات
     ============================================================ */
  let boardCol = 'total';
  let boardCid = null, pastBoard = null, contestList = null, listLoading = false;   // v3.0.4: null = المسابقة الحالية
  function boardData() { return boardCid ? pastBoard : getStore('ds_v3_board', null); }
  window.q3BoardCol = function (v) { boardCol = v; renderBoard(); };
  let listFailed = false;   // v3.0.5: لو فشلت القائمة (27 لم يُشغَّل مثلًا) لا نعيد المحاولة مع كل رسم
  async function loadContestList() {
    if (listLoading || listFailed) return; listLoading = true;
    const r = await Sync.call('staff_contests_list', {});
    listLoading = false;
    if (r.ok && Array.isArray(r.data)) { contestList = r.data; renderBoard(); }
    else { listFailed = true; setTimeout(() => { listFailed = false; }, 60000); }
  }

  /* v3.0.5: تحديث مستقل للوحة (كل ٦ ثوانٍ وهي ظاهرة) بدل انتظار دورة pull الطويلة (١٥ ثانية + ٨ طلبات) */
  let boardBusy = false;
  const boardVisible = () => { const p = $('admin-sub-live'); return !!p && p.style.display !== 'none' && p.offsetParent !== null && !document.hidden; };
  async function boardFetch(force) {
    if (boardBusy || boardCid) return;                       // مسابقة سابقة: للعرض فقط
    if (!force && !boardVisible()) return;
    const u = me(); if (!u || (u.role !== 'admin' && u.role !== 'owner')) return;
    boardBusy = true;
    try {
      const r = await Auth.rpc('staff_quiz_board', { p_cid: null });
      boardErr = !r.ok;
      if (r.ok) boardAt = Date.now();
      updateStatus();
      if (r.ok && r.data && typeof r.data === 'object') {
        const d = Object.assign({}, r.data); delete d.server_now;
        const raw = JSON.stringify(d);
        let old = null; try { old = localStorage.getItem('ds_v3_board'); } catch (e) {}
        if (raw !== old) { try { localStorage.setItem('ds_v3_board', raw); } catch (e) {} renderBoard(); }
      }
    } catch (e) { /* نتجاهل: المحاولة التالية بعد ٦ ثوانٍ */ }
    finally { boardBusy = false; }
  }
  setInterval(() => boardFetch(false), 6000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) boardFetch(false); });
  const prevSwitchLive = window.switchAdminSub;
  window.switchAdminSub = function (panel, btn) {
    const o = prevSwitchLive.apply(this, arguments);
    if (panel === 'live') { renderBoard(); boardFetch(true); }
    return o;
  };
  window.q3BoardContest = async function (v) {
    boardCol = 'total';
    if (!v) { boardCid = null; pastBoard = null; renderBoard(); return; }
    const box = $('admin-quiz-board'); if (box) box.innerHTML = '<p class="results-empty">جارٍ التحميل…</p>';
    const r = await Auth.rpc('staff_quiz_board', { p_cid: v });
    if (!r.ok) { boardCid = null; pastBoard = null; renderBoard(); showToast(r.offline ? 'يلزم اتصال بالإنترنت لعرض مسابقة سابقة.' : 'تعذّر تحميل نتائج هذه المسابقة.', 'error'); return; }
    boardCid = v; pastBoard = r.data && typeof r.data === 'object' ? r.data : null; renderBoard();
  };
  function contestPicker() {
    if (!contestList) return '';
    if (contestList.length < 2) return '';
    const ar2 = (n) => ar(n);
    return `<select class="form-control" onchange="q3BoardContest(this.value)"><option value="">المسابقة الحالية</option>${contestList.filter((x) => !x.is_current).map((x) => `<option value="${esc(x.cid)}" ${boardCid === x.cid ? 'selected' : ''}>سابقة: ${esc(x.label || x.cid)} — ${ar2(x.people)} مشارك</option>`).join('')}</select>`;
  }
  function cell(r, st) {
    const x = (r.steps || {})[st];
    if (!x) return { txt: '—', cls: 'none', v: -1 };
    if (x.score == null) return { txt: x.started ? '…' : '⛔', cls: x.started ? 'run' : 'bad', v: -1 };
    return { txt: ar(x.score) + '/' + ar(x.total), cls: 'ok', v: x.total ? x.score / x.total : 0 };
  }
  /* ---------- v3.0.7: واجهة اللوحة: حالة مباشرة + فلاتر + بحث + أزرار + بطاقة الحلقة، ثم القائمة كما كانت ---------- */
  let bStage = '', bQuery = '', bDetail = true, boardAt = 0, boardErr = false;
  const ACC = () => { try { return Auth.getAccounts() || []; } catch (e) { return []; } };
  const accOf = (id) => ACC().find((a) => a.id === id) || null;
  const norm = (s) => String(s || '').toLowerCase().replace(/[\u064B-\u065F\u0670]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').trim();
  const stageName = (code) => { const s = (Auth.STAGE_OPTIONS || []).find((x) => x.code === code); return s ? s.label : code; };
  window.q3BoardStage = (v) => { bStage = v; renderBoard(); };
  window.q3BoardSearch = (v) => { bQuery = v; renderOut(); };
  window.q3BoardQ = () => { bQuery = ''; const i = $('q3b-search'); if (i) i.value = ''; renderOut(); };
  window.q3BoardClear = () => { bStage = ''; bQuery = ''; renderBoard(); };
  window.q3BoardDetail = () => { bDetail = !bDetail; renderBoard(); };
  window.q3BoardTotal = () => { boardCol = 'total'; renderBoard(); };
  window.q3BoardRefresh = () => { if (boardCid) window.q3BoardContest(boardCid); else boardFetch(true); };
  function statusText() {
    if (boardCid) return '📁 مسابقة سابقة — للعرض فقط';
    const t = boardAt ? new Date(boardAt).toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
    if ((typeof navigator !== 'undefined' && navigator.onLine === false) || boardErr) return '🟠 بلا اتصال' + (t ? ' — آخر تحديث ' + t : '');
    if (!boardAt) return '⏳ جارٍ التحديث…';
    return '🟢 مباشر — آخر تحديث ' + t;
  }
  function updateStatus() { const e = $('q3b-status'); if (e) e.textContent = statusText(); }
  setInterval(updateStatus, 3000);

  window.renderQuizBoard = renderBoard;
  function renderBoard() {
    const box = $('admin-quiz-board'); if (!box) return;
    const d = boardData();
    if (!contestList || (!boardCid && d && d.cid && !contestList.some((x) => x.cid === d.cid))) loadContestList();
    const pick = contestPicker();
    const empty = '<p class="results-empty">لا توجد نتائج بعد — ستظهر هنا فور مشاركة أي خادم.</p>';
    if (!d || !d.cid || !(d.rows || []).length) { box.innerHTML = pick + empty; return; }
    const steps = d.steps || [];
    const colSel = `<select class="form-control" onchange="q3BoardCol(this.value)"><option value="total">الترتيب: الإجمالي</option>${steps.map((s) => `<option value="${s.step}" ${String(boardCol) === String(s.step) ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}</select>`;
    const present = []; (d.rows || []).forEach((r) => { const a = accOf(r.user_id); if (a && a.stageCode && present.indexOf(a.stageCode) < 0) present.push(a.stageCode); });
    const stageSel = present.length ? `<select class="form-control" onchange="q3BoardStage(this.value)"><option value="">كل المراحل</option>${present.map((c) => `<option value="${esc(c)}" ${bStage === c ? 'selected' : ''}>${esc(stageName(c))}</option>`).join('')}</select>` : '';
    box.innerHTML = `<div class="q3b-status" id="q3b-status">${esc(statusText())}</div>
      <div class="q3b-filters">${pick}${colSel}${stageSel}</div>
      <input id="q3b-search" class="form-control q3b-search" type="text" placeholder="🔎 بحث بالاسم" value="${esc(bQuery)}" oninput="q3BoardSearch(this.value)" autocomplete="off">
      <div class="q3b-btns">
        <button type="button" class="q3b-btn ${boardCol === 'total' ? 'on' : ''}" onclick="q3BoardTotal()">🏆 الترتيب العام</button>
        <button type="button" class="q3b-btn ${bDetail ? 'on' : ''}" onclick="q3BoardDetail()">🔎 تفصيل</button>
        <button type="button" class="q3b-btn" onclick="q3BoardRefresh()">🔄 تحديث</button>
      </div>
      <div id="q3b-out"></div>`;
    renderOut();
  }

  function renderOut() {
    const out = $('q3b-out'); if (!out) return;
    const d = boardData(); if (!d || !d.cid) return;
    const steps = d.steps || [], q = norm(bQuery);
    const rows = (d.rows || []).filter((r) => {
      if (bStage) { const a = accOf(r.user_id); if (!a || a.stageCode !== bStage) return false; }
      return !q || norm(r.name).indexOf(q) !== -1;
    });
    /* المسجّلون: الخدام النشطون (بنفس الفلاتر) + كل من له محاولة */
    const ids = new Set();
    ACC().forEach((a) => { if (a.active && a.role === 'servant' && (!bStage || a.stageCode === bStage) && (!q || norm(a.name).indexOf(q) !== -1)) ids.add(a.id); });
    rows.forEach((r) => ids.add(r.user_id));
    const registered = ids.size;
    const finished = rows.filter((r) => ((r.steps || {})[0] || {}).score != null).length;
    const scored = rows.filter((r) => r.total > 0);
    const avg = scored.length ? Math.round(scored.reduce((t, r) => t + r.score / r.total, 0) / scored.length * 100) : 0;
    const band = !scored.length ? ['لا نتائج بعد', 'mid'] : avg >= 80 ? ['ممتاز', 'good'] : avg >= 50 ? ['جيد', 'mid'] : ['يحتاج دفعة', 'low'];
    const C = 2 * Math.PI * 54, dash = (C * avg / 100).toFixed(1);

    const chips = [];
    if (bStage) chips.push(`<span class="q3b-chip">المرحلة: <b>${esc(stageName(bStage))}</b><button type="button" onclick="q3BoardStage('')" aria-label="إزالة">✕</button></span>`);
    if (q) chips.push(`<span class="q3b-chip">بحث: <b>${esc(bQuery)}</b><button type="button" onclick="q3BoardQ()" aria-label="إزالة">✕</button></span>`);
    if (chips.length) chips.push('<button type="button" class="q3b-clear" onclick="q3BoardClear()">مسح الكل</button>');

    const card = `<div class="q3b-card">
      <div class="q3b-ring"><svg viewBox="0 0 140 140" aria-hidden="true">
        <circle cx="70" cy="70" r="65" class="ticks"/><circle cx="70" cy="70" r="54" class="track"/>
        <circle cx="70" cy="70" r="54" class="arc" stroke-dasharray="${dash} ${C.toFixed(1)}" transform="rotate(-90 70 70)"/></svg>
        <div class="q3b-pct">${scored.length ? `<b>${ar(avg)}</b><small>%</small>` : '<b>—</b>'}</div></div>
      <h3>متوسط درجات الفريق</h3>
      <p class="q3b-band"><span class="${band[1]}">${band[0]}</span>${d.title ? ' — ' + esc(d.title) : ''}</p>
      <div class="q3b-line"><span><i class="dot gold"></i>أنهوا الامتحان الشامل</span><b>${ar(finished)}</b></div>
      <div class="q3b-line"><span><i class="dot"></i>لم يُنهوه بعد</span><b>${ar(Math.max(0, registered - finished))}</b></div>
      <p class="q3b-note">متوسط الدرجات لـ ${ar(scored.length)} مشارك (من أنهى إصحاحًا واحدًا على الأقل)</p></div>`;

    let list, key;
    if (boardCol === 'total') { list = rows.slice().sort((a, b) => a.rank - b.rank); key = (r) => r.score; }
    else {
      list = rows.filter((r) => cell(r, boardCol).v >= 0).sort((a, b) => ((r) => (r.steps[boardCol] || {}))(b).score - ((r) => (r.steps[boardCol] || {}))(a).score || ((a.steps[boardCol] || {}).secs || 0) - ((b.steps[boardCol] || {}).secs || 0));
      key = (r) => (r.steps[boardCol] || {}).score;
    }
    let prev = null, rk = 0;
    const html = list.map((r, i) => {
      const k = key(r); if (k !== prev) { rk = i + 1; prev = k; }
      const pct = r.total ? Math.round((r.score / r.total) * 100) : 0;
      const chipsHtml = bDetail ? `<div class="q3-chips">${steps.map((s) => { const c = cell(r, s.step); return `<span class="q3-chip ${c.cls}" title="${esc(s.label)}">${s.step === 0 ? 'ش' : 'إ' + ar(s.step)} ${c.txt}</span>`; }).join('')}</div>` : '';
      const medal = rk === 1 ? '🥇' : rk === 2 ? '🥈' : rk === 3 ? '🥉' : ar(rk);
      return `<div class="live-row"><span class="live-rank">${medal}</span><div class="live-info"><div class="live-name">${esc(r.name || '—')}</div>
        ${chipsHtml}<div class="live-bar"><i class="${pct >= 80 ? 'good' : pct >= 50 ? 'mid' : 'low'}" style="width:${pct}%"></i></div></div>
        <span class="badge badge-blue" dir="ltr">${ar(r.score)} / ${ar(r.total)}</span></div>`;
    }).join('');
    out.innerHTML = `${chips.length ? `<div class="q3b-chips">${chips.join('')}</div>` : ''}
      <p class="q3b-summary">${ar(registered)} مسجّل — ${ar(rows.length)} شاركوا — ${ar(Math.max(0, steps.length - 1))} إصحاحات</p>
      ${card}
      ${boardCid ? `<p style="font-size:.8rem;color:var(--text-muted);margin:0 0 8px">مسابقة سابقة: ${esc(d.title || d.cid)} (للعرض فقط)</p>` : ''}
      <div class="live-sum"><div><strong>${ar(rows.length)}</strong><span>مشارك</span></div><div><strong>${ar(finished)}</strong><span>أنهوا الشامل</span></div></div>
      ${html || '<p class="results-empty">لا نتائج مطابقة.</p>'}`;
  }

  /* ============================================================
     أكواد الفتح لكل إصحاح (يستبدل دوال app.js بنفس المعرّفات في اللوحة)
     ============================================================ */
  function fillStepSelect() {
    const sel = $('admin-unlock-step'); if (!sel) return;
    const c = contest(), cur = sel.value;
    if (!c) { sel.innerHTML = '<option value="">— لا توجد مسابقة —</option>'; return; }
    sel.innerHTML = '<option value="">— اختر الإصحاح —</option>' + c.chapters.map((x, i) => `<option value="${i + 1}">${esc(stepLabel(c, i + 1))}</option>`).join('') + '<option value="0">الامتحان الشامل</option>';
    if (cur !== '') sel.value = cur;
  }
  window.renderAdminUnlock = async function () {
    const sel = $('admin-unlock-user'), cur = sel.value;
    const people = getAccounts().filter((a) => a.active && a.id !== (getCurrentUser() || {}).id);
    sel.innerHTML = '<option value="">— اختر الخادم —</option>' + people.map((a) => `<option value="${esc(a.id)}">${esc(a.name)}${a.stage ? ' — ' + esc(a.stage) : ''}</option>`).join('');
    if (people.some((a) => a.id === cur)) sel.value = cur;
    fillStepSelect();
    const list = $('admin-unlock-list');
    const r = await Sync.call('admin_list_unlock_codes', {});
    if (!r.ok) { list.innerHTML = `<p style="text-align:center;color:var(--text-muted)">${esc(r.error)}</p>`; return; }
    const rows = Array.isArray(r.data) ? r.data : [], c = contest();
    const lbl = { active: '<span class="badge badge-green">فعّال</span>', used: '<span class="badge badge-gold">مستعمل</span>', expired: '<span class="badge badge-red">منتهي</span>' };
    list.innerHTML = rows.length ? `<div class="table-wrap"><table><thead><tr><th>الخادم</th><th>الإصحاح</th><th>الكود</th><th>الحالة</th><th>ينتهي</th><th></th></tr></thead><tbody>` +
      rows.map((k) => `<tr><td>${esc(k.user_name)}</td><td>${c && k.step != null && k.step <= c.chapters.length ? esc(stepLabel(c, k.step)) : '—'}</td><td dir="ltr"><strong>${esc(fmtCode(k.code))}</strong></td><td>${lbl[k.state] || ''}</td>
        <td>${esc(fmtOpenDate(k.expires_at))}${k.state === 'active' ? `<div style="font-size:.74rem;color:var(--text-muted)">${esc(fmtRemaining(k.expires_at))}</div>` : ''}</td>
        <td>${k.state === 'active' ? `<button class="btn btn-outline btn-sm" onclick="adminRevokeUnlock(${jsArg(k.id)})">إلغاء</button>` : ''}</td></tr>`).join('') + '</tbody></table></div>'
      : '<p style="text-align:center;color:var(--text-muted);padding:14px">لم تُولَّد أكواد لهذه المسابقة بعد.</p>';
  };
  window.adminCreateUnlock = async function () {
    if (!requireRole('admin', 'owner')) return;
    const uid = $('admin-unlock-user').value, st = $('admin-unlock-step').value;
    if (!UUID_RE.test(uid)) return showToast('اختر الخادم أولًا', 'error');
    if (st === '') return showToast('اختر الإصحاح', 'error');
    const mins = readUnlockMinutes();
    const r = await Sync.call('admin_create_unlock_code', { p_user: uid, p_step: parseInt(st, 10), p_minutes: mins });
    if (!r.ok) return showToast(r.error, 'error');
    const d = r.data || {}, box = $('admin-unlock-new');
    box.innerHTML = `🔑 أُرسل الكود إلى تطبيق <strong>${esc(d.user_name || '')}</strong> (يظهر له زر «كود جاهز» خلال دقيقة، أو فورًا عند فتح المسابقة).<br>
      <span dir="ltr" style="letter-spacing:1px">${esc(fmtCode(d.code || ''))}</span> — صالح ${esc(fmtDuration(mins))}، لمرة واحدة، لهذا الإصحاح فقط.`;
    box.style.display = '';
    window.renderAdminUnlock();
  };

  /* ============================================================
     رفع أسئلة المالك: يقبل صيغة مسابقة بطرس ويحوّلها إلى v3 مع معاينة قبل الرفع
     ============================================================ */
  let staged = null;
  function normQ(raw, id, errs, where) {
    const q = { id: id, type: String(raw.type || '').trim(), q: String(raw.q || '').trim(), level: raw.level ? String(raw.level).trim() : undefined, ref: raw.ref ? String(raw.ref).trim() : undefined };
    if (!q.q) { errs.push(where + ': سؤال بلا نص'); return null; }
    if (raw.isTimeline || Array.isArray(raw.events)) {
      const ev = raw.events;
      if (!Array.isArray(ev) || ev.length < 2 || ev.length > 8) { errs.push(where + ': سؤال ترتيب يحتاج من 2 إلى 8 أحداث'); return null; }
      const ords = ev.map((e) => parseInt(e.correctOrder, 10)).sort((a, b) => a - b);
      if (ords.some((o, i) => o !== i + 1)) { errs.push(where + ': correctOrder يجب أن يكون 1..' + ev.length + ' بلا تكرار'); return null; }
      q.isTimeline = true;
      q.events = shuffle(ev.map((e, i) => ({ id: i + 1, correctOrder: parseInt(e.correctOrder, 10), text: String(e.text || '').trim() })));   // يُخلط عند الرفع فلا يكشف ترتيب الملف الصواب
      if (q.events.some((e) => !e.text)) { errs.push(where + ': حدث بلا نص'); return null; }
    } else {
      const o = raw.opts || raw.options;
      if (!Array.isArray(o) || o.length < 2 || o.length > 6) { errs.push(where + ': الخيارات من 2 إلى 6'); return null; }
      const a = parseInt(raw.ans != null ? raw.ans : raw.answer, 10);
      if (isNaN(a) || a < 0 || a >= o.length) { errs.push(where + ': رقم الإجابة خارج المدى'); return null; }
      q.opts = o.map((x) => String(x).trim()); q.ans = a;
    }
    Object.keys(q).forEach((k) => q[k] === undefined && delete q[k]);
    return q;
  }
  function normalize(src) {
    const errs = [], warns = [];
    if (src && src.v === 3) return { data: src, errs: [], warns: [], sum: summary(src) };
    if (!src || !Array.isArray(src.books)) return { data: null, errs: ['الصيغة غير معروفة: المتوقع ملف مسابقة بطرس (books) أو v3'], warns: [], sum: '' };
    const lib = (Sync.books() || []), out = { v: 3, title: String(src.title || ''), timing: { q: DEF_Q, tl: DEF_TL }, chapters: [], final: [] };
    if (src.timing) { const q = parseInt(src.timing.q != null ? src.timing.q : src.timing.mc, 10), t = parseInt(src.timing.tl != null ? src.timing.tl : src.timing.timeline, 10); if (!isNaN(q)) out.timing.q = q; if (!isNaN(t)) out.timing.tl = t; }
    src.books.forEach((b, bi) => {
      const hit = lib.find((x) => x.id === b.bookId || x.title === b.name || x.short_title === b.name);
      if (!hit) warns.push('السفر «' + b.name + '» غير مسجّل في الأسفار: لن يظهر نص القراءة له.');
      (b.chapters || []).forEach((ch) => {
        const ci = out.chapters.length + 1, qs = [];
        (ch.questions || []).forEach((raw, k) => { const q = normQ(raw, 'c' + ci + 'q' + (k + 1), errs, b.name + ' إصحاح ' + ch.num + ' سؤال ' + (k + 1)); if (q) qs.push(q); });
        if (qs.length < PER_CH) warns.push(b.name + ' إصحاح ' + ch.num + ': ' + qs.length + ' سؤالًا فقط (المطلوب ' + PER_CH + ' على الأقل).');
        out.chapters.push({ book: String(b.name), bookId: hit ? hit.id : null, num: parseInt(ch.num, 10), qs: qs });
      });
      (b.finalQuestions || []).forEach((raw, k) => { const q = normQ(raw, 'f' + (out.final.length + 1), errs, b.name + ' شامل ' + (k + 1)); if (q) out.final.push(q); });
    });
    if (!out.chapters.length) errs.push('لا توجد إصحاحات');
    if (out.final.length < FINAL_N) warns.push('بنك الامتحان الشامل ' + out.final.length + ' سؤالًا (الأفضل ' + FINAL_N + ' فأكثر بـ10 سهل/10 متوسط/10 صعب).');
    const ids = {}; out.chapters.forEach((c) => c.qs.forEach((q) => { ids[q.id] = 1; })); out.final.forEach((q) => { ids[q.id] = 1; });
    const n = out.chapters.reduce((t, c) => t + c.qs.length, 0) + out.final.length;
    if (Object.keys(ids).length !== n) errs.push('معرّفات الأسئلة غير فريدة');
    if (JSON.stringify(out).length > 190000) errs.push('الملف أكبر من الحد (200 ألف حرف). قلّل الأسئلة.');
    return { data: errs.length ? null : out, errs: errs, warns: warns, sum: summary(out) };
  }
  const summary = (d) => d && d.chapters ? `${ar(d.chapters.length)} إصحاحًا — ${d.chapters.map((c) => ar(c.qs.length)).join('، ')} سؤالًا — الشامل ${ar((d.final || []).length)} سؤالًا` : '';
  window.saveOwnerContestJson = async function () {
    if (!requireRole('owner')) return;
    const box = $('owner-contest-preview');
    if (staged) {
      const data = staged; staged = null;
      const sched = getStore(STORE.schedule, DEFAULT_SCHEDULE) || DEFAULT_SCHEDULE, t = schedTimes(sched), label = sched.book || data.title || '';
      const r = await Sync.call('admin_save_contest', { p_cid: contestIdFor(data, label), p_book_id: sched.bookId || null, p_book_label: label, p_info: sched.info || '',
        p_timer: data.timing.q, p_starts: t.starts, p_ends: t.ends, p_questions: JSON.stringify(data), p_base_cid: null });
      $('owner-contest-btn') && ($('owner-contest-btn').textContent = 'فحص ورفع الأسئلة');
      if (!r.ok) return showToast(r.error, 'error');
      if (box) box.innerHTML = '';
      resetQuizState(); showToast('تم رفع المسابقة'); adminAfterSave(); return;
    }
    let parsed; try { parsed = JSON.parse($('owner-contest-json').value); } catch (e) { return showToast('خطأ في صيغة JSON', 'error'); }
    const n = normalize(parsed);
    if (box) box.innerHTML = (n.errs.length ? `<div class="sched-note" style="border-color:var(--danger)"><strong>أخطاء (لن يُرفع):</strong><br>${n.errs.slice(0, 12).map(esc).join('<br>')}</div>` : '') +
      (n.warns.length ? `<div class="sched-note"><strong>تنبيهات:</strong><br>${n.warns.slice(0, 12).map(esc).join('<br>')}</div>` : '') + (n.sum ? `<p class="json-hint">${esc(n.sum)}</p>` : '');
    if (!n.data) return;
    staged = n.data;
    $('owner-contest-btn') && ($('owner-contest-btn').textContent = 'تأكيد الرفع (سيستبدل المسابقة الحالية)');
  };

  /* v3.0.3: رفع أكثر من ملف JSON للسفر الواحد ودمجها في مسابقة واحدة قبل الفحص */
  function mergeFiles(list) {
    const errs = [], kind = (j) => (j && j.v === 3 && Array.isArray(j.chapters)) ? 'v3' : (j && Array.isArray(j.books) ? 'peter' : 'bad');
    list.forEach((x) => { if (kind(x.json) === 'bad') errs.push('الملف «' + x.name + '»: صيغة غير معروفة (المتوقع ملف مسابقة بطرس أو v3)'); });
    if (errs.length) return { errs: errs };
    const kinds = list.map((x) => kind(x.json));
    if (kinds.some((k) => k !== kinds[0])) return { errs: ['لا يمكن دمج ملفات بصيغ مختلفة (بطرس مع v3). ارفع كل صيغة على حدة.'] };
    const title = (list.find((x) => x.json.title) || { json: {} }).json.title || '', timing = (list.find((x) => x.json.timing) || { json: {} }).json.timing;
    const seen = {}, dup = (key, name) => { if (seen[key]) { errs.push('الإصحاح مكرر بين الملفات: ' + name); return true; } seen[key] = 1; return false; };
    let out;
    if (kinds[0] === 'peter') {
      out = { title: title, books: [] }; if (timing) out.timing = timing;
      list.forEach((x) => x.json.books.forEach((b) => {
        const key = b.bookId || b.name; let t = out.books.find((y) => (y.bookId || y.name) === key);
        if (!t) { t = Object.assign({}, b, { chapters: [], finalQuestions: [] }); out.books.push(t); }
        (b.chapters || []).forEach((ch) => { if (!dup('p|' + key + '|' + parseInt(ch.num, 10), (b.name || key) + ' إصحاح ' + ch.num)) t.chapters.push(ch); });
        (b.finalQuestions || []).forEach((fq) => t.finalQuestions.push(fq));
      }));
    } else {
      out = { v: 3, title: title, timing: timing || { q: DEF_Q, tl: DEF_TL }, chapters: [], final: [] };
      list.forEach((x) => {
        x.json.chapters.forEach((ch) => { if (!dup('v|' + (ch.bookId || ch.book) + '|' + ch.num, (ch.book || '') + ' إصحاح ' + ch.num)) out.chapters.push(ch); });
        (x.json.final || []).forEach((fq) => out.final.push(fq));
      });
      out.chapters.forEach((c, i) => { (c.qs || []).forEach((q, k) => { q.id = 'c' + (i + 1) + 'q' + (k + 1); }); });
      out.final.forEach((q, i) => { q.id = 'f' + (i + 1); });
    }
    return errs.length ? { errs: errs } : { data: out, errs: [] };
  }
  window.ownerContestFilesPicked = async function (inp) {
    if (!requireRole('owner')) { inp.value = ''; return; }
    const files = Array.from(inp.files || []), box = $('owner-contest-preview'), fail = (m) => { if (box) box.innerHTML = '<div class="sched-note" style="border-color:var(--danger)"><strong>أخطاء (لن يُرفع):</strong><br>' + m.map(esc).join('<br>') + '</div>'; };
    inp.value = '';
    if (!files.length) return;
    staged = null; $('owner-contest-btn') && ($('owner-contest-btn').textContent = 'فحص ورفع الأسئلة');
    const list = [], errs = [];
    for (const f of files) {
      if (f.size > 1500000) { errs.push('الملف «' + f.name + '» أكبر من الحد (1.5 ميجا)'); continue; }
      try { list.push({ name: f.name, json: JSON.parse(await f.text()) }); } catch (e) { errs.push('الملف «' + f.name + '»: خطأ في صيغة JSON'); }
    }
    if (errs.length) return fail(errs);
    const m = mergeFiles(list);
    if (!m.data) return fail(m.errs);
    $('owner-contest-json').value = JSON.stringify(m.data);
    showToast('تم دمج ' + ar(list.length) + ' ملف');
    window.saveOwnerContestJson();
  };

  window.Quiz3Tools = { normalize: normalize, mergeFiles: mergeFiles, pickChapter: pickChapter, pickFinal: pickFinal };   // للاختبار اليدوي من الـconsole

  /* ---------- تشغيل ---------- */
  document.addEventListener('DOMContentLoaded', () => { setTimeout(recoverActive, 1500); });
  if (document.readyState !== 'loading') setTimeout(recoverActive, 1500);
})();
