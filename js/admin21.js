'use strict';
/* الخدمة اليومية v2.0.6 — استرجاع كلمة المرور (كلمة مؤقتة من المسؤول/المالك) + سجل الحركات.
   سكربت عادي يُحمَّل بعد admin20.js. الحماية الحقيقية في السيرفر (sql/23)؛ هنا واجهة فقط.
   ١) زر «كلمة مرور مؤقتة» في كروت الحسابات (يُضاف فوق admin15 بلا تعديله) + مودال عرض الكلمة مرة واحدة.
   ٢) شاشة تغيير إجباري لمن عليه كلمة مؤقتة (واجهة فقط؛ السيرفر يتأكد أن الكلمة تغيّرت فعلًا قبل رفع الإجبار).
   ٣) لوحة «سجل الحركات» (قراءة فقط) بفلاتر وترقيم صفحات. */
(function () {
  /* ===========================================================
     ١) كلمة المرور المؤقتة
     =========================================================== */
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';   // بلا أحرف متشابهة (I O l 0 1)
  function genPassword() {
    const c = window.crypto;
    if (!c || !c.getRandomValues) return '';
    const lim = 256 - (256 % ALPHA.length), out = [];
    while (out.length < 10) {
      const buf = new Uint8Array(16); c.getRandomValues(buf);
      for (let i = 0; i < buf.length && out.length < 10; i++) if (buf[i] < lim) out.push(ALPHA[buf[i] % ALPHA.length]);
    }
    return out.join('');
  }

  window.accTempPass = async function (id, btn) {
    if (!requireRole('admin', 'owner') || !UUID_RE.test(id)) return;
    const me = getCurrentUser();
    const acc = getAccounts().find((a) => a.id === id);
    if (!acc || acc.id === me.id || (me.role === 'admin' && acc.role === 'owner')) { showToast('غير مصرح لك بهذا الإجراء', 'error'); return; }
    if (!confirm('تعيين كلمة مرور مؤقتة لـ ' + acc.name + '؟\nستتوقف كلمة مروره الحالية فورًا، ويخرج من كل أجهزته، وسيُطلب منه اختيار كلمة جديدة عند أول دخول.')) return;
    const pw = genPassword();
    if (!pw) { showToast('المتصفح لا يدعم توليد كلمة مرور آمنة.', 'error'); return; }
    if (btn) btn.disabled = true;
    const r = await Auth.setTempPassword(id, pw);
    if (btn) btn.disabled = false;
    if (!r.ok) { showToast(r.error, 'error'); return; }
    $('tp-for').textContent = 'للحساب: ' + acc.name;
    $('tp-value').textContent = pw;
    $('tp-copy').textContent = '📋 نسخ';
    openModal('tempPassModal');
    refreshAccounts(false);
  };

  window.tempPassCopy = async function () {
    const txt = $('tp-value').textContent || '';
    if (!txt) return;
    let done = false;
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(txt); done = true; } } catch (e) { /* نجرّب الطريقة القديمة */ }
    if (!done) {
      try {
        const r = document.createRange(); r.selectNodeContents($('tp-value'));
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
        done = document.execCommand('copy');
      } catch (e) { /* لا يهم */ }
    }
    $('tp-copy').textContent = done ? '✅ تم النسخ' : 'حدّد الكلمة وانسخها يدويًا';
  };

  /* الكلمة تُمسح من الصفحة عند إغلاق المودال بأي طريقة (زر، ✕، Esc) */
  (function () {
    const ov = $('tempPassModal'); if (!ov || !window.MutationObserver) return;
    new MutationObserver(function () {
      if (!ov.classList.contains('open')) { $('tp-value').textContent = ''; $('tp-for').textContent = ''; }
    }).observe(ov, { attributes: true, attributeFilter: ['class'] });
  })();

  /* زر الكلمة المؤقتة وشارة «لم يغيّرها بعد» فوق كروت admin15 */
  function decorate(user, accounts) {
    const box = $('owner-accounts-cards');
    if (!box || box.style.display === 'none' || !isStaffUser(user)) return;
    box.querySelectorAll('.acc-card[data-uid]').forEach(function (card) {
      const a = (accounts || []).find(function (x) { return x.id === card.getAttribute('data-uid'); });
      if (!a) return;
      const can = a.id !== user.id && !(user.role === 'admin' && a.role === 'owner');
      const acts = card.querySelector('.acc-actions');
      if (acts && can && !acts.querySelector('[data-tp]')) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'btn btn-outline btn-sm'; b.setAttribute('data-tp', '1');
        b.textContent = '🔑 كلمة مرور مؤقتة';
        b.addEventListener('click', function () { window.accTempPass(a.id, b); });
        acts.appendChild(b);
      }
      const meta = card.querySelector('.acc-meta');
      if (meta && a.mustChange && !meta.querySelector('.acc-temp')) {
        const sp = document.createElement('span');
        sp.className = 'acc-temp'; sp.style.gridColumn = '1 / -1';
        sp.textContent = '⏳ عليه كلمة مرور مؤقتة لم يغيّرها بعد';
        meta.appendChild(sp);
      }
    });
  }
  const prevRender = window.renderAccountsTable;
  if (typeof prevRender === 'function') {
    window.renderAccountsTable = function (user, accounts) {
      const out = prevRender.apply(this, arguments);
      try { decorate(user, accounts); } catch (e) { if (typeof console !== 'undefined') console.warn('admin21', e); }
      return out;
    };
  }

  /* ===========================================================
     ٢) التغيير الإجباري
     =========================================================== */
  let pendingMark = false;   // تغيّرت الكلمة فعلًا لكن تأكيد السيرفر لم يصل بعد
  function fcError(msg) {
    const e = $('fc-error'); if (!e) return;
    e.textContent = msg || ''; e.classList.toggle('visible', !!msg);
  }
  function gate() {
    const ov = $('forceChangeOverlay'), sh = $('app-shell'); if (!ov) return;
    const u = Auth.getUser();
    const need = !!(u && u.mustChange);
    ov.classList.toggle('on', need);
    if (sh) { if (need) sh.setAttribute('inert', ''); else sh.removeAttribute('inert'); }
    if (need) { fcError(''); setTimeout(function () { const f = $('fc-pass'); if (f) f.focus({ preventScroll: true }); }, 200); }
    else { pendingMark = false; ['fc-pass', 'fc-pass2'].forEach(function (id) { const f = $(id); if (f) f.value = ''; }); }
  }
  const prevEnter = window.enterApp;
  if (typeof prevEnter === 'function') {
    window.enterApp = function () { const o = prevEnter.apply(this, arguments); gate(); return o; };
  }
  const prevLogout = window.logout;
  if (typeof prevLogout === 'function') {
    window.logout = function () {
      const ov = $('forceChangeOverlay'); if (ov) ov.classList.remove('on');
      const sh = $('app-shell'); if (sh) sh.removeAttribute('inert');
      pendingMark = false;
      return prevLogout.apply(this, arguments);
    };
  }
  window.forceChangeLogout = function () { window.logout(); };
  const fcForm = $('forceChangeForm');
  if (fcForm) fcForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = $('fc-submit'); if (btn.disabled) return;
    fcError('');
    let r;
    if (pendingMark) {
      btn.disabled = true; r = await Auth.markPasswordChanged(); btn.disabled = false;
      if (!r.ok) { fcError(r.error); return; }
    } else {
      const p1 = $('fc-pass').value, p2 = $('fc-pass2').value;
      if (p1.length < 6) { fcError('كلمة المرور ٦ أحرف على الأقل.'); return; }
      if (p1 !== p2) { fcError('كلمتا المرور غير متطابقتين.'); return; }
      btn.disabled = true; r = await Auth.changePassword(p1); btn.disabled = false;
      if (!r.ok) { fcError(r.error); return; }
      if (!r.marked) { pendingMark = true; fcError('تم تغيير كلمة المرور، لكن تعذّر إنهاء الخطوة. تأكد من الاتصال ثم اضغط «حفظ ومتابعة» مرة أخرى.'); return; }
    }
    gate();
    showToast('تم تغيير كلمة المرور ✅', 'success');
  });

  /* ===========================================================
     ٣) سجل الحركات
     =========================================================== */
  const PAGE = 40;
  const CATS = {
    login: ['دخول', 'badge-blue'], password: ['كلمة مرور', 'badge-gold'], account: ['حساب', 'badge-blue'],
    content: ['محتوى', 'badge-green'], contest: ['مسابقة', 'badge-gold'], moderation: ['إشراف', 'badge-red'], settings: ['إعدادات', 'badge-red']
  };
  const FIELD = {
    full_name: 'الاسم', phone: 'التليفون', stage: 'المرحلة', role: 'الدور', status: 'الحالة', email: 'الإيميل',
    hidden: 'مخفية', visibility: 'الظهور', title: 'العنوان', short_title: 'الاسم المختصر', sections: 'عدد الأصحاحات', kind: 'النوع',
    active: 'مفعّل', book_id: 'السفر', section: 'الأصحاح', verse_from: 'من آية', verse_to: 'إلى آية', meditation: 'التأمل',
    prayer: 'الصلاة', challenge: 'التحدي', opens_at: 'يفتح', closes_at: 'يغلق', starts_at: 'تبدأ', ends_at: 'تنتهي',
    expires_at: 'ينتهي', used_at: 'استُخدم', is_current: 'الحالية', score: 'الدرجة', total: 'من', attempt: 'المحاولة',
    cid: 'المعرّف', book_label: 'السفر', info: 'ملاحظة', timer_secs: 'المؤقت (ثانية)', on_date: 'التاريخ', label: 'العنوان',
    day: 'اليوم', sort: 'الترتيب'
  };
  let cursor = null, busy = false, lastDay = '', reqId = 0;

  const fmtTime = (iso) => {
    const d = new Date(iso); if (isNaN(d)) return '';
    return d.toLocaleTimeString('ar-EG', { timeZone: 'Africa/Cairo', hour: 'numeric', minute: '2-digit' });
  };
  const dayKey = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }); };
  const dayLabel = (iso) => new Date(iso).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const isIso = (v) => /^\d{4}-\d{2}-\d{2}T/.test(String(v));
  function fval(k, v) {
    if (v === '' || v == null) return '—';
    if (k === 'role') return roleLabel(v);
    if (k === 'status') return v === 'active' ? 'نشط' : v === 'disabled' ? 'معطل' : v;
    if (k === 'stage') { const s = Auth.STAGE_OPTIONS.find((x) => x.code === v); return s ? s.label : v; }
    if (v === 'true') return 'نعم';
    if (v === 'false') return 'لا';
    if (isIso(v)) { const d = new Date(v); return isNaN(d) ? v : d.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }); }
    return v;
  }
  const flabel = (k) => FIELD[k] || k;

  function detailsHtml(it) {
    const d = it.details || {}, rows = [];
    const n = Number(d.count) || 0, titles = Array.isArray(d.titles) ? d.titles.filter(Boolean) : [];
    if (n > 1) rows.push('<div>' + toAr(n) + ' عنصر' + (titles.length ? ': ' + titles.map(escapeHtml).join('، ') + (n > titles.length ? ' …' : '') : '') + '</div>');
    if (d.row) Object.keys(d.row).forEach((k) => rows.push('<div>' + escapeHtml(flabel(k)) + ': <b>' + escapeHtml(fval(k, d.row[k])) + '</b></div>'));
    if (d.changes) Object.keys(d.changes).forEach((k) => {
      const c = d.changes[k] || {};
      rows.push('<div>' + escapeHtml(flabel(k)) + ': ' + escapeHtml(fval(k, c.from)) + ' ← <b>' + escapeHtml(fval(k, c.to)) + '</b></div>');
    });
    return rows.length ? '<details class="act-det"><summary>التفاصيل</summary>' + rows.join('') + '</details>' : '';
  }
  function itemHtml(it) {
    const cat = CATS[it.cat] || [it.cat, 'badge-blue'];
    const who = it.actor_name ? escapeHtml(it.actor_name) : 'النظام';
    const role = it.actor_role ? ' <span class="role-badge ' + roleClass(it.actor_role) + '" style="font-size:0.7rem;">' + escapeHtml(roleLabel(it.actor_role)) + '</span>' : '';
    return '<div class="act-item"><div class="act-head"><span class="act-who">' + who + role + '</span>'
      + '<span class="act-time">' + escapeHtml(fmtTime(it.at)) + '</span></div>'
      + '<div class="act-sum"><span class="badge ' + cat[1] + '">' + escapeHtml(cat[0]) + '</span> ' + escapeHtml(it.summary) + '</div>'
      + detailsHtml(it) + '</div>';
  }

  function readFilters() {
    const g = (id) => { const e = $(id); return e ? e.value.trim() : ''; };
    const a = {};
    if (g('act-cat')) a.p_cat = g('act-cat');
    if (g('act-actor') && UUID_RE.test(g('act-actor'))) a.p_actor = g('act-actor');
    if (g('act-from')) a.p_from = g('act-from');
    if (g('act-to')) a.p_to = g('act-to');
    if (g('act-q')) a.p_q = g('act-q');
    return a;
  }

  window.activityLoad = async function (reset) {
    const list = $('act-list'), more = $('act-more'); if (!list) return;
    if (busy && !reset) return;
    const me = getCurrentUser(); if (!isStaffUser(me)) return;
    const sc = $('act-scope');
    if (sc) sc.textContent = (me.role === 'owner' ? 'تُعرض كل الحركات.' : 'تُعرض كل الحركات ما عدا حركات المالك.') + ' السجل للقراءة فقط ولا يمكن تعديله أو حذفه. الأوقات بتوقيت القاهرة.';
    if (reset) { cursor = null; lastDay = ''; list.innerHTML = '<div class="json-hint" style="text-align:center;">جارٍ التحميل…</div>'; if (more) more.style.display = 'none'; }
    const my = ++reqId; busy = true;
    const args = Object.assign(readFilters(), { p_limit: PAGE });
    if (cursor) args.p_before = cursor;
    const r = await Auth.activity(args);
    if (my !== reqId) return;   // وصل رد أحدث (تغيّر الفلتر أثناء التحميل)
    busy = false;
    if (!r.ok) {
      showToast(r.error, 'error');
      if (reset) list.innerHTML = '<div class="json-hint" style="text-align:center; padding:14px;">' + escapeHtml(r.error) + '</div>';
      return;
    }
    const d = r.data || {}, items = Array.isArray(d.items) ? d.items : [];
    if (reset) list.innerHTML = '';
    if (Array.isArray(d.actors)) {
      const sel = $('act-actor'), cur = sel.value;
      sel.innerHTML = '<option value="">كل المستخدمين</option>' + d.actors.map((a) => '<option value="' + escapeHtml(a.id) + '">' + escapeHtml(a.name || 'بلا اسم') + '</option>').join('');
      sel.value = d.actors.some((a) => a.id === cur) ? cur : '';
    }
    if (reset && !items.length) { list.innerHTML = '<div class="json-hint" style="text-align:center; padding:14px;">لا توجد حركات مطابقة.</div>'; }
    let html = '';
    items.forEach((it) => {
      const k = dayKey(it.at);
      if (k && k !== lastDay) { lastDay = k; html += '<div class="act-day">' + escapeHtml(dayLabel(it.at)) + '</div>'; }
      html += itemHtml(it);
    });
    list.insertAdjacentHTML('beforeend', html);
    if (items.length) cursor = items[items.length - 1].id;
    if (more) more.style.display = d.has_more ? '' : 'none';
  };
  window.activityMore = function () { if (cursor) window.activityLoad(false); };
  window.activityApply = function () {
    const f = $('act-from').value, t = $('act-to').value;
    if (f && t && f > t) { showToast('تاريخ «من» يجب أن يسبق تاريخ «إلى».', 'error'); return; }
    window.activityLoad(true);
  };
  window.activityReset = function () {
    ['act-cat', 'act-actor', 'act-from', 'act-to', 'act-q'].forEach((id) => { const e = $(id); if (e) e.value = ''; });
    window.activityLoad(true);
  };
  const qEl = $('act-q');
  if (qEl) qEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); window.activityApply(); } });

  const prevSwitch = window.switchAdminSub;
  window.switchAdminSub = function (panel, btn) {
    const out = prevSwitch(panel, btn);
    try { if (panel === 'activity') window.activityLoad(true); } catch (e) { if (typeof console !== 'undefined') console.warn('admin21', e); }
    return out;
  };
})();
