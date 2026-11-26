'use strict';
/* الخدمة اليومية v1.6 — واجهة الإدارة الإضافية:
   - مواعيد الأصحاحات (فتح + إغلاق) داخل لوحة «مواعيد المسابقة» — staff_preview_schedule / staff_set_openings / book_sections
   - التسجيل الجماعي للأسفار من books/index.json (للمالك فقط) — owner_register_books (معاينة ثم تنفيذ)
   سكربت عادي يُحمَّل بعد admin15.js. الحماية الحقيقية في السيرفر؛ ما هنا للعرض والتحقق المبكر. */
(function () {
  const isOwner = () => { const u = getCurrentUser(); return !!u && u.role === 'owner'; };
  const clearSectionMem = () => { try { Object.keys(sectionMem).forEach((k) => { delete sectionMem[k]; }); } catch (e) { /* لا يهم */ } };

  /* ===========================================================
     ١) مواعيد الأصحاحات
     =========================================================== */
  let rows = [];            // { section, local, closes, state, orig }
  let loadedBook = '', dirty = false, scheduled = false, loadSeq = 0;
  const STATE_LBL = { open: ['مفتوح', 'badge-green'], upcoming: ['لم يُفتح', 'badge-gold'], closed: ['أُغلق', 'badge-red'] };

  function bookList() { return Sync.books().slice().sort((a, b) => (a.sort - b.sort) || a.id.localeCompare(b.id)); }
  function fillBooks() {
    const sel = $('admin-chap-book'); if (!sel) return;
    const books = bookList();
    const cur = sel.value || loadedBook || ((getStore(STORE.schedule, DEFAULT_SCHEDULE) || {}).bookId || '');
    sel.innerHTML = books.map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.title)}</option>`).join('');
    if (books.some((b) => b.id === cur)) sel.value = cur;
    if (!$('admin-chap-date').value) $('admin-chap-date').value = todayIso();
  }
  function rowBad(r) {
    if (r.closes && !r.local) return 'لا إغلاق بلا موعد فتح';
    if (r.closes && r.local && r.closes <= r.local) return 'الإغلاق لازم يكون بعد الفتح';
    return '';
  }
  function statusLine() {
    const el = $('admin-chap-status'); if (!el) return;
    if (!rows.length) { el.textContent = ''; return; }
    if (!scheduled) { el.textContent = 'بلا جدولة: كل الأصحاحات مفتوحة. أي موعد تحفظه يجعل الباقي «لم يُفتح».'; return; }
    const c = { open: 0, upcoming: 0, closed: 0 };
    rows.forEach((r) => { if (c[r.state] != null) c[r.state]++; });
    el.textContent = `${toAr(rows.length)} أصحاح — ${toAr(c.open)} مفتوحة · ${toAr(c.upcoming)} لم تُفتح · ${toAr(c.closed)} مغلقة`;
  }
  function renderRows() {
    const box = $('admin-chap-rows'); if (!box) return;
    box.innerHTML = rows.map((r, i) => {
      const bad = rowBad(r), st = STATE_LBL[r.state];
      return `<div class="chap-card ${bad ? 'chap-bad' : ''}" data-i="${i}">
        <div class="chap-head"><strong>${escapeHtml(chapLabel(r.section))}</strong>${scheduled && st ? ` <span class="badge ${st[1]}">${st[0]}</span>` : ''}</div>
        <label class="chap-lbl">يفتح <input type="datetime-local" class="form-control" value="${escapeHtml(r.local || '')}" onchange="adminChapEdit(${i}, 'local', this.value)" /></label>
        <label class="chap-lbl">يُغلق (اختياري) <span class="chap-close-row"><input type="datetime-local" class="form-control" value="${escapeHtml(r.closes || '')}" onchange="adminChapEdit(${i}, 'closes', this.value)" /><button type="button" class="btn btn-outline btn-sm" onclick="adminChapEdit(${i}, 'closes', '')">مسح</button></span></label>
        ${bad ? `<div class="chap-err">${escapeHtml(bad)}</div>` : ''}
      </div>`;
    }).join('');
    $('admin-chap-actions').style.display = rows.length ? 'flex' : 'none';
    statusLine();
  }
  function chapLabel(n) {
    const b = Sync.books().find((x) => x.id === loadedBook);
    return (b && b.kind === 'agpeya' ? 'الصلاة ' : 'الأصحاح ') + toAr(n);
  }

  async function refresh(force) {
    const sel = $('admin-chap-book'); if (!sel) return;
    if (dirty && !force) return;            // لا نعيد الرسم أثناء تعديل غير محفوظ (درس v1.5)
    fillBooks();
    const book = sel.value;
    if (!book) { rows = []; loadedBook = ''; renderRows(); return; }
    const seq = ++loadSeq;
    const r = await Sync.call('book_sections', { p_book: book });
    if (seq !== loadSeq) return;
    if (!r.ok) { showToast(r.error, 'error'); return; }
    const secs = (r.data && r.data.sections) || [];
    loadedBook = book; dirty = false;
    scheduled = secs.some((x) => x.opens_at);
    rows = secs.map((x) => {
      const o = { section: x.section, local: x.opens_at ? Sync.isoToLocal(x.opens_at) : '', closes: x.closes_at ? Sync.isoToLocal(x.closes_at) : '', state: x.state };
      o.orig = o.local + '|' + o.closes;
      return o;
    });
    renderRows();
  }

  window.adminChapBookChanged = function () {
    if (dirty && !confirm('فيه تعديلات غير محفوظة على السفر الحالي وستضيع. متابعة؟')) { $('admin-chap-book').value = loadedBook; return; }
    dirty = false; refresh(true);
  };
  window.adminChapEdit = function (i, f, v) {
    if (!rows[i]) return;
    rows[i][f] = v || ''; dirty = true;
    renderRows();
  };
  window.adminChapPreview = async function () {
    if (!requireRole('admin', 'owner')) return;
    const book = $('admin-chap-book').value, d = $('admin-chap-date').value, t = $('admin-chap-time').value || '00:00';
    if (!book) return showToast('اختر السفر', 'error');
    if (!d) return showToast('اختر تاريخ أول فتح', 'error');
    const cd = $('admin-chap-close').value.trim();
    const closeDays = cd ? parseInt(cd, 10) : null;
    if (cd && !(closeDays >= 1 && closeDays <= 365)) return showToast('مدة الإغلاق من 1 إلى 365 يومًا', 'error');
    if (book !== loadedBook) { dirty = false; await refresh(true); }
    const r = await Sync.call('staff_preview_schedule', {
      p_book: book, p_start: `${d}T${t}`, p_mode: $('admin-chap-mode').value,
      p_every: Math.max(1, Math.min(60, parseInt($('admin-chap-every').value, 10) || 1)), p_close_days: closeDays
    });
    if (!r.ok) return showToast(r.error, 'error');
    const pv = (r.data && r.data.rows) || [];
    rows = pv.map((x) => ({ section: x.section, local: x.local || '', closes: x.closes_local || '', state: 'upcoming', orig: '' }));
    scheduled = true; dirty = true;
    renderRows();
    showToast('هذه معاينة فقط — عدّل أي كارت ثم اضغط «حفظ المواعيد»', 'warning');
  };
  window.adminChapSave = async function () {
    if (!requireRole('admin', 'owner')) return;
    const book = loadedBook; if (!book) return;
    if (rows.some((r) => rowBad(r))) return showToast('صحّح الكروت المعلّمة بالأحمر أولًا', 'error');
    const filled = rows.filter((r) => r.local);
    if (!filled.length) return showToast('لا توجد مواعيد للحفظ. لإلغاء الجدولة استعمل زر «إلغاء الجدولة».', 'error');
    if (filled.length < rows.length && !confirm('بعض الأصحاحات بلا موعد وستبقى «لم تُفتح». متابعة؟')) return;
    const payload = filled.map((r) => { const o = { section: r.section, local: r.local }; if (r.closes) o.closes_local = r.closes; return o; });
    const r = await Sync.call('staff_set_openings', { p_book: book, p_rows: payload });
    if (!r.ok) return showToast(r.error, 'error');
    showToast(`تم حفظ مواعيد ${toAr(r.data.count)} أصحاح`);
    dirty = false; clearSectionMem();
    await Sync.pull();
    if (typeof renderAdminBooks === 'function') renderAdminBooks();
    refresh(true);
  };
  window.adminChapClear = async function () {
    if (!requireRole('admin', 'owner')) return;
    const book = loadedBook;
    if (!book || !confirm('إلغاء جدولة هذا السفر؟ ستصير كل أصحاحاته مفتوحة (وتُمسح مواعيد الفتح والإغلاق).')) return;
    const r = await Sync.call('staff_set_openings', { p_book: book, p_rows: [] });
    if (!r.ok) return showToast(r.error, 'error');
    showToast('أُلغيت الجدولة');
    dirty = false; clearSectionMem();
    await Sync.pull();
    if (typeof renderAdminBooks === 'function') renderAdminBooks();
    refresh(true);
  };
  window.adminGoChapterSchedule = function () {
    const btn = document.querySelector('#admin-sub-nav .sub-btn[data-panel="schedule"]');
    if (btn) window.switchAdminSub('schedule', btn);
  };

  /* ===========================================================
     ٢) التسجيل الجماعي للأسفار (مالك)
     =========================================================== */
  let pending = null;   // { payload, skipped }
  const prog = () => $('bulkbooks-progress'), res = () => $('bulkbooks-result');
  function setProgress(done, total, label) {
    prog().innerHTML = `<div class="bulk-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}"><i style="width:${total ? Math.round(done * 100 / total) : 0}%"></i></div>
      <div class="json-hint">${escapeHtml(label || '')} ${toAr(done)} / ${toAr(total)}</div>`;
  }
  window.adminBulkBooksStart = async function () {
    if (!requireRole('owner')) return;
    const btn = $('bulkbooks-start'); btn.disabled = true; pending = null; res().innerHTML = '';
    try {
      Books.reset();
      let ix;
      try { ix = await Books.index(); } catch (e) { prog().innerHTML = ''; return showToast(e && e.code === 'BAD' ? 'index.json صيغته غير صالحة' : 'تعذّر قراءة books/index.json. تأكد أنه مرفوع ومنشور.', 'error'); }
      const list = ix.books, good = [], bad = [];
      if (!list.length) { prog().innerHTML = ''; return showToast('الفهرس فاضي', 'error'); }
      for (let i = 0; i < list.length; i++) {
        setProgress(i, list.length, 'فحص الأسفار');
        const b = list[i], rep = await Books.inspect(b.id);
        if (rep.ok) good.push({ id: b.id, title: b.title, kind: b.kind || 'bible', testament: b.testament || null, sections: rep.count });
        else bad.push({ id: b.id, title: b.title, problems: rep.problems });
      }
      setProgress(list.length, list.length, 'تم فحص');
      if (!good.length) { res().innerHTML = badHtml(bad); return showToast('لا يوجد سفر سليم للتسجيل', 'error'); }
      const r = await Sync.call('owner_register_books', { p_books: good, p_apply: false });
      if (!r.ok) return showToast(r.error, 'error');
      pending = { payload: good };
      res().innerHTML = previewHtml(r.data, bad);
    } finally { btn.disabled = false; }
  };
  function badHtml(bad) {
    if (!bad.length) return '';
    return `<div class="bulk-bad"><strong>⚠️ أسفار معطوبة (لن تُرسل):</strong><ul>` +
      bad.map((b) => `<li><span dir="ltr">${escapeHtml(b.id)}</span> — ${escapeHtml((b.problems || []).join('، '))}</li>`).join('') + `</ul></div>`;
  }
  function previewHtml(d, bad) {
    const sm = d.summary || {}, lbl = { new: ['جديد', 'badge-green'], changed: ['تغيّر', 'badge-gold'], same: ['كما هو', 'badge-blue'] };
    const warns = (d.warnings || []).map((w) => `<li>${escapeHtml(w)}</li>`).join('');
    return `${badHtml(bad)}
      <div class="json-hint">معاينة (لم يُكتب شيء بعد): ${toAr(sm.new || 0)} جديد · ${toAr(sm.changed || 0)} تغيّر · ${toAr(sm.same || 0)} كما هو</div>
      ${warns ? `<div class="bulk-bad"><strong>تنبيهات:</strong><ul>${warns}</ul></div>` : ''}
      <div class="table-wrap"><table><thead><tr><th>السفر</th><th>الحالة</th><th>الأقسام</th></tr></thead><tbody>` +
      (d.books || []).map((b) => { const l = lbl[b.status] || ['', '']; const o = b.old ? toAr(b.old.sections) + ' ← ' : '';
        return `<tr><td>${escapeHtml(b.title)} <span dir="ltr" class="json-hint">${escapeHtml(b.id)}</span></td><td><span class="badge ${l[1]}">${l[0]}</span></td><td>${o}${toAr(b.new.sections)}</td></tr>`; }).join('') +
      `</tbody></table></div>
      <div style="margin-top:10px;"><button class="btn btn-primary btn-sm" onclick="adminBulkBooksApply()">✅ تنفيذ التسجيل</button></div>`;
  }
  window.adminBulkBooksApply = async function () {
    if (!requireRole('owner') || !pending) return;
    const r = await Sync.call('owner_register_books', { p_books: pending.payload, p_apply: true });
    if (!r.ok) return showToast(r.error, 'error');
    const sm = r.data.summary || {};
    pending = null; prog().innerHTML = '';
    res().innerHTML = `<p class="json-hint">✅ تم التسجيل: ${toAr(sm.new || 0)} جديد · ${toAr(sm.changed || 0)} تغيّر · ${toAr(sm.same || 0)} كما هو.</p>`;
    showToast('تم تسجيل الأسفار');
    clearSectionMem();
    await Sync.pull();
    if (typeof renderAdminBooks === 'function') renderAdminBooks();
  };

  /* خطاف: فتح لوحة المواعيد */
  const origSwitch = window.switchAdminSub;
  window.switchAdminSub = function (panel, btn) {
    const out = origSwitch(panel, btn);
    try { if (panel === 'schedule') { dirty = false; refresh(true); } } catch (e) { if (typeof console !== 'undefined') console.warn('admin16', e); }
    return out;
  };
})();
