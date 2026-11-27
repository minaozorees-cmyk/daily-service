/* v3.0.21 — زر «النتيجة النهائية». ملف مستقل: لا يعدّل أي دالة أو شاشة قديمة.
   • مسؤول/مالك: بعد انتهاء الميعاد يظهر زر فوق لوحة «النتائج المباشرة» يفتح الترتيب بلا درجات + إعلان/إلغاء إعلان للخدام.
   • خادم: بعد الإعلان فقط تظهر بطاقة جديدة فوق شاشة المسابقة فيها ترتيبه ودرجته.
   كل التحقق في السيرفر (sql/33). */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => escapeHtml(String(s == null ? '' : s));
  const me = () => { try { return getCurrentUser(); } catch (e) { return null; } };
  const isStaff = () => { const u = me(); return !!u && (u.role === 'admin' || u.role === 'owner'); };
  const visible = (el) => !!el && el.offsetParent !== null && !document.hidden;
  const MSG = { NOT_ENDED: 'لم ينتهِ ميعاد المسابقة بعد.', NO_CONTEST: 'لا توجد مسابقة حالية.', NOT_ANNOUNCED: 'لم تُعلن النتيجة بعد.' };
  const errText = (r) => { const m = String(r.error || ''); const k = Object.keys(MSG).find((x) => m.indexOf(x) >= 0); return r.offline ? 'يلزم اتصال بالإنترنت.' : (k ? MSG[k] : 'تعذّر تنفيذ الطلب.'); };

  /* ---------------- المسؤول / المالك ---------------- */
  let st = null, open = false, rank = null, busy = false, sig = '';
  function host() {
    let h = $('q3f-admin'); if (h) return h;
    const board = $('admin-quiz-board'); if (!board || !board.parentNode) return null;
    h = document.createElement('div'); h.id = 'q3f-admin'; board.parentNode.insertBefore(h, board); return h;
  }
  function paintAdmin() {
    const h = host(); if (!h) return;
    if (!st || !st.cid || !st.ended) { if (h.innerHTML) h.innerHTML = ''; sig = ''; return; }
    const s = [st.announced, st.announced_at, open, JSON.stringify(rank)].join('|');
    if (s === sig) return; sig = s;
    let body = '';
    if (open) {
      const rows = rank && rank.rows ? rank.rows : null;
      body = `<div class="q3f-panel">
        ${rows ? (rows.length ? rows.map((r) => `<div class="q3f-row ${r.rank <= 3 ? 'top' : ''}"><b>${r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : esc(r.rank)}</b><span>${esc(r.name || '—')}</span></div>`).join('') : '<p class="results-empty">لا توجد نتائج.</p>') : '<p class="results-empty">…جارٍ التحميل</p>'}
        <div class="q3f-state ${st.announced ? 'on' : ''}">${st.announced ? '✅ أُعلنت النتيجة للخدام' + (st.announced_by ? ' بواسطة ' + esc(st.announced_by) : '') : 'لم تُعلن للخدام بعد'}</div>
        ${st.announced ? '<button type="button" class="btn btn-outline btn-sm" onclick="q3fRevoke()">إلغاء الإعلان</button>' : '<button type="button" class="btn btn-primary btn-sm" onclick="q3fAnnounce()">📢 إعلان النتيجة للخدام</button>'}
      </div>`;
    }
    h.innerHTML = `<button type="button" class="q3f-btn" onclick="q3fToggle()" aria-expanded="${open}">🏁 النتيجة النهائية${st.announced ? ' <small>(مُعلنة)</small>' : ''}</button>${body}`;
  }
  async function loadStatus() {
    if (!isStaff() || busy) return; busy = true;
    try { const r = await Auth.rpc('final_status', {}); if (r.ok && r.data) { st = r.data; paintAdmin(); } } catch (e) {} finally { busy = false; }
  }
  async function loadRank() {
    const r = await Auth.rpc('staff_final_ranking', {});
    if (!r.ok) { open = false; showToast(errText(r), 'error'); } else rank = r.data;
    paintAdmin();
  }
  window.q3fToggle = function () { open = !open; if (open) { rank = null; loadRank(); } paintAdmin(); };
  window.q3fAnnounce = async function () {
    if (!window.confirm('سيرى كل الخدام ترتيبهم ودرجاتهم. متأكد من الإعلان؟')) return;
    const r = await Auth.rpc('staff_final_announce', {});
    if (!r.ok) return showToast(errText(r), 'error');
    st = r.data; showToast('أُعلنت النتيجة للخدام', 'success'); paintAdmin();
  };
  window.q3fRevoke = async function () {
    if (!window.confirm('إلغاء الإعلان؟ ستختفي النتيجة النهائية من شاشة الخدام.')) return;
    const r = await Auth.rpc('staff_final_revoke', {});
    if (!r.ok) return showToast(errText(r), 'error');
    st = r.data; showToast('أُلغي الإعلان', 'success'); paintAdmin();
  };
  setInterval(() => { if (isStaff() && visible($('admin-sub-live'))) loadStatus(); }, 15000);
  const prevSub = window.switchAdminSub;
  if (typeof prevSub === 'function') window.switchAdminSub = function (panel) { const o = prevSub.apply(this, arguments); if (panel === 'live') { sig = ''; loadStatus(); } return o; };

  /* ---------------- الخادم ---------------- */
  let mine = null, mBusy = false, mSig = '';
  function mHost() {
    let h = $('q3f-me'); if (h) return h;
    const box = $('quiz-container'); if (!box || !box.parentNode) return null;
    h = document.createElement('div'); h.id = 'q3f-me'; box.parentNode.insertBefore(h, box); return h;
  }
  function paintMine() {
    const h = mHost(); if (!h) return;
    const s = JSON.stringify(mine); if (s === mSig) return; mSig = s;
    if (!mine || !mine.cid) { h.innerHTML = ''; return; }
    if (!mine.joined) { h.innerHTML = ''; return; }
    const medal = mine.rank <= 3 ? ['🥇', '🥈', '🥉'][mine.rank - 1] : '🏁';
    h.innerHTML = `<div class="q3f-me"><div class="q3f-me-t">${medal} النتيجة النهائية${mine.title ? ' — ' + esc(mine.title) : ''}</div>
      <div class="q3f-me-g"><div><strong>${esc(mine.rank)}</strong><span>ترتيبك من ${esc(mine.count)}</span></div>
      <div><strong dir="ltr">${esc(mine.score)} / ${esc(mine.total)}</strong><span>درجتك</span></div></div></div>`;
  }
  async function loadMine() {
    const u = me(); if (!u || u.role !== 'servant' || mBusy) return; mBusy = true;
    try {
      const s = await Auth.rpc('final_status', {});
      if (s.ok && s.data && s.data.announced) { const r = await Auth.rpc('my_final_result', {}); mine = r.ok ? r.data : null; }
      else if (s.ok) mine = null;
      paintMine();
    } catch (e) {} finally { mBusy = false; }
  }
  setInterval(() => { if (visible($('tab-contest'))) loadMine(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { loadMine(); if (isStaff() && visible($('admin-sub-live'))) loadStatus(); } });
  setTimeout(() => { loadMine(); }, 3000);
})();
