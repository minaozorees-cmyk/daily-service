'use strict';
/* الخدمة اليومية v2.0 — شعار اليوم الروحي (الشواهد): رفع ملف JSON من لوحة «الخطة»، استخراج نصوص الآيات من ملفات الأسفار
   وقت الرفع، معاينة وتحذيرات، ثم حفظ المرجع + النص في Supabase (staff_replace_slogans). الصفحة الرئيسية تقرأ slogan_today.
   سكربت عادي يُحمَّل بعد admin16.js. الحماية الحقيقية في السيرفر. */
(function () {
  const MAX_ITEMS = 800, WARN_VERSES = 4, WARN_CHARS = 420, MAX_CHARS = 1200;
  let items = null;      // نتيجة المعاينة: [{ i, date, label, spec, book, ch, text, warn[], err }]
  let busy = false;

  const box = () => $('slogans-preview');
  const isRealDate = (s) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; const d = new Date(s + 'T00:00:00Z'); return !isNaN(d) && d.toISOString().slice(0, 10) === s; };
  const num = (x) => (x == null ? '' : String(x).trim());

  /* ---- الوضع الحالي ---- */
  async function refresh() {
    const el = $('slogans-status'); if (!el) return;
    const r = await Sync.call('staff_slogans_overview', {});
    if (!r.ok) { el.textContent = r.error; return; }
    const d = r.data || {}, cur = d.current;
    let html = `<div class="json-hint">${toAr(d.dated_total || 0)} شاهد بتاريخ (القادم منها ${toAr(d.dated_upcoming || 0)}) · ${toAr(d.rotating_total || 0)} شاهد دوّار</div>`;
    html += cur ? `<div class="slogan-now"><strong>شعار اليوم الآن:</strong> «${escapeHtml(cur.text)}»<div class="json-hint">${escapeHtml(cur.label)} — ${cur.kind === 'dated' ? 'بتاريخ اليوم' : 'من القائمة الدوّارة'}</div></div>`
      : `<div class="json-hint">لا توجد شواهد محفوظة: يظهر النص الثابت في الصفحة.</div>`;
    if ((d.upcoming || []).length) {
      html += `<details style="margin-top:8px;"><summary style="cursor:pointer;">الشواهد القادمة بتواريخ (${toAr(d.upcoming.length)})</summary>` +
        d.upcoming.map((u) => `<div class="json-hint" style="margin-top:6px;"><strong>${escapeHtml(u.on_date)}</strong> — ${escapeHtml(u.label)}<br>${escapeHtml(u.text)}…</div>`).join('') + `</details>`;
    }
    el.innerHTML = html;
  }

  /* ---- قراءة الملف والتحقق من الهيكل ---- */
  function parseFile(raw) {
    let data; try { data = JSON.parse(raw); } catch (e) { return { fatal: 'الملف ليس JSON صالحًا' }; }
    const list = Array.isArray(data) ? data : data && Array.isArray(data.slogans) ? data.slogans : null;
    if (!list) return { fatal: 'الصيغة غير مفهومة: المطلوب قائمة، أو كائن فيه الحقل slogans' };
    if (!list.length) return { fatal: 'القائمة فاضية' };
    if (list.length > MAX_ITEMS) return { fatal: 'الحد الأقصى ' + toAr(MAX_ITEMS) + ' شاهد في الملف الواحد' };
    const out = [], dates = {};
    list.forEach((e, k) => {
      const it = { i: k + 1, date: '', label: '', spec: '', book: '', ch: 0, text: '', warn: [], err: '' };
      out.push(it);
      if (!e || typeof e !== 'object' || Array.isArray(e)) { it.err = 'العنصر ليس كائنًا'; return; }
      it.book = num(e.book).toLowerCase();
      const ch = num(e.ch != null ? e.ch : e.chapter);
      it.spec = num(e.v != null ? e.v : e.verses != null ? e.verses : e.verse);
      it.date = num(e.date);
      it.label = num(e.label);
      if (!/^[a-z][a-z0-9_-]{1,40}$/.test(it.book)) { it.err = 'معرّف السفر (book) غير صالح'; return; }
      if (!/^\d{1,3}$/.test(ch) || +ch < 1 || +ch > 400) { it.err = 'رقم الأصحاح (ch) غير صالح'; return; }
      it.ch = +ch;
      if (!it.spec) { it.err = 'الآيات (v) ناقصة'; return; }
      if (it.date) {
        if (!isRealDate(it.date)) { it.err = 'التاريخ غير صالح (المطلوب YYYY-MM-DD)'; return; }
        if (dates[it.date]) { it.err = 'تاريخ مكرر مع العنصر ' + toAr(dates[it.date]); return; }
        dates[it.date] = it.i;
      }
      if (it.label.length > 120) { it.err = 'العنوان (label) أطول من ١٢٠ حرفًا'; return; }
    });
    return { items: out };
  }

  async function extract(list) {
    const groups = {};
    list.forEach((it) => { if (!it.err) (groups[it.book] = groups[it.book] || []).push(it); });
    const ids = Object.keys(groups);
    for (let g = 0; g < ids.length; g++) {
      const id = ids[g];
      $('slogans-progress').textContent = `استخراج النصوص… ${toAr(g + 1)} / ${toAr(ids.length)} (${id})`;
      for (const it of groups[id]) {
        const r = await Books.pick(id, it.ch, it.spec);
        if (!r.ok) { it.err = r.error; continue; }
        it.spec = r.spec;
        it.text = r.texts.map((t) => String(t).trim()).join(' ');
        if (!it.label) it.label = r.label;
        if (r.nums.length > WARN_VERSES) it.warn.push('أكثر من ' + toAr(WARN_VERSES) + ' آيات (' + toAr(r.nums.length) + ')');
        if (it.text.length > WARN_CHARS) it.warn.push('نص طويل (' + toAr(it.text.length) + ' حرفًا) وقد لا يظهر مريحًا في الكارت');
        if (it.text.length > MAX_CHARS) it.err = 'النص أطول من ' + toAr(MAX_CHARS) + ' حرفًا (الحد الأقصى المقبول)';
      }
      Books.release(id);   // تفريغ الذاكرة بعد كل سفر
    }
    $('slogans-progress').textContent = '';
  }

  function render() {
    const el = box(); if (!el) return;
    if (!items) { el.innerHTML = ''; return; }
    const errs = items.filter((x) => x.err), warns = items.filter((x) => !x.err && x.warn.length);
    const dated = items.filter((x) => x.date).length, rot = items.length - dated;
    let html = `<div class="json-hint"><strong>معاينة (لم يُحفظ شيء بعد):</strong> ${toAr(items.length)} شاهد — ${toAr(dated)} بتاريخ · ${toAr(rot)} دوّار · ${toAr(warns.length)} بتحذير · ${toAr(errs.length)} بخطأ</div>`;
    if (errs.length) {
      html += `<div class="bulk-bad"><strong>أخطاء (لازم تُصحَّح في الملف ثم يُعاد رفعه):</strong><ul>` +
        errs.slice(0, 30).map((x) => `<li>العنصر ${toAr(x.i)}${x.book ? ' (' + escapeHtml(x.book) + ' ' + toAr(x.ch || '') + ')' : ''}: ${escapeHtml(x.err)}</li>`).join('') +
        (errs.length > 30 ? `<li>و${toAr(errs.length - 30)} أخطاء أخرى…</li>` : '') + `</ul></div>`;
    }
    html += `<div class="slogan-list">` + items.filter((x) => !x.err).map((x) => `<div class="slogan-card ${x.warn.length ? 'slogan-warn' : ''}">
      <div class="slogan-meta">${x.date ? '📆 ' + escapeHtml(x.date) : '🔄 دوّار #' + toAr(items.filter((y) => !y.date && y.i <= x.i).length)}${x.warn.length ? ' · ⚠️' : ''}</div>
      <div class="slogan-text">«${escapeHtml(x.text)}»</div>
      <div class="json-hint">${escapeHtml(x.label)}</div>
      ${x.warn.map((w) => `<div class="chap-err">⚠️ ${escapeHtml(w)}</div>`).join('')}
    </div>`).join('') + `</div>`;
    const canSave = !errs.length && items.length > 0;
    html += `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
      <button class="btn btn-primary btn-sm" ${canSave ? '' : 'disabled'} onclick="adminSloganSave()">💾 حفظ واستبدال الشواهد</button>
      <button class="btn btn-outline btn-sm" onclick="adminSloganCancel()">إلغاء المعاينة</button></div>
      ${canSave ? '' : '<p class="json-hint">الحفظ متوقف حتى تُصحَّح الأخطاء أعلاه.</p>'}`;
    el.innerHTML = html;
  }

  window.adminSloganFile = function (input) {
    if (!requireRole('admin', 'owner')) { input.value = ''; return; }
    const file = input.files && input.files[0]; if (!file || busy) return;
    busy = true; items = null; render();
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const p = parseFile(String(reader.result || ''));
        if (p.fatal) { showToast(p.fatal, 'error'); return; }
        await extract(p.items);
        items = p.items; render();
      } catch (e) { showToast('تعذّر فحص الملف', 'error'); }
      finally { busy = false; input.value = ''; }
    };
    reader.onerror = () => { busy = false; showToast('تعذّر قراءة الملف', 'error'); };
    reader.readAsText(file, 'utf-8');
  };
  window.adminSloganCancel = function () { items = null; render(); };
  window.adminSloganSave = async function () {
    if (!requireRole('admin', 'owner') || !items || items.some((x) => x.err)) return;
    const d = items.filter((x) => x.date).length;
    if (!confirm(`سيتم استبدال كل الشواهد الحالية بـ ${toAr(items.length)} شاهد (${toAr(d)} بتاريخ و${toAr(items.length - d)} دوّار). متابعة؟`)) return;
    const payload = items.map((x) => { const o = { book: x.book, ch: x.ch, v: x.spec, label: x.label, text: x.text }; if (x.date) o.on_date = x.date; return o; });
    const r = await Sync.call('staff_replace_slogans', { p_items: payload });
    if (!r.ok) return showToast(r.error, 'error');
    showToast(`تم حفظ ${toAr(r.data.count)} شاهد`);
    items = null; render(); refresh();
    if (typeof loadSlogan === 'function') loadSlogan(true);
  };
  window.adminSloganClear = async function () {
    if (!requireRole('admin', 'owner')) return;
    if (!confirm('حذف كل الشواهد؟ سيرجع التطبيق للنص الثابت.')) return;
    const r = await Sync.call('staff_replace_slogans', { p_items: [] });
    if (!r.ok) return showToast(r.error, 'error');
    showToast('حُذفت كل الشواهد');
    items = null; render(); refresh();
    if (typeof loadSlogan === 'function') loadSlogan(true);
  };

  const prev = window.switchAdminSub;
  window.switchAdminSub = function (panel, btn) {
    const out = prev(panel, btn);
    try { if (panel === 'plan') refresh(); } catch (e) { if (typeof console !== 'undefined') console.warn('admin20', e); }
    return out;
  };
})();
