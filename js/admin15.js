'use strict';
/* الخدمة اليومية v1.5 (الدرج بستايل v1.6) — واجهة الإدارة الإضافية:
   - درج القائمة الجانبية (بجانب الشريط الأفقي، لا بدلًا منه)
   - توزيع الخطة (معاينة ثم تنفيذ) — دالة السيرفر staff_plan_bulk
   - كروت الحسابات + تعديل البيانات — admin_update_profile
   - نسخة شاملة + استعادة بيانات الخدام + منطقة الخطر (مسح) للمالك
   سكربت عادي يُحمَّل بعد app.js ويستعمل دوالّه العامة ($، escapeHtml، jsArg، requireRole، showToast، saveFileBlob ...).
   الحماية الحقيقية في السيرفر (صلاحيات الدوال + كلمة DELETE)، وما هنا للعرض وتسلسل الأمان فقط. */
(function () {
  const isOwner = () => { const u = getCurrentUser(); return !!u && u.role === 'owner'; };
  const isStaff = () => isStaffUser(getCurrentUser());
  const nz = (n) => (n == null ? 0 : n);

  /* ===========================================================
     ١) الدرج
     =========================================================== */
  const GROUPS = [
    { t: 'المحتوى', items: [['plan', 'الخطة'], ['bulk', 'التوزيع'], ['books', 'الأسفار']] },
    { t: 'المسابقات', items: [['schedule', 'المواعيد'], ['unlock', 'الأكواد'], ['live', 'النتائج']] },
    { t: 'الخدام', items: [['tracking', 'المتابعة'], ['accounts', 'الحسابات'], ['moderation', 'الإشراف']] },
    { t: 'المالك', owner: true, items: [['json', 'رفع JSON'], ['backup', 'النسخة الاحتياطية']] }
  ];
  /* v1.6: أيقونات خطية inline (24px، stroke 1.9) بنفس أسلوب أيقونات الشريط السفلي */
  const ICONS = {
    plan: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/>',
    bulk: '<path d="M4 7h10M4 12h16M4 17h8"/><circle cx="18" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
    books: '<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z"/><path d="M5 17a3 3 0 0 1 3-3h10"/>',
    schedule: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    unlock: '<circle cx="8" cy="14" r="3.5"/><path d="M10.5 11.5 18 4M15 7l2 2M17.5 4.5l2 2"/>',
    live: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5a2 2 0 0 0 2 4M16 6h3a2 2 0 0 1-2 4M12 13v4M8.5 20h7"/>',
    tracking: '<path d="M4 20V10M10 20V4M16 20v-8M21 20H3"/>',
    accounts: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.2a3 3 0 0 1 0 5.6M18 14.2A5.5 5.5 0 0 1 21 19"/>',
    moderation: '<path d="M12 3.5 5 6.2V12c0 4 3 6.6 7 8.5 4-1.9 7-4.5 7-8.5V6.2L12 3.5Z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    json: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
    backup: '<path d="M5 4h11l3 3v13H5V4Z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>'
  };
  const icon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k] || ''}</svg>`;
  const folded = {};

  function activePanel() {
    const a = document.querySelector('#admin-sub-nav .sub-btn.active');
    return a ? a.getAttribute('data-panel') : '';
  }
  function drawerHtml() {
    const act = activePanel();
    return GROUPS.filter((g) => !g.owner || isOwner()).map((g, i) => `
      <div class="drawer-group">
        <button type="button" class="drawer-group-btn" aria-expanded="${folded[i] ? 'false' : 'true'}" onclick="adminDrawerFold(${i})">
          <span>${escapeHtml(g.t)}</span><span aria-hidden="true">${folded[i] ? '▸' : '▾'}</span>
        </button>
        <div class="drawer-group-items" ${folded[i] ? 'hidden' : ''}>
          ${g.items.map((it) => `<button type="button" class="drawer-item ${it[0] === act ? 'active' : ''}" ${it[0] === act ? 'aria-current="true"' : ''} onclick="adminDrawerGo(${jsArg(it[0])})"><span class="drawer-ico">${icon(it[0])}</span><span class="drawer-lbl">${escapeHtml(it[1])}</span></button>`).join('')}
        </div>
      </div>`).join('');
  }
  function onKey(e) { if (e.key === 'Escape') window.adminDrawerClose(); }
  window.adminDrawerOpen = function () {
    if (!isStaff()) return;
    $('admin-drawer-body').innerHTML = drawerHtml();
    $('admin-drawer-overlay').hidden = false;
    const d = $('admin-drawer');
    d.classList.add('open'); d.setAttribute('aria-hidden', 'false');
    document.addEventListener('keydown', onKey);
    const c = d.querySelector('.drawer-close'); if (c) c.focus();
  };
  window.adminDrawerClose = function () {
    const d = $('admin-drawer'); if (!d) return;
    d.classList.remove('open'); d.setAttribute('aria-hidden', 'true');
    $('admin-drawer-overlay').hidden = true;
    document.removeEventListener('keydown', onKey);
    const b = $('admin-menu-btn'); if (b && d.contains(document.activeElement)) b.focus();
  };
  window.adminDrawerFold = function (i) {
    folded[i] = !folded[i];
    $('admin-drawer-body').innerHTML = drawerHtml();
  };
  window.adminDrawerGo = function (panel) {
    if (panel === 'json' || panel === 'backup') { if (!requireRole('owner')) return; }
    const btn = document.querySelector('#admin-sub-nav .sub-btn[data-panel="' + panel + '"]');
    if (!btn) return;
    window.adminDrawerClose();
    window.switchAdminSub(panel, btn);
    try { btn.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) { /* لا يهم */ }
  };

  /* خطاف: تبديل اللوحات (الدالة الأصلية تبقى كما هي) */
  const origSwitch = window.switchAdminSub;
  window.switchAdminSub = function (panel, btn) {
    const out = origSwitch(panel, btn);
    try {
      if (panel === 'bulk') bulkInit();
      if (panel === 'backup') dangerCancel();
    } catch (e) { if (typeof console !== 'undefined') console.warn('admin15', e); }
    return out;
  };

  /* ===========================================================
     ٢) كروت الحسابات
     =========================================================== */
  const origRenderAccounts = window.renderAccountsTable;
  let accQuery = '', editingId = null;
  const norm = (s) => String(s || '').toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');

  function accCard(a, user) {
    const mine = a.id === user.id;
    const canAct = !mine && !(user.role === 'admin' && a.role === 'owner');   // نفس قيود v1.4
    const canEdit = !(user.role === 'admin' && a.role === 'owner');            // المسؤول لا يعدّل المالك؛ التعديل على النفس مسموح
    const roleSelect = user.role === 'owner' && !mine
      ? `<select class="form-control" style="max-width:150px; padding:4px 6px; font-size:0.78rem;" onchange="changeAccountRole(${jsArg(a.id)}, this.value)" aria-label="تغيير الدور">
           <option value="servant" ${a.role === 'servant' ? 'selected' : ''}>👤 خادم</option>
           <option value="admin" ${a.role === 'admin' ? 'selected' : ''}>🛡️ مسؤول</option>
           <option value="owner" ${a.role === 'owner' ? 'selected' : ''}>👑 مالك</option>
         </select>` : '';
    const edit = editingId === a.id ? `
      <div class="acc-edit">
        <label>الاسم <input type="text" class="form-control" data-f="name" maxlength="80" value="${escapeHtml(a.name)}" /></label>
        <label>رقم التليفون <input type="tel" class="form-control" data-f="phone" inputmode="tel" dir="ltr" value="${escapeHtml(a.phone)}" /></label>
        <label>المرحلة <select class="form-control" data-f="stage">
          ${Auth.STAGE_OPTIONS.map((s) => `<option value="${escapeHtml(s.code)}" ${s.code === a.stageCode ? 'selected' : ''}>${escapeHtml(s.label)}</option>`).join('')}
        </select></label>
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn btn-primary btn-sm" onclick="accSave(${jsArg(a.id)}, this)">💾 حفظ</button>
          <button type="button" class="btn btn-outline btn-sm" onclick="accCancel()">إلغاء</button>
        </div>
      </div>` : '';
    return `
      <div class="acc-card" data-uid="${escapeHtml(a.id)}">
        <div class="acc-card-head">
          <span class="acc-name">${escapeHtml(a.name)} <span class="role-badge ${roleClass(a.role)}" style="font-size:0.72rem;">${escapeHtml(roleLabel(a.role))}</span></span>
          ${a.active ? '<span class="badge badge-green">نشط</span>' : '<span class="badge badge-red">معطل</span>'}
        </div>
        <div class="acc-meta">
          <span>المرحلة: <b>${escapeHtml(a.stage || '—')}</b></span>
          <span>التليفون: <b class="acc-ltr">${escapeHtml(a.phone || '—')}</b></span>
          <span style="grid-column:1 / -1;">الإيميل: <b class="acc-ltr">${escapeHtml(a.email || '—')}</b></span>
          <span style="grid-column:1 / -1;">آخر دخول: <b>${escapeHtml(fmtLastLogin(a.lastLogin))}</b></span>
        </div>
        <div class="acc-actions">
          ${canEdit ? `<button type="button" class="btn btn-outline btn-sm" onclick="accEdit(${jsArg(a.id)})">✏️ تعديل البيانات</button>` : ''}
          ${canAct ? `
            <button type="button" class="btn btn-outline btn-sm" onclick="setAccountStatus(${jsArg(a.id)}, ${jsArg(a.active ? 'disabled' : 'active')})">${a.active ? 'تعطيل' : 'تفعيل'}</button>
            <button type="button" class="btn btn-danger btn-sm" onclick="deleteAccountById(${jsArg(a.id)})">حذف</button>
            ${roleSelect}` : ''}
        </div>
        ${edit}
      </div>`;
  }

  window.renderAccountsTable = function (user, accounts) {
    const box = $('owner-accounts-cards');
    if (!box) return origRenderAccounts(user, accounts);
    if (!isStaffUser(user)) return;
    const tbl = $('owner-accounts-table'); if (tbl) tbl.style.display = 'none';
    box.style.display = 'flex';
    const se = $('acc-search'); if (se) se.style.display = '';
    if (editingId && box.querySelector('.acc-edit')) return;   // لا نهدم نموذجًا قيد التعديل بسبب تحديث المزامنة
    const q = norm(accQuery).trim();
    const list = (accounts || []).filter((a) => !q || norm(a.name).indexOf(q) !== -1);
    box.innerHTML = list.length ? list.map((a) => accCard(a, user)).join('')
      : '<div class="json-hint" style="text-align:center; padding:14px;">لا توجد حسابات لعرضها.</div>';
  };
  const redrawAccounts = () => window.renderAccountsTable(getCurrentUser(), getAccounts());
  window.accSearch = function (v) { accQuery = String(v || ''); editingId = null; redrawAccounts(); };
  window.accEdit = function (id) {
    if (!requireRole('admin', 'owner') || !UUID_RE.test(id)) return;
    editingId = null; redrawAccounts();   // يغلق أي نموذج مفتوح ثم نفتح الجديد
    editingId = id; redrawAccounts();
  };
  window.accCancel = function () { editingId = null; redrawAccounts(); };
  window.accSave = async function (id, btn) {
    if (!requireRole('admin', 'owner') || !UUID_RE.test(id)) return;
    const card = btn.closest('.acc-card'); if (!card) return;
    const f = (k) => card.querySelector('[data-f="' + k + '"]');
    const name = f('name').value.trim();
    const phone = Auth.normalizePhone(f('phone').value);
    const stage = f('stage').value;
    if (name.length < 2 || name.length > 80) return showToast('الاسم يجب أن يكون بين ٢ و٨٠ حرفًا.', 'error');
    if (!phone) return showToast('رقم التليفون غير صالح (٨ إلى ١٥ رقمًا).', 'error');
    btn.disabled = true;
    const r = await Auth.updateProfile(id, name, phone, stage);
    btn.disabled = false;
    if (!r.ok) return showToast(r.error, 'error');
    showToast('تم حفظ بيانات الحساب', 'success');
    editingId = null;
    refreshAccounts(true);
  };

  /* ===========================================================
     ٣) توزيع الخطة
     =========================================================== */
  let bulkLast = null, bulkBusy = false, bulkDoneDay = null;

  function bulkInit() {
    fillAdminBookSelect($('bulk-book'), $('bulk-book').value, '— اختر السفر —');
    if (!$('bulk-start').value) $('bulk-start').value = todayIso();
  }
  window.bulkDirty = function () { bulkLast = null; $('bulk-result').innerHTML = ''; };
  window.bulkToggleManual = function () {
    $('bulk-end-wrap').style.display = $('bulk-manual').checked ? '' : 'none';
    if (!$('bulk-manual').checked) $('bulk-end').value = '';
    window.bulkDirty();
  };
  function bulkArgs() {
    const book = $('bulk-book').value;
    if (!book) { showToast('اختر السفر أولًا', 'error'); return null; }
    const start = $('bulk-start').value;
    if (!start) { showToast('اختر تاريخ البداية', 'error'); return null; }
    if (start < todayIso()) { showToast('تاريخ البداية في الماضي. اختر اليوم أو بعده.', 'error'); return null; }
    const b = adminBibleBooks().find((x) => x.id === book);
    const from = parseInt($('bulk-from').value, 10);
    if (!b || !(from >= 1 && from <= b.sections)) { showToast('رقم الأصحاح غير صحيح لهذا السفر.', 'error'); return null; }
    let end = null;
    if ($('bulk-manual').checked) {
      end = $('bulk-end').value;
      if (!end) { showToast('اختر تاريخ النهاية أو أغلق التحديد اليدوي.', 'error'); return null; }
      if (end < start) { showToast('تاريخ النهاية قبل البداية.', 'error'); return null; }
    }
    return { p_book: book, p_start: start, p_end: end, p_from_section: from, p_apply: false };
  }
  function dayLabel(iso) {
    const a = String(iso).split('-').map(Number);
    let wd = '';
    try { wd = new Date(Date.UTC(a[0], a[1] - 1, a[2])).toLocaleDateString('ar-EG', { weekday: 'long', timeZone: 'UTC' }); } catch (e) { wd = ''; }
    return `<span dir="ltr">${escapeHtml(iso)}</span> ${escapeHtml(wd)}`;
  }
  function addDay(iso, n) {
    const a = String(iso).split('-').map(Number);
    const d = new Date(Date.UTC(a[0], a[1] - 1, a[2] + n));
    return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
  }
  function bulkRender(d) {
    const box = $('bulk-result');
    if (d.status === 'range_too_short') {
      box.innerHTML = `<div class="bulk-msg bad">⚠️ المدة أقصر من اللازم. السفر محتاج ${nz(d.chapters)} يوم على الأقل (المتاح في المدة ${nz(d.available_days)} يوم).
        ${d.min_end ? `<br>أقرب نهاية ممكنة: <span dir="ltr">${escapeHtml(d.min_end)}</span>
        <div style="margin-top:8px;"><button type="button" class="btn btn-gold btn-sm" onclick="bulkUseEnd(${jsArg(d.min_end)})">استخدم هذا التاريخ</button></div>` : ''}</div>`;
      return;
    }
    if (d.status === 'too_long') {
      box.innerHTML = '<div class="bulk-msg bad">⚠️ التوزيع يتجاوز الحد الأقصى (٤٠٠ يوم من اليوم). اختر بداية أقرب أو ابدأ من أصحاح متأخر.</div>';
      return;
    }
    const c = d.counts || {}, w = d.warnings || {};
    const rows = (d.days || []).map((x) => {
      const t = x.action === 'skip' ? 'متخطّى: قراءة محفوظة'
        : x.action === 'fill' ? `الأصحاح ${x.section} (يُكمَّل: فيه خطة بلا قراءة)` : `الأصحاح ${x.section}`;
      return `<div class="bulk-row ${escapeHtml(x.action)}"><span>${dayLabel(x.day)}</span><span>${escapeHtml(t)}</span></div>`;
    }).join('');
    const warn = [];
    if (nz(w.opens_later)) warn.push(`${w.opens_later} أصحاح يُفتح بعد يوم قراءته`);
    if (nz(w.not_scheduled)) warn.push(`${w.not_scheduled} أصحاح خارج جدول فتح السفر`);
    box.innerHTML = `
      <div class="bulk-msg">ينتهي السفر يوم <span dir="ltr">${escapeHtml(d.last_chapter_day || '—')}</span> · يضيف ${nz(c.add)} · يكمّل ${nz(c.fill)} · يتخطّى ${nz(c.skip)}</div>
      <div class="bulk-list">${rows}</div>
      ${warn.length ? `<div class="json-hint" style="margin-top:8px;">تنبيه (لا يمنع التنفيذ): ${escapeHtml(warn.join(' · '))}.</div>` : ''}
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
        <button type="button" class="btn btn-gold" id="bulk-apply-btn" onclick="bulkApply()">✅ تأكيد التوزيع</button>
      </div>`;
  }
  window.bulkPreview = async function () {
    if (!requireRole('admin', 'owner') || bulkBusy) return;
    const args = bulkArgs(); if (!args) return;
    bulkBusy = true; $('bulk-preview-btn').disabled = true;
    try {
      const r = await Sync.call('staff_plan_bulk', args);
      if (!r.ok) { $('bulk-result').innerHTML = ''; return showToast(r.error, 'error'); }
      bulkLast = { args: args, data: r.data };
      bulkRender(r.data);
    } finally { bulkBusy = false; $('bulk-preview-btn').disabled = false; }
  };
  window.bulkUseEnd = function (iso) {
    $('bulk-manual').checked = true; $('bulk-end-wrap').style.display = '';
    $('bulk-end').value = iso;
    window.bulkPreview();
  };
  window.bulkApply = async function () {
    if (!requireRole('admin', 'owner') || bulkBusy || !bulkLast || bulkLast.data.status !== 'ready') return;
    bulkBusy = true;
    const btn = $('bulk-apply-btn'); if (btn) btn.disabled = true;
    try {
      const r = await Sync.call('staff_plan_bulk', Object.assign({}, bulkLast.args, { p_apply: true }));
      if (!r.ok) { if (btn) btn.disabled = false; return showToast(r.error, 'error'); }
      const d = r.data || {}, c = d.counts || {};
      if (d.status !== 'ready' || !d.applied) { if (btn) btn.disabled = false; return showToast('لم يُنفَّذ التوزيع. أعد المعاينة.', 'error'); }
      bulkDoneDay = d.last_chapter_day || null;
      bulkLast = null;
      $('bulk-result').innerHTML = `<div class="bulk-msg good">✅ تم التوزيع: أُضيف ${nz(c.add)} يوم · أُكمل ${nz(c.fill)} · تُخطّي ${nz(c.skip)}.
        <br>✅ السفر خلص يوم <span dir="ltr">${escapeHtml(bulkDoneDay || '—')}</span>
        <div style="margin-top:8px;"><button type="button" class="btn btn-outline btn-sm" onclick="bulkNextBook()">➕ سفر تكميلي</button></div></div>`;
      showToast('تم توزيع الخطة', 'success');
      try { await Sync.pull(); } catch (e) { /* لا يهم */ }
      try { renderToday(); if (typeof adminLoadPlanDay === 'function') adminLoadPlanDay(); } catch (e) { /* لا يهم */ }
    } finally { bulkBusy = false; }
  };
  window.bulkNextBook = function () {
    if (bulkDoneDay) $('bulk-start').value = addDay(bulkDoneDay, 1);
    $('bulk-book').value = ''; $('bulk-from').value = '1';
    $('bulk-manual').checked = false; $('bulk-end-wrap').style.display = 'none'; $('bulk-end').value = '';
    $('bulk-result').innerHTML = '<div class="json-hint">اختر السفر التالي ثم اضغط «معاينة».</div>';
  };

  /* ===========================================================
     ٤) نسخة شاملة + استعادة بيانات الخدام (المالك)
     =========================================================== */
  const stamp = () => { const c = Sync.cairoNow(); return todayIso() + '-' + pad2(c.getHours()) + pad2(c.getMinutes()); };
  let pendingServant = null;

  window.ownerExportFull = async function () {
    if (!requireRole('owner')) return;
    const btn = $('backup-full-btn'); if (btn) btn.disabled = true;
    try {
      const r = await Sync.call('owner_export_full', {});
      if (!r.ok) return showToast(r.error, 'error');
      const d = r.data || {};
      const len = (k) => (Array.isArray(d[k]) ? d[k].length : 0);
      const blob = new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' });
      const how = await saveFileBlob(blob, `daily-service-full-backup-${stamp()}.json`, 'application/json');
      $('backup-report').innerHTML = `<div class="json-hint">✅ تم تجهيز النسخة الشاملة:
        ${len('books')} سفر · ${len('plan_days')} يوم خطة · ${len('contests')} مسابقة · ${len('progress')} صف تقدم · ${len('posts')} مشاركة · ${len('post_likes')} إعجاب · ${len('results')} نتيجة · ${len('unlock_codes')} كود فتح.
        <br>⚠️ الملف يحمل المشاركات الخاصة وأكواد الفتح، فاحفظه في مكان آمن.</div>`;
      showToast(how === 'fail' ? 'تعذّر حفظ الملف على هذا الجهاز.' : how === 'share' ? 'اختر «حفظ في الملفات» من قائمة المشاركة.' : 'تم تنزيل النسخة الشاملة', how === 'fail' ? 'error' : 'success');
    } finally { if (btn) btn.disabled = false; }
  };

  window.ownerPickServantBackup = function () { if (requireRole('owner')) $('servant-file').click(); };
  window.ownerServantCancel = function () { pendingServant = null; $('servant-preview').innerHTML = ''; };
  window.ownerServantFileChosen = async function (input) {
    const f = input.files && input.files[0];
    input.value = '';
    if (!f || !requireRole('owner')) return;
    if (f.size > 60 * 1024 * 1024) return showToast('الملف كبير جدًّا (أكثر من ٦٠ ميجابايت).', 'error');
    let obj;
    try { obj = JSON.parse(await f.text()); } catch (e) { return showToast('الملف ليس JSON صالحًا.', 'error'); }
    if (!obj || typeof obj !== 'object' || obj.format !== 'ds-backup') return showToast('هذا ليس ملف نسخة احتياطية من التطبيق.', 'error');
    if (obj.scope !== 'full') return showToast('هذا الملف ليس نسخة شاملة. استعمل ملفًا مصدَّرًا بزر «نسخة شاملة» أو ملف ما قبل المسح.', 'error');
    const r = await Sync.call('owner_import_servant_data', { p_backup: obj, p_apply: false });
    if (!r.ok) return showToast(r.error, 'error');
    pendingServant = obj;
    const s = (r.data && r.data.summary) || {};
    const pr = s.progress || {}, po = s.posts || {}, li = s.likes || {}, re = s.results || {}, ig = s.ignored || {};
    $('servant-preview').innerHTML = `<div class="card" style="margin-top:12px; border:1px solid var(--gold);">
      <div style="font-weight:800; margin-bottom:8px;">👁️ معاينة استعادة بيانات الخدام (لم يُغيَّر شيء بعد)</div>
      <ul style="line-height:2; padding-inline-start:20px; font-size:0.88rem;">
        <li>التقدم: ${nz(pr.add)} جديد · ${nz(pr.merge)} يُدمج · ${nz(pr.skipped)} يُتخطّى (حساب غير موجود)</li>
        <li>المشاركات: ${nz(po.add)} تُضاف · ${nz(po.exists)} موجودة · ${nz(po.skipped)} تُتخطّى</li>
        <li>الإعجابات: ${nz(li.add)} تُضاف · ${nz(li.skipped)} تُتخطّى (موجودة، أو بلا مشاركة/حساب)</li>
        <li>النتائج: ${nz(re.add)} تُضاف${nz(re.without_account) ? ` (منها ${re.without_account} بلا حساب)` : ''} · ${nz(re.exists)} موجودة · ${nz(re.skipped)} تُتخطّى</li>
        <li style="color:var(--text-muted);">لن يُستعاد: ${nz(ig.unlock_codes)} كود فتح (يمكن توليد أكواد جديدة).</li>
      </ul>
      <p class="json-hint">الربط بالحسابات الموجودة بالمعرّف ثم بالإيميل. الموجود الآن لا يُستبدل: يُدمج التقدم ويبقى ما سجّله الخدام بعد المسح.</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
        <button class="btn btn-gold" onclick="ownerServantApply()">✅ تأكيد الاستعادة</button>
        <button class="btn btn-outline" onclick="ownerServantCancel()">إلغاء</button>
      </div></div>`;
  };
  window.ownerServantApply = async function () {
    if (!requireRole('owner') || !pendingServant) return;
    if (!confirm('تأكيد استعادة بيانات الخدام من الملف؟ سيُدمج مع الموجود ولا يُحذف شيء.')) return;
    const r = await Sync.call('owner_import_servant_data', { p_backup: pendingServant, p_apply: true });
    if (!r.ok) return showToast(r.error, 'error');
    pendingServant = null;
    $('servant-preview').innerHTML = '<div class="json-hint">✅ تمت استعادة بيانات الخدام. جارٍ تحديث البيانات…</div>';
    showToast('تمت استعادة بيانات الخدام', 'success');
    try { await Sync.pull(); } catch (e) { /* لا يهم */ }
    renderAll();
  };

  /* ===========================================================
     ٥) منطقة الخطر (المسح) — تسلسل آمن: نسخة شاملة ← حفظ ← مسح
     =========================================================== */
  const DANGER = {
    servant: {
      label: 'مسح بيانات الخدام', fn: 'owner_wipe_servant_data', slug: 'servant',
      del: 'التقدم، المشاركات، الإعجابات، نتائج المسابقات، أكواد الفتح',
      keep: 'الحسابات، المسابقات، الخطة، الأسفار',
      counts: [['progress', 'يوم تقدم'], ['posts', 'مشاركة'], ['post_likes', 'إعجاب'], ['results', 'نتيجة'], ['unlock_codes', 'كود فتح']]
    },
    contests: {
      label: 'مسح كل المسابقات', fn: 'owner_wipe_contests', slug: 'contests',
      del: 'كل المسابقات (وأكواد الفتح التابعة لها)',
      keep: 'النتائج القديمة، الحسابات، الخطة، الأسفار',
      counts: [['contests', 'مسابقة'], ['unlock_codes', 'كود فتح']]
    },
    plan: {
      label: 'مسح كل الخطة اليومية', fn: 'owner_wipe_plan', slug: 'plan',
      del: 'كل أيام الخطة (الماضية والقادمة)',
      keep: 'كل ما عدا الخطة',
      counts: [['plan_days', 'يوم خطة']]
    }
  };
  let dangerBusy = false, dangerCtx = null;   // dangerCtx = { type, blob, name }

  function dangerStatus(html) { const s = $('danger-status'); if (s) s.innerHTML = html; }
  function dangerCancel() {
    if (dangerBusy) return;
    dangerCtx = null;
    const c = $('danger-confirm'); if (c) c.innerHTML = '';
  }
  window.dangerCancel = dangerCancel;
  window.dangerOpen = function (type) {
    if (!requireRole('owner') || dangerBusy || !DANGER[type]) return;
    const d = DANGER[type];
    dangerCtx = { type: type, blob: null, name: null };
    $('danger-confirm').innerHTML = `<div class="danger-card">
      <strong>${escapeHtml(d.label)}</strong>
      <div>سيُمسح: ${escapeHtml(d.del)}.</div>
      <div>لن يُمس: ${escapeHtml(d.keep)}.</div>
      <div class="json-hint">قبل المسح تُحفظ نسخة شاملة تلقائيًّا على جهازك، ولو فشل تجهيزها يتوقف المسح ولا يُمسح شيء.</div>
      <label for="danger-input" style="font-weight:700;">اكتب DELETE بالأحرف الكبيرة للتأكيد:</label>
      <input type="text" id="danger-input" class="form-control" autocomplete="off" autocapitalize="characters" spellcheck="false" oninput="dangerInput()" />
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
        <button type="button" class="btn btn-danger" id="danger-run" disabled onclick="dangerRun()">تنفيذ المسح</button>
        <button type="button" class="btn btn-outline" id="danger-cancel" onclick="dangerCancel()">إلغاء</button>
      </div>
      <div id="danger-status" role="status" style="margin-top:10px;"></div>
    </div>`;
  };
  window.dangerInput = function () {
    const b = $('danger-run'), i = $('danger-input');
    if (b && i) b.disabled = dangerBusy || i.value !== 'DELETE';
  };
  function dangerLock(on) {
    dangerBusy = on;
    const i = $('danger-input'), r = $('danger-run'), c = $('danger-cancel');
    if (i) i.disabled = on; if (c) c.disabled = on;
    if (r) r.disabled = on || !i || i.value !== 'DELETE';
  }
  window.dangerRun = async function () {
    if (!requireRole('owner') || dangerBusy || !dangerCtx) return;
    const i = $('danger-input'); if (!i || i.value !== 'DELETE') return;
    const d = DANGER[dangerCtx.type];
    dangerLock(true);
    try {
      dangerStatus('⏳ جارٍ تجهيز النسخة الشاملة…');
      const r = await Sync.call('owner_export_full', {});
      if (!r.ok) { dangerStatus(`<span style="color:var(--danger);">❌ تعذّر تجهيز النسخة، لم يُمسح شيء. ${escapeHtml(r.error)}</span>`); return; }
      dangerCtx.name = `daily-service-backup-before-wipe-${d.slug}-${stamp()}.json`;
      dangerCtx.blob = new Blob([JSON.stringify(r.data, null, 1)], { type: 'application/json' });
      const how = await saveFileBlob(dangerCtx.blob, dangerCtx.name, 'application/json');
      if (how === 'download') { await dangerWipe(); return; }
      /* share / fail: لا نعرف هل حُفظ الملف، فنوقف المسح حتى تؤكد */
      dangerStatus(`<div>${how === 'fail' ? '⚠️ تعذّر حفظ الملف تلقائيًّا.' : '⚠️ لم نتأكد من حفظ الملف (فُتحت قائمة المشاركة).'} احفظه في الملفات أولًا، ثم أكّد.</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
          <button type="button" class="btn btn-gold btn-sm" onclick="dangerContinue()">حفظت الملف، كمّل المسح</button>
          <button type="button" class="btn btn-outline btn-sm" onclick="dangerResave()">إعادة حفظ الملف</button>
        </div>`);
    } finally { dangerLock(false); }
  };
  window.dangerResave = async function () {
    if (!requireRole('owner') || !dangerCtx || !dangerCtx.blob) return;
    const how = await saveFileBlob(dangerCtx.blob, dangerCtx.name, 'application/json');
    showToast(how === 'fail' ? 'تعذّر حفظ الملف على هذا الجهاز.' : how === 'share' ? 'اختر «حفظ في الملفات» من قائمة المشاركة.' : 'تم تنزيل الملف', how === 'fail' ? 'error' : 'success');
  };
  window.dangerContinue = async function () {
    if (!requireRole('owner') || dangerBusy || !dangerCtx || !dangerCtx.blob) return;
    dangerLock(true);
    try { await dangerWipe(); } finally { dangerLock(false); }
  };
  async function dangerWipe() {
    const d = DANGER[dangerCtx.type];
    dangerStatus('⏳ جارٍ المسح…');
    const r = await Sync.call(d.fn, { p_confirm: 'DELETE' });
    if (!r.ok) {
      dangerStatus(`<div style="color:var(--danger);">❌ فشل المسح: ${escapeHtml(r.error)}</div>
        <div class="json-hint">النسخة محفوظة عندك. يمكنك إعادة المحاولة.</div>
        <button type="button" class="btn btn-gold btn-sm" onclick="dangerContinue()">إعادة المحاولة</button>`);
      return;
    }
    const del = (r.data && r.data.deleted) || {};
    const parts = d.counts.map((c) => `${nz(del[c[0]])} ${c[1]}`).join(' · ');
    dangerCtx = null;
    const inp = $('danger-input'); if (inp) inp.value = '';
    dangerStatus(`<div style="color:var(--success); font-weight:700;">✅ تم المسح: ${escapeHtml(parts)}</div>`);
    showToast('تم المسح', 'success');
    try { await Sync.pull(); } catch (e) { /* لا يهم */ }
    renderAll();
  }

  /* عند التحميل: لو الكروت غير موجودة (index قديم) يبقى الجدول الأصلي يعمل */
})();
