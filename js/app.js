'use strict';

/* ===========================================================
   10.1 البيانات الافتراضية
   =========================================================== */
/* v10: مراحل الخدام */
/* v1.1: المراحل تأتي من js/auth.js (أكواد للسيرفر + عناوين عربية). الحسابات التجريبية حُذفت. */
const STAGES = Auth.STAGE_OPTIONS.map(s => s.label);

/* v1.4: BIBLE_DATA حُذفت — النصوص في books/ وتُحمَّل عند الطلب (js/books.js). */

/* v1.3: لا خطة ولا مسابقة افتراضية في الكود — كلها من السيرفر (plan_days / contests).
   لا نعرض خطة قديمة ولا أسئلة تجريبية قبل وصول البيانات. */
const DEFAULT_SCHEDULE = { book: '', info: '', timer: 0, none: true };
const DEFAULT_CONTEST = [];

/* v1.2: المشاركات من السيرفر (js/sync.js). حُذفت مشاركات النموذج التجريبي. */
const DEFAULT_POSTS = [];

/* ===========================================================
   10.2 مفاتيح التخزين
   =========================================================== */
const STORE = {
  plan13: 'ds_v2_plan_v13',   // v1.3: {day, next, plan} من plan_get_today (ds_v2_plan القديم لم يعد يُقرأ)
  schedule: 'ds_v2_schedule',
  contest: 'ds_v2_contest',
  progress: 'ds_v2_progress',
  results: 'ds_v2_results',
  posts: 'ds_v2_posts',
  fontSize: 'ds_v2_font_size',
  theme: 'ds_v2_theme',
  slogan: 'ds_v2_slogan',   // v2.0: { day, s } شعار اليوم (نسخة محلية للعمل أوفلاين)
  review: 'ds_v2_review'       // v1.4: آخر مراجعة أجوبة من السيرفر { uid, cid, at, data }
};

function getStore(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function setStore(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); return true; }
  catch { return false; }
}
function removeStore(key) { try { localStorage.removeItem(key); } catch {} }

/* ===========================================================
   10.3 الوضع الليلي / النهاري
   =========================================================== */
const SUN_ICON = `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`;
const MOON_ICON = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = theme === 'dark' ? SUN_ICON : MOON_ICON;
  ['themeIconLogin', 'themeIconApp'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = icon;
  });
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b1220' : '#1e3a8a');
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  setStore(STORE.theme, next);
}

function initTheme() {
  const saved = getStore(STORE.theme, null);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));
}

document.getElementById('themeToggleLogin').addEventListener('click', toggleTheme);
document.getElementById('themeToggleApp').addEventListener('click', toggleTheme);

/* ===========================================================
   10.4 الجلسة والمصادقة
   =========================================================== */
/* v1.1: الجلسة والحسابات من js/auth.js (Supabase). نُبقي الدوال متزامنة للكود القديم. */
function getCurrentUser() { return Auth.getUser(); }
function getAccounts() { return Auth.getAccounts(); }
function isStaffUser(u) { return !!u && (u.role === 'admin' || u.role === 'owner'); }

/* ===========================================================
   10.5 أدوات واجهة المستخدم
   =========================================================== */
const $ = id => document.getElementById(id);
let toastTimer = null;

function showToast(msg, type = '') {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast ' + type; }, 2800);
}

function roleLabel(role) {
  if (role === 'owner') return '👑 مالك';
  if (role === 'admin') return '🛡️ مسؤول';
  return '👤 خادم';
}
function roleClass(role) {
  if (role === 'owner') return 'role-owner';
  if (role === 'admin') return 'role-admin';
  return 'role-servant';
}

function openModal(id) { $(id).classList.add('open'); }
function closeModal(id) { $(id).classList.remove('open'); }

function setLoading(btn, loading, labelText) {
  btn.disabled = loading;
  btn.classList.toggle('loading', loading);
  const label = btn.querySelector('.btn-label');
  if (label && labelText) label.textContent = labelText;
}

function showFieldError(wrap, errorEl, msg) {
  if (wrap) wrap.classList.add('has-error');
  errorEl.textContent = msg;
  errorEl.classList.add('visible');
}
function clearFieldError(wrap, errorEl) {
  if (wrap) wrap.classList.remove('has-error');
  errorEl.textContent = '';
  errorEl.classList.remove('visible');
}

/* ===========================================================
   10.6 شاشة الدخول — التهيئة والمنطق
   =========================================================== */
const loginForm = $('loginForm');
const loginScreen = $('login-screen');
const appShell = $('app-shell');
const emailInput = $('email');
const passwordInput = $('password');
const emailWrap = $('emailWrap');
const passwordWrap = $('passwordWrap');
const emailError = $('emailError');
const passwordError = $('passwordError');
const submitBtn = $('submitBtn');
const rememberChk = $('remember');

$('year').textContent = new Date().getFullYear();

/* إظهار/إخفاء كلمة المرور */
$('togglePass').addEventListener('click', () => {
  const isPass = passwordInput.type === 'password';
  passwordInput.type = isPass ? 'text' : 'password';
  $('togglePass').setAttribute('aria-pressed', String(isPass));
  $('eyeIcon').innerHTML = isPass
    ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-6.5 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="2" y1="2" x2="22" y2="22"/>`
    : `<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>`;
});

/* مسح الأخطاء عند الكتابة */
emailInput.addEventListener('input', () => clearFieldError(emailWrap, emailError));
passwordInput.addEventListener('input', () => clearFieldError(passwordWrap, passwordError));

/* التحقق من النموذج */
function validateLogin() {
  let valid = true;
  const email = emailInput.value.trim();
  if (!email) { showFieldError(emailWrap, emailError, 'من فضلك أدخل البريد الإلكتروني.'); valid = false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showFieldError(emailWrap, emailError, 'صيغة البريد غير صحيحة.'); valid = false; }
  const pass = passwordInput.value;
  if (!pass) { showFieldError(passwordWrap, passwordError, 'من فضلك أدخل كلمة المرور.'); valid = false; }
  else if (pass.length < 6) { showFieldError(passwordWrap, passwordError, 'كلمة المرور ٦ أحرف على الأقل.'); valid = false; }
  return valid;
}

/* إرسال النموذج */
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (submitBtn.disabled) return;
  clearFieldError(emailWrap, emailError);
  clearFieldError(passwordWrap, passwordError);

  if (!validateLogin()) { showToast('راجع البيانات المُدخلة.', 'error'); return; }

  setLoading(submitBtn, true, 'جارٍ التحقق…');
  const result = await Auth.login(emailInput.value, passwordInput.value, rememberChk.checked);
  setLoading(submitBtn, false, 'دخول');

  if (!result.ok) { showToast(result.error, 'error'); return; }

  showToast(`أهلاً ${result.user.name} ✅`, 'success');
  enterApp();
});

/* نسيت كلمة المرور */
$('forgotLink').addEventListener('click', (e) => {
  e.preventDefault();
  showToast('لو نسيت كلمة المرور، تواصل مع المسؤول.', 'warning');
});

/* فتح مودال إنشاء الحساب */
$('openCreateAccountBtn').addEventListener('click', () => {
  $('createAccountForm').reset();
  ['ca-name-error','ca-phone-error','ca-stage-error','ca-email-error','ca-pass-error','ca-pass2-error'].forEach(id => {
    $(id).textContent = ''; $(id).classList.remove('visible');
  });
  openModal('createAccountModal');
});

/* إنشاء حساب خادم جديد — v1.1: على Supabase، والحساب نشط فورًا */
$('createAccountForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('ca-name').value.trim();
  const phone = Auth.normalizePhone($('ca-phone').value);
  const email = $('ca-email').value.trim();
  const stage = $('ca-stage').value;
  const pass = $('ca-pass').value;
  const pass2 = $('ca-pass2').value;
  let valid = true;

  if (!name || name.length < 2) { showFieldError(null, $('ca-name-error'), 'أدخل الاسم الكامل.'); valid = false; }
  else $('ca-name-error').classList.remove('visible');

  if (!phone) { showFieldError(null, $('ca-phone-error'), 'رقم تليفون غير صالح (أرقام فقط، من ٨ إلى ١٥ رقمًا).'); valid = false; }
  else $('ca-phone-error').classList.remove('visible');

  if (!Auth.STAGE_OPTIONS.some(s => s.code === stage)) { showFieldError(null, $('ca-stage-error'), 'اختر المرحلة.'); valid = false; }
  else $('ca-stage-error').classList.remove('visible');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showFieldError(null, $('ca-email-error'), 'بريد إلكتروني غير صالح.'); valid = false; }
  else $('ca-email-error').classList.remove('visible');

  if (!pass || pass.length < 6) { showFieldError(null, $('ca-pass-error'), 'كلمة المرور ٦ أحرف على الأقل.'); valid = false; }
  else $('ca-pass-error').classList.remove('visible');

  if (pass !== pass2) { showFieldError(null, $('ca-pass2-error'), 'كلمتا المرور غير متطابقتين.'); valid = false; }
  else $('ca-pass2-error').classList.remove('visible');

  if (!valid) return;

  const btn = $('createAccountForm').querySelector('[type="submit"]');
  btn.disabled = true;
  const res = await Auth.signup({ name, phone, stage, email, password: pass });
  btn.disabled = false;
  if (!res.ok) {
    if (res.error.indexOf('مسجّل بالفعل') !== -1) showFieldError(null, $('ca-email-error'), res.error);
    else showToast(res.error, 'error');
    return;
  }

  showToast(`✨ تم إنشاء حساب ${res.user.name} بنجاح — جاري الدخول...`, 'success');
  closeModal('createAccountModal');
  setTimeout(() => enterApp(), 500);
});

/* ===========================================================
   10.7 دخول / خروج التطبيق
   =========================================================== */
function enterApp() {
  const user = getCurrentUser();
  if (!user) { logout(); return; }
  loginScreen.style.display = 'none';
  appShell.style.display = 'block';
  resetQuizState();
  renderAll();
  switchTab('today');
  switchTodaySub('plan');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (isStaffUser(user)) refreshAccounts(true);
  Sync.init();   // v1.2: ترحيل بيانات الجهاز مرة واحدة + بدء المزامنة
  restoreDraft();
}

async function logout(message) {
  /* v1.2: نحاول رفع ما في الطابور قبل الخروج (حتى ٢٫٥ ثانية)؛ وإلا يبقى للدخول التالي لنفس الحساب */
  try {
    if (getCurrentUser() && Sync.pendingCount()) {
      await Promise.race([Sync.flush(), new Promise(r => setTimeout(r, 2500))]);
    }
  } catch {}
  Auth.logout();
  clearDraft();
  quizUnlock = null;
  Sync.reset();
  appShell.style.display = 'none';
  loginScreen.style.display = '';
  emailInput.value = '';
  passwordInput.value = '';
  clearFieldError(emailWrap, emailError);
  clearFieldError(passwordWrap, passwordError);
  showToast(typeof message === 'string' && message ? message : 'تم تسجيل الخروج.', '');
  setTimeout(() => emailInput.focus({ preventScroll: true }), 250);
}

/* ===========================================================
   10.8 التنقل بين التبويبات
   =========================================================== */
function switchTab(tabName) {
  // توافق: "bible" أصبحت تبويب "قراءة" الفرعي داخل "today"
  if (tabName === 'bible') {
    switchTab('today');
    switchTodaySub('reading');
    return;
  }
  // الضغط على "اليوم" يرجع دائماً إلى الخطة اليومية
  if (tabName === 'today') switchTodaySub('plan');

  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const sec = $('tab-' + tabName);
  if (sec) sec.classList.add('active');
  const btn = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
  if (btn) btn.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* Sub-tabs داخل تبويب "اليوم" */
function switchTodaySub(sub) {
  document.querySelectorAll('.today-sub-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.today-sub-btn').forEach(b => b.classList.remove('active'));
  const panel = $('today-sub-' + sub);
  if (panel) panel.classList.add('active');
  const btn = document.querySelector(`.today-sub-btn[data-sub="${sub}"]`);
  if (btn) btn.classList.add('active');
  if (sub === 'reading' && !$('scripture-display').innerHTML.trim()) updateChapterSelector();   // v1.4: lazy — يحمّل الفهرس ثم النص عند أول فتح
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* من الصفحة الأولى إلى كتابة تأمل جديد */
function goAddReflection() {
  switchTab('posts');
  setTimeout(() => {
    const ta = $('new-post-text');
    if (ta) { ta.scrollIntoView({ behavior: 'smooth', block: 'center' }); ta.focus({ preventScroll: true }); }
  }, 350);
}

function switchAdminSub(panel, btn) {
  document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('#admin-sub-nav .sub-btn').forEach(b => b.classList.remove('active'));
  $('admin-sub-' + panel).style.display = 'block';
  btn.classList.add('active');
  if (panel === 'books') renderAdminBooks();
  if (panel === 'unlock') renderAdminUnlock();
}

/* ===========================================================
   10.9 العرض الرئيسي
   =========================================================== */
function renderAll() {
  const user = getCurrentUser();
  if (!user) return;

  $('current-role-badge').textContent = `${roleLabel(user.role)}: ${user.name}` + (user.stage && user.stageCode !== 'general' ? ` • ${user.stage}` : '');

  // إظهار/إخفاء تبويب الإدارة
  const navAdmin = $('nav-admin');
  if (user.role === 'servant') {
    navAdmin.classList.add('hidden');
    if ($('tab-admin').classList.contains('active')) switchTab('today');
  } else {
    navAdmin.classList.remove('hidden');
  }

  // عناصر المالك فقط
  document.querySelectorAll('.owner-only').forEach(el => {
    el.style.display = (user.role === 'owner') ? 'inline-block' : 'none';
  });

  renderToday();
  renderContest();
  renderPosts();
  renderProfile();
  if (user.role !== 'servant') renderAdminPanels();
}

/* ===========================================================
   10.10 تبويب اليوم
   =========================================================== */
function todayKey() {
  return Sync.todayKey();   // v1.2: اليوم بتوقيت القاهرة (يُضبط من السيرفر)
}

const toAr = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const pad2 = n => (n < 10 ? '0' : '') + n;
/* اليوم بتوقيت القاهرة بصيغة YYYY-MM-DD (todayKey بلا أصفار) */
function todayIso() { const a = todayKey().split('-').map(Number); return `${a[0]}-${pad2(a[1])}-${pad2(a[2])}`; }
function fmtLongDate(iso) {
  const a = String(iso).slice(0, 10).split('-').map(Number);
  if (a.length !== 3 || a.some(isNaN)) return '';
  return new Date(a[0], a[1] - 1, a[2]).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
}

/* v1.3: تحويل صف plan_days إلى الشكل الذي تعرضه الواجهة. العنوان والشاهد يُشتقّان من book_id + القسم + الآيات (لا نص حر). */
function planView(p) {
  if (!p) return null;
  const title = p.book_title || '';
  const short = p.book_short || title.replace(/^(إنجيل|سفر|رسالة)\s+(معلمنا\s+)?/, '');
  const sec = p.section ? ` ${toAr(p.section)}` : '';
  const verses = p.verse_from ? ` : ${toAr(p.verse_from)}${p.verse_to && p.verse_to !== p.verse_from ? ' - ' + toAr(p.verse_to) : ''}` : '';
  return {
    reading: title ? title + (p.section ? ` — الأصحاح ${toAr(p.section)}` : '') : '',
    ref: title ? `${short}${sec}${verses}` : '',
    bookId: p.book_id || null, section: p.section || null, verseFrom: p.verse_from || null, verseTo: p.verse_to || null,
    meditation: p.meditation || '', prayer: p.prayer || '', challenge: p.challenge || ''
  };
}

/* حالة خطة اليوم: ok (توجد) | none (لا توجد لليوم) | stale (لم تُحمَّل خطة هذا اليوم بعد — مثلًا الجهاز أوفلاين منذ أمس) */
function todayPlanState() {
  const rec = getStore(STORE.plan13, null);
  if (!rec || rec.day !== todayIso()) return { state: 'stale' };
  if (!rec.plan) return { state: 'none', next: rec.next || null };
  return { state: 'ok', plan: planView(rec.plan) };
}

/* v2.0: شعار اليوم — من slogan_today (الاستخراج تم وقت الرفع). النسخة المحلية تعرض فورًا وأوفلاين؛ بلا شيء ⇒ النص الثابت في الصفحة. */
let sloganDefault = null, sloganBusy = false, sloganTs = 0;
function applySlogan(s) {
  const q = $('hero-slogan-text'), r = $('hero-slogan-ref'); if (!q || !r) return;
  if (!sloganDefault) sloganDefault = { text: q.textContent, ref: r.textContent };
  if (s && s.text) {
    const t = String(s.text).trim();
    q.textContent = /^[«"“]/.test(t) ? t : '«' + t + '»';
    r.textContent = s.label || '';
    q.classList.toggle('long', t.length > 170);
  } else { q.textContent = sloganDefault.text; r.textContent = sloganDefault.ref; q.classList.remove('long'); }
}
async function loadSlogan(force) {
  const day = todayIso(), c = getStore(STORE.slogan, null);
  applySlogan(c && c.day === day ? c.s : null);
  if (sloganBusy || (!force && c && c.day === day && Date.now() - sloganTs < 30 * 60 * 1000)) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  sloganBusy = true;
  try {
    const r = await Sync.call('slogan_today', {});
    if (r.ok && r.data) { sloganTs = Date.now(); setStore(STORE.slogan, { day, s: r.data.slogan || null }); applySlogan(r.data.slogan || null); }
  } catch (e) { /* يبقى المعروض */ }
  finally { sloganBusy = false; }
}

function renderToday() {
  const user = getCurrentUser();
  if (!user) return;
  loadSlogan();
  const ps = todayPlanState();
  const plan = ps.state === 'ok' ? ps.plan : { ref: '', reading: '', meditation: '', prayer: '', challenge: '' };
  const key = `${user.id}:${todayKey()}`;
  const progressAll = getStore(STORE.progress, {});
  const userProg = progressAll[key] || { reading: false, meditation: false, prayer: false, challenge: false };

  const dateLabel = Sync.cairoNow().toLocaleDateString('ar-EG', { weekday: 'long', month: 'short', day: 'numeric' });
  $('today-date-label').textContent = dateLabel;
  $('plan-verse-ref').textContent = plan.ref;
  $('plan-verse-ref').style.display = plan.ref ? '' : 'none';
  $('plan-reading-title').textContent = plan.reading || 'بلا قراءة محددة لهذا اليوم';
  const medText = personalize(plan.meditation, user);
  $('plan-meditation-preview').textContent = medText.length > 46 ? medText.slice(0, 46) + '...' : medText;
  $('full-meditation-text').textContent = medText;
  $('plan-prayer-title').textContent = plan.prayer || '—';
  $('plan-challenge-title').textContent = personalize(plan.challenge, user, true);

  /* v1.3: لا خطة لليوم ⇒ لا نعرض خطة أمس. رسالة + أقرب يوم قادم له خطة */
  const noPlan = $('no-plan-box');
  const hasPlan = ps.state === 'ok';
  document.querySelectorAll('#tab-today .task-block, #task-row-challenge').forEach(el => { el.style.display = hasPlan ? '' : 'none'; });
  if (noPlan) {
    noPlan.style.display = hasPlan ? 'none' : '';
    noPlan.textContent = ps.state === 'none'
      ? (ps.next ? `لا توجد خطة اليوم، الخطة القادمة تبدأ يوم ${fmtLongDate(ps.next)}.` : 'لا توجد خطة اليوم، ولم تُحدَّد خطة قادمة بعد.')
      : ps.state === 'stale' ? 'لم تُحمَّل خطة اليوم بعد. اتصل بالإنترنت مرة واحدة لتحميلها.' : '';
  }
  if (hasPlan) renderTaskPanels(plan);

  const tasks = ['reading', 'meditation', 'prayer', 'challenge'];
  let doneCount = 0;
  tasks.forEach(t => {
    const row = $('task-row-' + t);
    const btn = $('btn-done-' + t);
    if (userProg[t]) {
      doneCount++;
      row.classList.add('done');
      btn.textContent = '✓ مكتمل';
      btn.className = 'btn btn-success btn-sm';
    } else {
      row.classList.remove('done');
      btn.textContent = 'تم';
      btn.className = 'btn btn-primary btn-sm';
    }
  });

  const pct = Math.round((doneCount / tasks.length) * 100);
  $('today-percent').textContent = pct + '%';
  $('streak-count').textContent = computeStreaks(userDayCounts(user.id)).current;
  $('today-ring-fg').style.strokeDashoffset = String(238.76 * (1 - pct / 100));
  $('today-ring-pct').textContent = pct + '%';
  $('today-ring-sub').textContent = `${doneCount} من ${tasks.length} مهام`;
  $('today-ring-title').textContent = pct === 100 ? 'أتممت مهام اليوم 🎉' : pct >= 50 ? 'اقتربت، أكمل!' : pct > 0 ? 'بداية طيبة ✨' : 'ابدأ يومك بالصلاة';
  $('today-ring').classList.toggle('complete', pct === 100);
  $('celebration-banner').textContent = `🎉 مبارك يا ${user.name}! أتممت جميع مهامك الروحية اليوم بنجاح ١٠٠٪`;
  $('celebration-banner').style.display = (pct === 100) ? 'block' : 'none';

  // نشاط الفريق: يظهر للمسؤول والمالك فقط
  const isMod = user.role === 'admin' || user.role === 'owner';
  $('team-active-box').style.display = isMod ? '' : 'none';
  $('stats-grid').style.gridTemplateColumns = isMod ? '' : 'repeat(2, 1fr)';
  if (isMod) {
    // إجمالي الإنجاز = مهام اليوم الأربع + حل المسابقة، لكل الحسابات النشطة
    const accs = getAccounts().filter(a => a.active);
    const solved = new Set(getStore(STORE.results, []).map(r => r.userId));
    const perMember = tasks.length + 1;
    let done = 0;
    accs.forEach(a => {
      const pr = progressAll[`${a.id}:${todayKey()}`] || {};
      done += tasks.filter(t => pr[t]).length + (solved.has(a.id) ? 1 : 0);
    });
    const total = accs.length * perMember;
    const pctAll = total ? Math.round((done / total) * 100) : 0;
    $('team-active').textContent = `📊 ${pctAll}%`;
    $('team-active-lbl').textContent = `إجمالي الإنجاز · ${done}/${total}`;
  }
}

/* فتح/إغلاق لوحة المهمة أسفلها */
function toggleTaskPanel(key) {
  const block = $('task-block-' + key);
  if (!block) return;
  const open = block.classList.toggle('open');
  const info = block.querySelector('.task-info');
  if (info) info.setAttribute('aria-expanded', String(open));
}
function taskKey(e, key) {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTaskPanel(key); }
}

/* ===== v1.4: القراءة والأجبية تُحمَّل من books/ عند الطلب (js/books.js) ===== */
/* تطبيع عربي لمطابقة عنوان صلاة الأجبية مع نص الخطة الحر */
function normAr(str) {
  return String(str || '')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\s+/g, ' ').trim();
}

/* آيات كنص عادي (تُهرَّب دائمًا؛ النصوص لا تحمل HTML) */
function versesHtml(verses) {
  return (verses || []).map((v, i) => `<p style="margin-bottom:10px;"><span class="verse-num">${i + 1}</span> ${escapeHtml(v)}</p>`).join('');
}

/* v1.7: وحدة الأجبية (blocks) تُعرض بعناوين أقسامها ونصوصها؛ الأسفار العادية بالآيات */
function blocksHtml(blocks) {
  const para = t => String(t || '').split(/\n\s*\n/).map(x => x.trim()).filter(Boolean)
    .map(x => `<p style="margin-bottom:10px;">${escapeHtml(x).replace(/\n/g, '<br>')}</p>`).join('');
  return (blocks || []).map(b => `<div class="prayer-block"><div class="prayer-block-title">${escapeHtml(b.title)}</div>${para(b.text)}</div>`).join('');
}
function chapterHtml(ch) { return ch && ch.blocks ? blocksHtml(ch.blocks) : versesHtml(ch ? ch.verses : []); }

/* حجب الأصحاحات غير المفتوحة — في الواجهة فقط (تجربة مستخدم؛ ملفات books/ عامة).
   الحالة من السيرفر book_sections (مواعيد الفتح بوقت السيرفر). المسؤول/المالك يرون كل شيء.
   لو تعذّر التحقق (أوفلاين ولا نسخة محفوظة) يُحجب القسم احتياطًا. */
const SECTION_CACHE_KEY = 'ds_v2_book_sections';
const sectionMem = {};
function isStaffNow() { const u = getCurrentUser(); return !!u && (u.role === 'admin' || u.role === 'owner'); }
async function bookSectionStates(bookId) {
  if (isStaffNow()) return { all: true };
  const now = Date.now();
  const m = sectionMem[bookId];
  if (m && now - m.at < 30000) return m.data;
  const r = await Sync.call('book_sections', { p_book: bookId });
  if (r.ok && r.data && Array.isArray(r.data.sections)) {
    const map = {};
    r.data.sections.forEach(s => { map[s.section] = { state: s.state, opensAt: s.opens_at || null, closesAt: s.closes_at || null }; });
    const data = { map };
    sectionMem[bookId] = { at: now, data };
    const all = getStore(SECTION_CACHE_KEY, {}) || {};
    all[bookId] = { at: now, map };
    setStore(SECTION_CACHE_KEY, all);
    return data;
  }
  const saved = (getStore(SECTION_CACHE_KEY, {}) || {})[bookId];
  if (saved && saved.map) return { map: saved.map, stale: true };
  return { unknown: true };
}
function sectionStatus(states, n) {
  if (states.all) return { open: true };
  if (states.unknown) return { open: false, unknown: true };
  const s = states.map[n];
  if (s && s.state === 'open') return { open: true };
  if (s && s.state === 'closed') return { open: false, closed: true, closesAt: s.closesAt || null };   // v1.6: فات موعد الإغلاق
  return { open: false, opensAt: s ? s.opensAt : null };
}
function lockedHtml(st) {
  const msg = st.unknown
    ? 'تعذّر التحقق من موعد فتح هذا القسم. اتصل بالإنترنت ثم أعد المحاولة.'
    : st.closed ? '🔒 أُغلق هذا القسم'
    : '🔒 هذا القسم لم يُفتح بعد' + (st.opensAt ? ' — يُفتح ' + fmtOpenDate(st.opensAt) : '');
  return `<p style="color:var(--text-muted); font-size:0.92rem; line-height:1.9; text-align:center; padding:14px 6px;">${escapeHtml(msg)}</p>`;
}
function readingErrorHtml(e) {
  const code = e && e.code;
  const msg = code === 'OFFLINE' ? 'تعذّر تحميل النص الآن. اتصل بالإنترنت مرة واحدة لتحميله، وبعدها يعمل بدون اتصال.'
    : code === 'MISSING' ? 'هذا النص غير متوفر داخل التطبيق بعد.'
    : 'تعذّر تحميل النص. حاول مرة أخرى.';
  return `<p style="color:var(--text-muted); font-size:0.9rem; line-height:1.8; text-align:center; padding:14px 6px;">${escapeHtml(msg)}</p>`;
}
const LOADING_HTML = '<p style="color:var(--text-muted); font-size:0.88rem; text-align:center; padding:14px 6px;">جارٍ التحميل…</p>';

function findPlanPrayer(text, chapters) {
  const t = normAr(text);
  const keys = Object.keys(chapters || {}).sort((a, b) => Number(a) - Number(b));
  return keys.find(k => { const title = normAr(String(chapters[k].title || '').split('—')[0]); return title && t.includes(title); }) || keys[0] || '';
}

/* قراءة اليوم (من خطة السيرفر: book_id + section). يُعاد رسمها بلا وميض لو لم يتغيّر شيء. */
let taskReadingSeq = 0;
async function renderTaskReading(plan) {
  const box = $('task-reading-content');
  const openLink = (fn, label) => `<div style="margin-top:12px;"><button class="btn btn-outline btn-sm" onclick="${fn}()">${label}</button></div>`;
  const sig = [plan.reading, plan.bookId, plan.section, isStaffNow() ? 's' : 'u'].join('|');
  if (box.dataset.sig === sig && box.dataset.done === '1') return;
  const seq = ++taskReadingSeq;
  box.dataset.sig = sig; box.dataset.done = '';
  const done = html => { if (seq === taskReadingSeq) { box.innerHTML = html; box.dataset.done = '1'; } };
  const muted = t => `<p style="color:var(--text-muted); font-size:0.9rem; line-height:1.8;">${escapeHtml(t)}</p>`;
  if (!plan.reading) return done(muted('لا توجد قراءة محددة لهذا اليوم.') + openLink('openBible', '📖 فتح قسم القراءة'));
  if (!plan.bookId || !plan.section) return done(muted(`نص «${plan.reading}» غير متوفر داخل التطبيق بعد. يمكنك تصفح الأسفار المتاحة من قسم القراءة.`) + openLink('openBible', '📖 فتح قسم القراءة'));
  if (!box.innerHTML.trim()) box.innerHTML = LOADING_HTML;
  const states = await bookSectionStates(plan.bookId);
  if (seq !== taskReadingSeq) return;
  const st = sectionStatus(states, plan.section);
  if (!st.open) return done(lockedHtml(st) + openLink('openBible', '📖 فتح قسم القراءة'));
  try {
    const book = await Books.load(plan.bookId);
    const ch = book.chapters[String(plan.section)];
    if (!ch) return done(muted(`نص «${plan.reading}» غير متوفر داخل التطبيق بعد. يمكنك تصفح الأسفار المتاحة من قسم القراءة.`) + openLink('openBible', '📖 فتح قسم القراءة'));
    done(`<div style="font-weight:800; color:var(--primary); margin-bottom:10px;">${escapeHtml(book.title)} — ${escapeHtml(ch.title)}</div>
       <div class="scripture-text">${chapterHtml(ch)}</div>` + openLink('openBible', '📖 فتح في قسم القراءة'));
  } catch (e) {
    if (e && e.code === 'MISSING') return done(muted(`نص «${plan.reading}» غير متوفر داخل التطبيق بعد. يمكنك تصفح الأسفار المتاحة من قسم القراءة.`) + openLink('openBible', '📖 فتح قسم القراءة'));
    done(readingErrorHtml(e) + openLink('openBible', '📖 فتح قسم القراءة'));
  }
}

function renderTaskPanels(plan) {
  renderTaskReading(plan);

  // التأمل
  const curUser = getCurrentUser();
  $('task-meditation-content').innerHTML = `<p style="line-height:1.9; font-size:0.96rem; white-space:pre-wrap;">${escapeHtml(personalize(plan.meditation, curUser, true))}</p>`;

  // الأجبية
  renderTaskPrayerSelect(plan);
}

let prayerSeq = 0;
async function renderTaskPrayerSelect(plan) {
  const sel = $('task-prayer-select');
  const seq = ++prayerSeq;
  try {
    const book = await Books.load('agpeya');
    if (seq !== prayerSeq) return;
    const keys = Object.keys(book.chapters).sort((a, b) => Number(a) - Number(b));
    if (sel.dataset.ready !== '1') {
      sel.innerHTML = keys.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(book.chapters[k].title)}</option>`).join('');
      sel.dataset.ready = '1';
      sel.dataset.plan = '\u0000';
    }
    if (sel.dataset.plan !== plan.prayer) {
      sel.value = findPlanPrayer(plan.prayer, book.chapters);
      sel.dataset.plan = plan.prayer;
    }
    renderPrayerText();
  } catch (e) {
    if (seq === prayerSeq) $('task-prayer-text').innerHTML = readingErrorHtml(e);
  }
}

let prayerTextSeq = 0;
async function renderPrayerText() {
  const box = $('task-prayer-text'), key = $('task-prayer-select').value;
  const seq = ++prayerTextSeq;
  if (!key) { box.innerHTML = ''; return; }
  try {
    const states = await bookSectionStates('agpeya');
    if (seq !== prayerTextSeq) return;
    const st = sectionStatus(states, Number(key));
    if (!st.open) { box.innerHTML = lockedHtml(st); return; }
    const book = await Books.load('agpeya');
    if (seq !== prayerTextSeq) return;
    const ch = book.chapters[key];
    box.innerHTML = ch ? chapterHtml(ch) : readingErrorHtml({ code: 'MISSING' });
  } catch (e) {
    if (seq === prayerTextSeq) box.innerHTML = readingErrorHtml(e);
  }
}

const TASK_KEYS = ['reading', 'meditation', 'prayer', 'challenge'];
const STREAK_MIN_TASKS = 1;   // أقل عدد مهام ليُحسب اليوم ضمن الاستمرارية
const BADGES = [
  { days: 3,  icon: '🌱', name: 'بداية الطريق' },
  { days: 7,  icon: '🕊️', name: 'أسبوع مبارك' },
  { days: 14, icon: '⭐', name: 'أسبوعان ثابتان' },
  { days: 30, icon: '👑', name: 'شهر كامل' }
];

function haptic(pattern) { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch {} }

function fireConfetti(mode) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = document.createElement('div');
  layer.className = 'confetti-layer';
  const colors = ['#fbbf24', '#f59e0b', '#3b82f6', '#22c55e', '#a855f7', '#ef4444'];
  const n = mode === 'big' ? 80 : 52;
  for (let i = 0; i < n; i++) {
    const piece = document.createElement('i');
    piece.className = 'confetti-piece';
    piece.style.setProperty('--x', (Math.random() * 100) + 'vw');
    piece.style.setProperty('--dx', (Math.random() * 40 - 20) + 'vw');
    piece.style.setProperty('--r', (Math.random() * 900 - 450) + 'deg');
    piece.style.setProperty('--d', (1.8 + Math.random() * 1.4) + 's');
    piece.style.setProperty('--delay', (Math.random() * 0.5) + 's');
    piece.style.background = colors[i % colors.length];
    piece.style.width = (6 + Math.random() * 5) + 'px';
    piece.style.height = (9 + Math.random() * 7) + 'px';
    layer.appendChild(piece);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 3800);
}

/* ---- الاستمرارية ---- */
function dayKeyOf(date) { return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`; }
function parseDayKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }

function userDayCounts(userId) {
  const all = getStore(STORE.progress, {});
  const out = {};
  Object.keys(all).forEach(k => {
    if (!k.startsWith(userId + ':')) return;
    const c = TASK_KEYS.filter(t => all[k] && all[k][t]).length;
    if (c) out[k.slice(userId.length + 1)] = c;
  });
  return out;
}

function computeStreaks(counts) {
  const ok = d => (counts[dayKeyOf(d)] || 0) >= STREAK_MIN_TASKS;
  let current = 0;
  const d = Sync.cairoNow(); d.setHours(0, 0, 0, 0);
  if (!ok(d)) d.setDate(d.getDate() - 1);   // لا تنكسر السلسلة قبل انتهاء اليوم
  while (ok(d)) { current++; d.setDate(d.getDate() - 1); }

  const days = Object.keys(counts).filter(k => counts[k] >= STREAK_MIN_TASKS).map(parseDayKey).sort((a, b) => a - b);
  let longest = 0, run = 0, prev = null;
  days.forEach(dt => {
    run = (prev && Math.round((dt - prev) / 86400000) === 1) ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = dt;
  });
  return { current, longest, total: days.length };
}

function badgeCount(longest) { return BADGES.filter(b => longest >= b.days).length; }

let calView = null;
function calNav(delta) {
  const now = Sync.cairoNow();
  const d = new Date(calView.y, calView.m + delta, 1);
  if (d > new Date(now.getFullYear(), now.getMonth(), 1)) return;
  calView = { y: d.getFullYear(), m: d.getMonth() };
  renderStreakCard();
}

function showDayInfo(key) {
  const user = getCurrentUser();
  if (!user) return;
  const c = userDayCounts(user.id)[key] || 0;
  const label = parseDayKey(key).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
  showToast(`${label}: ${c} من ${TASK_KEYS.length} مهام`);
}

function renderStreakCard() {
  const user = getCurrentUser();
  if (!user || !$('cal-grid')) return;
  const counts = userDayCounts(user.id);
  const st = computeStreaks(counts);
  const now = Sync.cairoNow();
  if (!calView) calView = { y: now.getFullYear(), m: now.getMonth() };

  $('streak-cur').textContent = st.current;
  $('streak-best').textContent = st.longest;
  $('streak-days').textContent = st.total;
  $('streak-badge').textContent = st.current ? `🔥 ${st.current} يوم متتالي` : 'ابدأ اليوم';

  const first = new Date(calView.y, calView.m, 1);
  const dim = new Date(calView.y, calView.m + 1, 0).getDate();
  const offset = (first.getDay() + 1) % 7;   // الأسبوع يبدأ بالسبت
  $('cal-title').textContent = first.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
  $('cal-next').disabled = calView.y === now.getFullYear() && calView.m === now.getMonth();

  const todayK = dayKeyOf(now);
  let html = '';
  for (let i = 0; i < offset; i++) html += '<div class="cal-cell empty"></div>';
  for (let day = 1; day <= dim; day++) {
    const dt = new Date(calView.y, calView.m, day);
    const k = dayKeyOf(dt);
    const future = dt.getTime() > now.getTime();
    html += `<button type="button" class="cal-cell lvl${counts[k] || 0} ${k === todayK ? 'today' : ''} ${future ? 'future' : ''}" ${future ? 'disabled' : ''} onclick="showDayInfo(${jsArg(k)})">${day.toLocaleString('ar-EG')}</button>`;
  }
  $('cal-grid').innerHTML = html;

  $('badges-grid').innerHTML = BADGES.map(b => {
    const earned = st.longest >= b.days;
    return `<div class="badge-item ${earned ? 'earned' : 'locked'}">
      <div class="badge-medal">${earned ? b.icon : '🔒'}</div>
      <div class="badge-name">${b.name}</div>
      <div class="badge-req">${b.days} أيام</div>
    </div>`;
  }).join('');
}

function toggleTask(taskKey) {
  const user = getCurrentUser();
  if (!user) return;
  const key = `${user.id}:${todayKey()}`;
  const progressAll = getStore(STORE.progress, {});
  if (!progressAll[key]) progressAll[key] = { reading: false, meditation: false, prayer: false, challenge: false };

  const badgesBefore = badgeCount(computeStreaks(userDayCounts(user.id)).longest);
  const wasAll = TASK_KEYS.every(t => progressAll[key][t]);

  progressAll[key][taskKey] = !progressAll[key][taskKey];
  setStore(STORE.progress, progressAll);
  renderToday();
  renderStreakCard();

  const on = progressAll[key][taskKey];
  Sync.setTask(todayKey(), taskKey, on);   // v1.2: رفع للسيرفر عبر الطابور
  const allNow = TASK_KEYS.every(t => progressAll[key][t]);
  const newBadges = badgeCount(computeStreaks(userDayCounts(user.id)).longest);

  if (!on) { showToast('تم التراجع عن المهمة'); return; }
  haptic(25);
  if (newBadges > badgesBefore) {
    haptic([60, 40, 60, 40, 140]); fireConfetti('big');
    showToast(`🏅 مبارك يا ${user.name}! وسام جديد: ${BADGES[newBadges - 1].name}`, 'success');
  } else if (allNow && !wasAll) {
    haptic([60, 40, 60, 40, 140]); fireConfetti();
    showToast(`🎉 أتممت مهام اليوم كلها يا ${user.name}!`, 'success');
  } else {
    showToast(`✨ عاش يا ${user.name}! تم تسجيل إنجاز المهمة`);
  }
}

/* ===========================================================
   10.11 الكتاب والأجبية
   =========================================================== */
let readingMode = 'bible';
let readingReadyP = null;
let readingSeq = 0;
let chapterListSeq = 0;

function currentReadingBook() {
  return readingMode === 'agpeya' ? 'agpeya' : $('bible-book-select').value;
}

/* قائمة الأسفار من books/index.json (عناوين فقط). تُنفَّذ عند أول فتح لقسم القراءة، ومرة واحدة. */
function initBibleSelectors() {
  if (!readingReadyP) {
    readingReadyP = Books.index().then(ix => {
      const books = ix.books.filter(b => b.kind !== 'agpeya');
      $('bible-book-select').innerHTML = books.map(b => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.title)}</option>`).join('');
      return ix;
    });
    readingReadyP.catch(() => { readingReadyP = null; });
  }
  return readingReadyP;
}

async function updateChapterSelector() {
  const seq = ++readingSeq;
  const chapSel = $('bible-chapter-select'), disp = $('scripture-display');
  let ix;
  try { ix = await initBibleSelectors(); } catch (e) { if (seq === readingSeq) { chapSel.innerHTML = ''; disp.innerHTML = readingErrorHtml(e); } return; }
  if (seq !== readingSeq) return;
  const id = currentReadingBook();
  const b = ix.books.find(x => x.id === id);
  let secs = [];
  if (b) {
    // v1.6: الأقسام من ملف السفر نفسه (الفهرس لا يحمل sections)
    chapSel.innerHTML = ''; disp.innerHTML = LOADING_HTML;
    try { secs = (await Books.sections(id)).slice().sort((x, y) => x.n - y.n); }
    catch (e) { if (seq === readingSeq) disp.innerHTML = readingErrorHtml(e); return; }
    if (seq !== readingSeq) return;
  } else {
    disp.innerHTML = readingErrorHtml({ code: 'MISSING' });
  }
  chapSel.innerHTML = secs.map(s => `<option value="${escapeHtml(String(s.n))}">${escapeHtml(s.title)}</option>`).join('');
  renderScripture();
  // علامة 🔒 على الأقسام غير المفتوحة (لاحقًا، دون تعطيل العرض)
  const listSeq = ++chapterListSeq;
  bookSectionStates(id).then(states => {
    if (listSeq !== chapterListSeq || states.all) return;
    Array.from(chapSel.options).forEach((o, i) => {
      if (!sectionStatus(states, Number(o.value)).open && secs[i]) o.textContent = '🔒 ' + secs[i].title;
    });
  });
}

async function renderScripture() {
  const seq = ++readingSeq;
  const id = currentReadingBook(), key = $('bible-chapter-select').value, disp = $('scripture-display');
  if (!key) { disp.innerHTML = ''; return; }
  disp.innerHTML = LOADING_HTML;
  const states = await bookSectionStates(id);
  if (seq !== readingSeq) return;
  const st = sectionStatus(states, Number(key));
  if (!st.open) { disp.innerHTML = lockedHtml(st); return; }
  try {
    const book = await Books.load(id);
    if (seq !== readingSeq) return;
    const ch = book.chapters[key];
    disp.innerHTML = ch ? chapterHtml(ch) : readingErrorHtml({ code: 'MISSING' });
  } catch (e) {
    if (seq === readingSeq) disp.innerHTML = readingErrorHtml(e);
  }
}

function setReadingMode(mode) {
  readingMode = mode;
  const isAg = mode === 'agpeya';
  document.querySelectorAll('.reading-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  $('reading-title').textContent = isAg ? '🙏 الأجبية المقدسة' : '📖 الكتاب المقدس';
  $('reading-book-wrap').style.display = isAg ? 'none' : '';
  $('reading-selectors').style.gridTemplateColumns = isAg ? '1fr' : '1fr 1fr';
  $('reading-chapter-label').textContent = isAg ? 'اختر الصلاة:' : 'الأصحاح:';
  updateChapterSelector();
}

function openBible() {
  switchTab('bible');
  setReadingMode('bible');
}

function openAgpeya() {
  switchTab('bible');
  setReadingMode('agpeya');
}

/* ===========================================================
   10.12 المسابقة
   =========================================================== */
let selectedAnswers = {};
let quizIndex = 0;      // رقم السؤال الحالي (يساوي عدد الأسئلة = كارت الإرسال)
let quizDone = false;   // تم إرسال المحاولة
let quizBusy = false;   // منع النقر المزدوج أثناء الانتقال
let quizTimerId = null;

function clearQuizTimer() { if (quizTimerId) { clearInterval(quizTimerId); quizTimerId = null; } }

/* v1.3: كود الفتح الذي أدخله الخادم (يبقى مع تحديثات المزامنة، ويسقط لو تغيّرت المسابقة أو بعد التسليم) */
let quizUnlock = null;   // { code, cid }
function activeUnlock() { return quizUnlock && quizUnlock.cid === contestId() ? quizUnlock : null; }

/* نافذة المسابقة بوقت السيرفر (الفرق محفوظ في Sync): none | not_started | open | ended. الحماية الحقيقية في submit_result. */
function contestWindow() {
  const sched = getStore(STORE.schedule, DEFAULT_SCHEDULE) || {};
  if (sched.none || !Sync.serverCid()) return { state: 'none' };
  const now = Sync.nowMs();
  const st = sched.startsAt ? Date.parse(sched.startsAt) : NaN;
  const en = sched.endsAt ? Date.parse(sched.endsAt) : NaN;
  if (!isNaN(st) && now < st) return { state: 'not_started', sched };
  if (!isNaN(en) && now >= en) return { state: 'ended', sched };
  return { state: 'open', sched };
}

function resetQuizState() {
  clearQuizTimer();
  selectedAnswers = {};
  quizIndex = 0;
  quizDone = false;
  quizBusy = false;
  const rb = $('quiz-result-box');
  if (rb) rb.style.display = 'none';
}

function quizTimerSeconds() {
  const sched = getStore(STORE.schedule, DEFAULT_SCHEDULE) || {};
  return Math.max(0, parseInt(sched.timer, 10) || 0);
}

function renderContest() {
  const sched = getStore(STORE.schedule, DEFAULT_SCHEDULE) || DEFAULT_SCHEDULE;
  $('contest-book-badge').textContent = sched.book || '—';
  $('contest-schedule-info').textContent = sched.info || '';
  renderScheduleNote(sched);
  renderQuiz();
}

/* معرّف المسابقة: دالة التجزئة نفسها من v1.0 (لا تتغير). تُحسب من الأسئلة + نص «سفر المسابقة». */
function contestIdFor(questions, label) {
  const str = JSON.stringify(questions) + '|' + (label || '');
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return 'c' + (h >>> 0).toString(36);
}
/* المسابقة الحالية: المعرّف المخزَّن في السيرفر هو المرجع (الأسئلة لا تصل الخادم قبل البداية، فلا نحسبه محليًّا إلا عند غيابه) */
function contestId() {
  const sc = Sync.serverCid();
  if (sc) return sc;
  const sched = getStore(STORE.schedule, DEFAULT_SCHEDULE) || {};
  return contestIdFor(getStore(STORE.contest, DEFAULT_CONTEST), sched.book);
}

/* أول محاولة مسجلة للمستخدم في المسابقة الحالية (أو undefined) */
function firstAttempt(user) {
  const cid = contestId();
  return getStore(STORE.results, []).find(r => r.userId === user.id && r.cid === cid);
}

function renderQuiz() {
  clearQuizTimer();
  const questions = getStore(STORE.contest, DEFAULT_CONTEST);
  const n = questions.length;
  const box = $('quiz-container');
  const win = contestWindow();
  const unlock = activeUnlock();
  const user = getCurrentUser();
  const prev = user && firstAttempt(user);

  if (win.state === 'none') { box.innerHTML = '<p style="text-align:center; color:var(--text-muted);">لا توجد مسابقة حالياً.</p>'; return; }
  if (!quizDone && !unlock && prev) quizDone = true;   // v1.4: المراجعة من السيرفر (renderQuizReview)
  if (quizDone) { renderQuizReview(box); box.insertAdjacentHTML('beforeend', unlockBoxHtml()); return; }
  /* v1.3: المسابقة مقفولة (لم تبدأ/انتهت) ولا يملك الخادم كود فتح ⇒ بطاقة إغلاق + خانة الكود */
  if (!unlock && win.state !== 'open') {
    const when = win.state === 'not_started' ? fmtSchedDate(win.sched.startDate, win.sched.startTime) : fmtSchedDate(win.sched.endDate, win.sched.endTime);
    box.innerHTML = `<div class="quiz-card" style="text-align:center;"><div style="font-size:2.2rem;">${win.state === 'not_started' ? '⏳' : '🔒'}</div>
      <div class="quiz-q" style="margin:8px 0 6px;">${win.state === 'not_started' ? 'لم تبدأ المسابقة بعد' : 'انتهى وقت المسابقة'}</div>
      ${when ? `<div style="font-size:0.84rem; color:var(--text-muted);">${win.state === 'not_started' ? 'تبدأ' : 'انتهت'}: ${escapeHtml(when)}</div>` : ''}</div>` + unlockBoxHtml();
    return;
  }
  if (!n) { box.innerHTML = '<p style="text-align:center; color:var(--text-muted);">لا توجد أسئلة حالياً.</p>'; return; }

  const secs = quizTimerSeconds();
  if (quizIndex > n) quizIndex = n;
  const pct = Math.round((quizIndex / n) * 100);
  const answered = Object.keys(selectedAnswers).length;
  const head = (label) => `
    <div class="quiz-progress"><span>${label}</span><span>✅ ${answered} / ${n}</span></div>
    <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${pct}%"></div></div>`;

  if (quizIndex < n) {
    const item = questions[quizIndex];
    const timed = secs > 0 && selectedAnswers[quizIndex] === undefined;
    box.innerHTML = head(`السؤال ${quizIndex + 1} من ${n}`) +
      (timed ? `<div class="quiz-timer"><div class="quiz-timer-track"><div class="quiz-timer-fill" id="quiz-timer-fill"></div></div><span id="quiz-timer-txt">⏱️ ${secs} ث</span></div>` : '') + `
      <div class="quiz-card">
        <div class="quiz-q">${escapeHtml(item.q)}</div>
        ${item.options.map((opt, oIdx) => `
          <button class="quiz-option ${selectedAnswers[quizIndex] === oIdx ? 'selected' : ''}" onclick="answerQuestion(${quizIndex}, ${oIdx})">
            <span class="quiz-radio">${selectedAnswers[quizIndex] === oIdx ? '🔘' : '⚪'}</span>
            <span>${escapeHtml(opt)}</span>
          </button>
        `).join('')}
      </div>`;
    if (timed) startQuizTimer(quizIndex, secs);
  } else {
    box.innerHTML = head('اكتمل الحل') + `
      <div class="quiz-card" style="text-align:center;">
        <div style="font-size:2.2rem;">🎯</div>
        <div class="quiz-q" style="margin:8px 0 14px;">أجبت على ${answered} من ${n} أسئلة</div>
        <button class="btn btn-gold" style="width:100%;" onclick="submitQuiz()">🏁 إرسال الإجابات وحساب الدرجة</button>
      </div>`;
  }
}

/* v1.3: خانة كود الفتح (يولّده المسؤول/المالك لخادم معيّن؛ يسمح بمحاولة إضافية أو بالحل بعد انتهاء الوقت) */
function unlockBoxHtml() {
  return `<div class="ds13-unlock">
      <div class="json-hint" style="margin:0 0 6px;">🔑 معك كود فتح من المسؤول؟ اكتبه هنا لإعادة المحاولة أو للحل بعد انتهاء الوقت.</div>
      <div style="display:flex; gap:8px;">
        <input type="text" id="quiz-unlock-code" class="form-control" dir="ltr" maxlength="14" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXXX-XXXXX" />
        <button class="btn btn-outline btn-sm" id="quiz-unlock-btn" onclick="redeemUnlock()">فتح</button>
      </div></div>`;
}

async function redeemUnlock() {
  const inp = $('quiz-unlock-code'), btn = $('quiz-unlock-btn');
  if (!inp || !getCurrentUser()) return;
  const code = inp.value.toUpperCase().replace(/[^0-9A-F]/g, '');
  if (code.length !== 10) return showToast('الكود مكوّن من ١٠ حروف وأرقام (A-F و 0-9)', 'error');
  if (btn) btn.disabled = true;
  const r = await Sync.call('check_unlock_code', { p_code: code });
  if (btn) btn.disabled = false;
  if (!r.ok) return showToast(r.error, 'error');
  if (!r.data || !r.data.ok) {
    const why = r.data && r.data.reason;
    return showToast(why === 'USED' ? 'هذا الكود استُعمل من قبل' : why === 'EXPIRED' ? 'انتهت مدة هذا الكود، اطلب كودًا جديدًا' : 'كود غير صحيح لهذه المسابقة', 'error');
  }
  quizUnlock = { code, cid: contestId() };
  clearQuizTimer();
  selectedAnswers = {}; quizIndex = 0; quizDone = false; quizBusy = false; reviewState = '';
  renderQuiz();
  showToast('تم فتح المسابقة لك. يمكنك الحل الآن 🔓', 'success');
}

function startQuizTimer(qIdx, secs) {
  const end = Date.now() + secs * 1000;
  quizTimerId = setInterval(() => {
    const left = end - Date.now();
    const fill = $('quiz-timer-fill'), txt = $('quiz-timer-txt');
    if (!fill || !txt) { clearQuizTimer(); return; }
    const ratio = Math.max(0, left / (secs * 1000));
    fill.style.width = (ratio * 100) + '%';
    fill.classList.toggle('low', ratio < 0.25);
    txt.textContent = `⏱️ ${Math.max(0, Math.ceil(left / 1000))} ث`;
    if (left <= 0) {
      clearQuizTimer();
      if (selectedAnswers[qIdx] === undefined && quizIndex === qIdx) {
        showToast('⏰ انتهى وقت السؤال', 'warning');
        quizIndex = qIdx + 1;
        renderQuiz();
      }
    }
  }, 100);
}

/* v1.4: مراجعة الإجابات من السيرفر (contest_review) بعد التسليم مباشرة. الأجوبة الصحيحة لا تصل الجهاز قبل ذلك.
   التخزين المحلي ds_v2_review = { uid, cid, at, data } لآخر مراجعة (يُمسح عند الخروج/تبديل الحساب). */
let reviewBusy = false;
let reviewState = '';          // '' | loading | pending (لم تُرفع بعد) | error
let reviewError = '';
let celebrateReview = false;   // احتفال بعد وصول الدرجة الرسمية لو كانت كاملة

function getReview(uid, cid) {
  const r = getStore(STORE.review, null);
  return r && r.uid === uid && r.cid === cid && r.data ? r : null;
}
/* المراجعة المحفوظة «حديثة» لو جُلبت لنفس سجل النتيجة المحلي (recAt) أو كانت أحدث منه.
   (recAt يمنع حلقة إعادة الجلب لو اختلفت ساعة السيرفر عن ساعة الجهاز قليلًا.) */
function reviewFresh(user, cid) {
  const rec = firstAttempt(user), rv = getReview(user.id, cid);
  return !!(rv && rec && (rv.recAt === rec.at || !rec.at || rv.at >= rec.at - 1000));
}
let lastReviewAt = 0, reviewTimer = null;
async function ensureReview(force) {
  const user = getCurrentUser();
  if (!user || reviewBusy) return;
  const cid = contestId();
  if (!firstAttempt(user)) return;
  if (!force && reviewFresh(user, cid)) return;
  if (!force && Date.now() - lastReviewAt < 4000) {   // حدّ أدنى بين محاولتين تلقائيتين، ونعيد المحاولة بعده
    if (!reviewTimer) reviewTimer = setTimeout(() => { reviewTimer = null; ensureReview(false); }, 4100 - (Date.now() - lastReviewAt));
    return;
  }
  lastReviewAt = Date.now();
  reviewBusy = true; reviewState = 'loading'; reviewError = '';
  let changed = false;
  try {
    if (Sync.pendingCount() > 0) { try { await Sync.flush(); } catch (e) {} }
    if (Sync.pendingCount() > 0) { reviewState = 'pending'; return; }
    const r = await Sync.call('contest_review', { p_cid: cid });
    if (!getCurrentUser() || getCurrentUser().id !== user.id) return;
    let okQ = false;
    if (r.ok && r.data && typeof r.data.questions === 'string') { try { okQ = Array.isArray(JSON.parse(r.data.questions)); } catch (e) {} }
    if (okQ) {
      const rec2 = firstAttempt(user);
      setStore(STORE.review, { uid: user.id, cid, at: Date.parse(r.data.created_at) || Date.now(), recAt: rec2 ? rec2.at : 0, data: r.data });
      reviewState = ''; changed = true;
      if (celebrateReview && r.data.score === r.data.total && r.data.total > 0) { fireConfetti('big'); haptic([60, 40, 60, 40, 140]); }
      celebrateReview = false;
    } else { reviewState = 'error'; reviewError = (r && r.error) || 'تعذّر تحميل مراجعة الإجابات.'; }
  } finally {
    reviewBusy = false;
    if (reviewState === 'loading') reviewState = '';
  }
  if (changed && !isQuizInProgress()) renderContest();
  else if (reviewState && !isQuizInProgress() && $('quiz-review-status')) renderContest();
}
function retryReview() { ensureReview(true); renderContest(); }

function renderQuizReview(box) {
  const user = getCurrentUser();
  const cid = contestId();
  const rec = user && firstAttempt(user);
  const rv = user && reviewFresh(user, cid) ? getReview(user.id, cid) : null;
  const holdFetch = reviewState === 'error' || (reviewState === 'pending' && Sync.pendingCount() > 0);
  if (user && rec && !rv && !reviewBusy && !holdFetch) setTimeout(() => ensureReview(false), 0);
  if (!rv) {
    // لا مراجعة بعد: ملخص بحسب ما هو معروف
    const pending = !rec || rec.pending;
    let note;
    if (reviewState === 'error') note = `<div id="quiz-review-status" style="font-size:0.82rem; color:var(--text-muted); margin-top:8px;">${escapeHtml(reviewError)} <button class="btn btn-outline btn-sm" onclick="retryReview()">🔄 إعادة المحاولة</button></div>`;
    else if (pending && (reviewState === 'pending' || !navigator.onLine)) note = `<div id="quiz-review-status" style="font-size:0.82rem; color:var(--text-muted); margin-top:8px;">⏳ تم حفظ إجاباتك على جهازك. ستظهر درجتك ومراجعة الإجابات عند الاتصال بالإنترنت.</div>`;
    else note = `<div id="quiz-review-status" style="font-size:0.82rem; color:var(--text-muted); margin-top:8px;">⏳ جارٍ احتساب درجتك وتحميل مراجعة الإجابات…</div>`;
    const sc = rec && !rec.pending ? `<div class="quiz-summary-score">${rec.score}<small> / ${rec.total}</small></div>` : '<div style="font-size:2.2rem;">✅</div>';
    box.innerHTML = `<div class="quiz-card" style="text-align:center;">${sc}
      <div class="quiz-q" style="margin:8px 0 6px;">تم إرسال إجاباتك</div>${note}
      <div style="margin-top:12px;"><button class="btn btn-gold btn-sm" onclick="switchTab('profile')">🏆 نتائجي في حسابي</button></div></div>`;
    return;
  }
  const d = rv.data;
  let questions = [];
  try { questions = JSON.parse(d.questions); } catch (e) {}
  const answers = d.answers || {};
  const r = { score: d.score, total: d.total };
  const pct = r.total ? Math.round((r.score / r.total) * 100) : 0;
  const msg = pct === 100 ? 'ممتاز! علامة كاملة 🎉' : pct >= 70 ? 'أحسنت 👏' : pct >= 50 ? 'جيد، وتستطيع أفضل 💪' : 'بارك الله مجهودك، وفي المرة القادمة بتركيز أكبر 🙏';
  const bestLine = (d.best_score != null && d.best_total && (d.best_score !== d.score || d.best_total !== d.total))
    ? `<div style="font-size:0.85rem; margin-top:6px;">🏅 أفضل درجة لك: <strong dir="ltr">${d.best_score} / ${d.best_total}</strong></div>` : '';
  const summary = `<div class="quiz-summary">
      <div class="quiz-summary-score">${r.score}<small> / ${r.total}</small></div>
      <div class="quiz-summary-msg">${msg}</div>${bestLine}
      <div style="font-size:0.78rem; color:var(--text-muted); margin-top:6px;">لإعادة المحاولة اطلب كود فتح من المسؤول (تُحتسب أفضل درجة)</div>
      <div class="quiz-nav" style="justify-content:center;">
        <button class="btn btn-gold btn-sm" onclick="switchTab('profile')">🏆 نتائجي في حسابي</button>
      </div>
    </div>`;
  const list = questions.map((item, qi) => {
    const mine = answers[qi];
    const hasKey = typeof item.answer === 'number';
    const isOk = hasKey && mine === item.answer;
    const status = mine === undefined ? '<span class="badge badge-red">⏰ لم تُجب</span>'
                 : isOk ? '<span class="badge badge-green">صحيحة</span>' : '<span class="badge badge-red">خاطئة</span>';
    const opts = (item.options || []).map((opt, oi) => {
      const isCorrect = hasKey && oi === item.answer;
      const isMineWrong = oi === mine && !isCorrect;
      const cls = isCorrect ? 'correct' : isMineWrong ? 'wrong' : '';
      const icon = isCorrect ? '✅' : isMineWrong ? '❌' : '⚪';
      const tag = isCorrect ? (oi === mine ? '<span class="review-tag">إجابتك</span>' : '<span class="review-tag">الإجابة الصحيحة</span>')
                : isMineWrong ? '<span class="review-tag">إجابتك</span>' : '';
      return `<div class="quiz-option review-opt ${cls}"><span>${icon}</span><span style="flex:1;">${escapeHtml(opt)}</span>${tag}</div>`;
    }).join('');
    return `<div class="quiz-card" style="margin-bottom:12px;"><div class="quiz-q">${qi + 1}. ${escapeHtml(item.q)} ${status}</div>${opts}</div>`;
  }).join('');
  box.innerHTML = summary + `<div class="honor-history-title" style="margin-top:16px;">📋 مراجعة الإجابات</div>` + list;
}

function answerQuestion(qIdx, oIdx) {
  if (quizBusy) return;
  quizBusy = true;
  clearQuizTimer();
  selectedAnswers[qIdx] = oIdx;

  // إظهار الاختيار فوراً ثم الانتقال للكارت التالي
  document.querySelectorAll('#quiz-container .quiz-option').forEach((el, i) => {
    el.classList.toggle('selected', i === oIdx);
    el.querySelector('.quiz-radio').textContent = i === oIdx ? '🔘' : '⚪';
  });
  setTimeout(() => {
    quizIndex = qIdx + 1;
    quizBusy = false;
    renderQuiz();
  }, 350);
}


function submitQuiz() {
  const user = getCurrentUser();
  if (!user) return;
  clearQuizTimer();
  const unlock = activeUnlock();
  if (firstAttempt(user) && !unlock) { renderContest(); return; }
  if (!unlock && contestWindow().state !== 'open') { showToast('⏰ المسابقة مغلقة الآن', 'warning'); renderContest(); return; }
  const questions = getStore(STORE.contest, DEFAULT_CONTEST);
  const answered = Object.keys(selectedAnswers).length;
  if (!quizTimerSeconds() && answered < questions.length) { showToast('⚠️ برجاء الإجابة على جميع الأسئلة أولاً'); return; }

  /* v1.4: لا تُحسب الدرجة على الجهاز (الأجوبة الصحيحة لم تعد تصل الخادم). الدرجة الرسمية والمراجعة من السيرفر.
     السجل المحلي «معلَّق» حتى يصل الرد؛ وفي إعادة بكود نُبقي أفضل درجة سابقة ظاهرة. */
  const results = getStore(STORE.results, []);
  const cidNow = contestId();
  const prevIdx = results.findIndex(r => r.userId === user.id && r.cid === cidNow);
  const prevRec = prevIdx > -1 ? results[prevIdx] : null;
  const rec = {
    userId: user.id, userName: user.name,
    score: prevRec && !prevRec.pending ? prevRec.score : 0,
    total: prevRec && !prevRec.pending && prevRec.total ? prevRec.total : questions.length,
    pending: true,
    cid: cidNow, answers: { ...selectedAnswers },
    date: Sync.cairoNow().toLocaleDateString('ar-EG'), at: Date.now()
  };
  if (prevIdx > -1) results[prevIdx] = rec; else results.push(rec);
  setStore(STORE.results, results);
  Sync.submitResult(cidNow, { ...selectedAnswers }, unlock ? unlock.code : null, prevRec);   // الدرجة الرسمية تُحسب في السيرفر
  quizUnlock = null;

  selectedAnswers = {};
  quizIndex = 0;
  quizDone = true;
  celebrateReview = true;
  reviewState = '';
  renderContest();
  renderMyResults();
  renderToday();
  $('quiz-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
  ensureReview(true);
}

/* ===========================================================
   10.13 المشاركات
   =========================================================== */
let postFilter = 'all';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
/* v1.4: وسيط آمن داخل onclick="fn(...)". escapeHtml وحدها لا تكفي هناك (المتصفح يفكّ الكيانات قبل تنفيذ JS)،
   فنكتب الوسيط كنص JSON ثم نهرّبه للسمة. */
function jsArg(v) { return escapeHtml(JSON.stringify(String(v))); }

function setPostFilter(f) {
  postFilter = f;
  $('filter-all-btn').className = f === 'all' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline';
  $('filter-mine-btn').className = f === 'mine' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline';
  renderPosts();
}

/* v1.4: مسودة المشاركة تُحفظ تلقائيًّا (تبقى لو أُعيد تحميل الصفحة بتحديث تلقائي) وتُمسح عند الإرسال أو الخروج */
const DRAFT_KEY = 'ds_v2_post_draft';
let lastAdminInputAt = 0;
function saveDraft() {
  const user = getCurrentUser(), ta = $('new-post-text');
  if (!user || !ta) return;
  try {
    if (ta.value.trim()) localStorage.setItem(DRAFT_KEY, JSON.stringify({ uid: user.id, text: ta.value.slice(0, 4000), vis: $('new-post-visibility').value }));
    else localStorage.removeItem(DRAFT_KEY);
  } catch (e) {}
}
function restoreDraft() {
  const user = getCurrentUser(), ta = $('new-post-text');
  if (!user || !ta || ta.value) return;
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (d && d.uid === user.id && d.text) { ta.value = d.text; if (d.vis === 'public' || d.vis === 'private') $('new-post-visibility').value = d.vis; }
  } catch (e) {}
}
function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} }
/* هل هناك كتابة لم تُحفظ؟ (يستعملها js/update.js لتأجيل التحديث التلقائي) */
function hasUnsavedInput() {
  const ta = $('new-post-text');
  if (ta && ta.value.trim()) return true;
  const a = document.activeElement;
  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.closest && a.closest('#tab-admin')) return true;
  if (Date.now() - lastAdminInputAt < 5 * 60 * 1000) return true;   // كتب مسؤول في لوحة الإدارة خلال آخر ٥ دقائق
  return false;
}
document.addEventListener('input', (e) => {
  const t = e.target;
  if (!t || !t.closest) return;
  if (t.id === 'new-post-text' || t.id === 'new-post-visibility') saveDraft();
  if (t.closest('#tab-admin')) lastAdminInputAt = Date.now();
}, true);

function createPost() {
  const user = getCurrentUser();
  if (!user) return;
  const text = $('new-post-text').value.trim();
  if (!text) return showToast('اكتب محتوى المشاركة أولاً');
  const posts = getStore(STORE.posts, DEFAULT_POSTS);
  const pid = Sync.uuid(), vis = $('new-post-visibility').value;
  posts.unshift({
    id: pid,
    authorId: user.id, authorName: user.name,
    text, visibility: vis,
    hidden: false, likes: [], createdAt: 'الآن'
  });
  setStore(STORE.posts, posts);
  Sync.postNew(pid, text, vis);
  $('new-post-text').value = '';
  clearDraft();
  renderPosts();
  showToast('✨ تم حفظ المشاركة بنجاح');
}

function renderPosts() {
  const user = getCurrentUser();
  if (!user) return;
  const posts = getStore(STORE.posts, DEFAULT_POSTS);
  const isMod = (user.role === 'admin' || user.role === 'owner');

  const visible = posts.filter(p => {
    if (p.visibility === 'private') return p.authorId === user.id;
    if (p.hidden) return p.authorId === user.id || isMod;
    return true;
  }).filter(p => postFilter === 'mine' ? p.authorId === user.id : true);

  const listEl = $('posts-list');
  if (visible.length === 0) {
    listEl.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">لا توجد مشاركات لعرضها في هذا القسم.</p>';
    return;
  }

  listEl.innerHTML = visible.map(p => {
    const isMine = p.authorId === user.id;
    const liked = p.likes.includes(user.id);
    const initial = (p.authorName || '✝').charAt(0);
    return `
      <div class="post-card ${p.hidden ? 'hidden-post' : ''}">
        <div class="post-meta">
          <div class="post-author-row">
            <div class="avatar-circle">${escapeHtml(initial)}</div>
            <div>
              <strong style="color:var(--text); font-size:0.9rem;">${escapeHtml(p.authorName)}</strong>
              <div style="font-size:0.74rem; color:var(--text-muted);">${escapeHtml(p.createdAt)}</div>
            </div>
          </div>
          <div>
            ${p.visibility === 'private' ? '<span class="badge badge-gold">🔒 خاص بي فقط</span>' : '<span class="badge badge-blue">🌍 عام</span>'}
            ${p.hidden ? '<span class="badge badge-red">🙈 مخفي إدارياً</span>' : ''}
          </div>
        </div>
        <p style="line-height:1.75; font-size:0.95rem; color:var(--text); white-space:pre-wrap;">${escapeHtml(p.text)}</p>
        <div class="post-actions">
          <button class="react-btn ${liked ? 'active' : ''}" onclick="toggleLike(${jsArg(p.id)})">❤️ 🙏 (${p.likes.length})</button>
          ${isMine && p.visibility === 'private' ? `<button class="btn btn-outline btn-sm" onclick="makePublic(${jsArg(p.id)})">🔄 تحويل لعام</button>` : ''}
          ${isMine ? `<button class="btn btn-outline btn-sm" onclick="editPost(${jsArg(p.id)})">✏️ تعديل</button>` : ''}
          ${(isMine || (isMod && p.visibility === 'public')) ? `<button class="btn btn-outline btn-sm" style="color:var(--danger);" onclick="deletePost(${jsArg(p.id)})">🗑️ حذف</button>` : ''}
          ${(isMod && p.visibility === 'public') ? `<button class="btn btn-outline btn-sm" onclick="toggleHidePost(${jsArg(p.id)})">${p.hidden ? '👁️ إظهار' : '🙈 إخفاء'}</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function toggleLike(id) {
  const user = getCurrentUser();
  const posts = getStore(STORE.posts, DEFAULT_POSTS);
  const post = posts.find(p => p.id === id);
  if (!post) return;
  const idx = post.likes.indexOf(user.id);
  if (idx === -1) post.likes.push(user.id); else post.likes.splice(idx, 1);
  setStore(STORE.posts, posts);
  Sync.like(id, idx === -1);
  renderPosts();
}

function makePublic(id) {
  const posts = getStore(STORE.posts, DEFAULT_POSTS);
  const post = posts.find(p => p.id === id);
  if (post) { post.visibility = 'public'; setStore(STORE.posts, posts); Sync.postPublish(id); renderPosts(); showToast('تم تحويل المشاركة إلى عامة'); }
}

function editPost(id) {
  const posts = getStore(STORE.posts, DEFAULT_POSTS);
  const post = posts.find(p => p.id === id);
  if (!post) return;
  const updated = prompt('تعديل نص المشاركة:', post.text);
  if (updated !== null && updated.trim() !== '') {
    post.text = updated.trim();
    setStore(STORE.posts, posts);
    Sync.postEdit(id, post.text);
    renderPosts();
    showToast('تم تعديل المشاركة');
  }
}

function deletePost(id) {
  if (!confirm('هل أنت متأكد من حذف هذه المشاركة؟')) return;
  let posts = getStore(STORE.posts, DEFAULT_POSTS);
  posts = posts.filter(p => p.id !== id);
  setStore(STORE.posts, posts);
  Sync.postDelete(id);
  renderPosts();
  if (getCurrentUser().role !== 'servant') renderAdminPanels();
  showToast('تم حذف المشاركة');
}

function toggleHidePost(id) {
  const posts = getStore(STORE.posts, DEFAULT_POSTS);
  const post = posts.find(p => p.id === id);
  if (post && post.visibility === 'public') {
    post.hidden = !post.hidden;
    setStore(STORE.posts, posts);
    Sync.postHide(id, post.hidden);
    renderPosts();
    renderAdminPanels();
    showToast(post.hidden ? 'تم إخفاء المشاركة' : 'تم إعادة إظهار المشاركة');
  }
}

/* نسخ احتياطي */
function exportBackup() {
  const user = getCurrentUser();
  const posts = getStore(STORE.posts, DEFAULT_POSTS).filter(p => p.authorId === user.id);
  const blob = new Blob([JSON.stringify({ user: user.name, exportedAt: new Date().toISOString(), posts }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `backup-${user.name}.json`; a.click();
  showToast('تم تنزيل النسخة الاحتياطية');
}

function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (Array.isArray(data.posts)) {
        /* v1.2: المسترجَعة تُرفع للسيرفر كمشاركات خاصة باسمك (لا إعادة نشر علني ولا تفاعلات) */
        const me = getCurrentUser();
        const existing = getStore(STORE.posts, DEFAULT_POSTS);
        const ids = new Set(existing.map(p => p.id));
        data.posts.forEach(p => {
          if (!p || typeof p.text !== 'string' || !p.text.trim()) return;
          const pid = Sync.validPid(p.id) ? p.id : Sync.uuid();
          if (ids.has(pid)) return;
          const text = p.text.trim().slice(0, 4000);
          existing.unshift({ id: pid, authorId: me.id, authorName: me.name, text, visibility: 'private', hidden: false, likes: [], createdAt: 'الآن' });
          Sync.postNew(pid, text, 'private');
          ids.add(pid);
        });
        setStore(STORE.posts, existing);
        renderPosts();
        showToast('تم استرجاع المشاركات بنجاح');
      }
    } catch { showToast('ملف غير صالح', 'error'); }
  };
  reader.readAsText(file);
}

/* ===========================================================
   10.14 حسابي
   =========================================================== */
function renderProfile() {
  const user = getCurrentUser();
  if (!user) return;
  $('profile-name-input').value = user.name;
  $('profile-email-display').value = user.email || '—';
  $('profile-role-display').value = roleLabel(user.role);
  renderMyResults();
  renderStreakCard();
}

function toggleSettings() {
  const open = $('settings-card').classList.toggle('open');
  $('settings-toggle').setAttribute('aria-expanded', String(open));
}

function renderMyResults() {
  const user = getCurrentUser();
  if (!user || !$('my-results-list')) return;
  const all = getStore(STORE.results, []).filter(r => !r.pending);   // v1.4: المعلَّق (بلا درجة رسمية بعد) خارج الإحصاءات
  const mine = all.filter(r => r.userId === user.id);
  const pctOf = r => r.total ? Math.round((r.score / r.total) * 100) : 0;

  const best = mine.length ? Math.max(...mine.map(pctOf)) : 0;
  const last = mine.length ? mine[mine.length - 1] : null;
  const avg = mine.length ? Math.round(mine.reduce((sum, r) => sum + pctOf(r), 0) / mine.length) : 0;

  // الترتيب حسب أفضل نتيجة لكل مشارك
  const bestBy = {};
  all.forEach(r => {
    const p = pctOf(r);
    if (!(r.userId in bestBy) || p > bestBy[r.userId]) bestBy[r.userId] = p;
  });
  Object.entries(Sync.bests()).forEach(([uid, b]) => { if (!(uid in bestBy) || b > bestBy[uid]) bestBy[uid] = b; });   // v1.2
  const bests = Object.values(bestBy);
  const rank = mine.length ? 1 + bests.filter(b => b > best).length : null;
  const medal = rank === 1 ? '🥇 ' : rank === 2 ? '🥈 ' : rank === 3 ? '🥉 ' : '';

  $('honor-ring').style.setProperty('--pct', best);
  $('honor-best').textContent = best + '%';
  $('honor-name').textContent = user.name;
  $('honor-rank').textContent = rank ? `${medal}المركز ${rank} من ${bests.length}` : 'لم تشارك بعد';
  $('honor-attempts').textContent = mine.length;
  $('honor-last').textContent = last ? `${last.score}/${last.total}` : '—';
  $('honor-avg').textContent = mine.length ? avg + '%' : '—';

  $('my-results-list').innerHTML = mine.length
    ? mine.slice().reverse().slice(0, 10).map(r => {
        const p = pctOf(r);
        const cls = p >= 80 ? 'good' : p >= 50 ? 'mid' : 'low';
        return `<div class="result-row">
          <div class="result-row-top">
            <span class="result-date">${escapeHtml(r.date)}</span>
            <span class="badge ${p === 100 ? 'badge-gold' : 'badge-blue'}">${p === 100 ? '🏅 ' : ''}${r.score} / ${r.total}</span>
          </div>
          <div class="result-bar"><div class="result-bar-fill ${cls}" style="width:${p}%"></div></div>
        </div>`;
      }).join('')
    : '<p class="results-empty">لا توجد نتائج بعد — شارك في المسابقة الأسبوعية لتظهر هنا.</p>';
}

async function saveProfile() {
  const user = getCurrentUser();
  if (!user) return;
  const newName = $('profile-name-input').value.trim();
  const newPass = $('profile-pass-input').value.trim();
  if (newName && newName.length < 2) { showToast('الاسم قصير جدًا', 'error'); return; }
  if (newPass && newPass.length < 6) { showToast('كلمة المرور ٦ أحرف على الأقل', 'error'); return; }
  if (newName && newName !== user.name) {
    const r = await Auth.updateName(newName);
    if (!r.ok) { showToast(r.error, 'error'); return; }
  }
  if (newPass) {
    const r = await Auth.changePassword(newPass);
    if (!r.ok) { renderAll(); showToast(r.error, 'error'); return; }
  }
  $('profile-pass-input').value = '';
  renderAll();
  showToast('تم حفظ بيانات الحساب');
}

function changeFontSize(delta) {
  const cur = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--font-size-base')) || 16;
  const next = Math.min(22, Math.max(13, cur + delta));
  document.documentElement.style.setProperty('--font-size-base', next + 'px');
  localStorage.setItem(STORE.fontSize, next);
  showToast(`حجم الخط: ${next}px`);
}

function resetFontSize() {
  document.documentElement.style.setProperty('--font-size-base', '16px');
  localStorage.setItem(STORE.fontSize, '16');
  showToast('تمت استعادة حجم الخط الافتراضي');
}

/* ===========================================================
   10.15 الإدارة
   =========================================================== */
function requireRole(...roles) {
  const user = getCurrentUser();
  if (!user || !roles.includes(user.role)) { showToast('غير مصرح لك بهذا الإجراء', 'error'); return false; }
  return true;
}

function renderAdminPanels(opts) {
  const user = getCurrentUser();
  if (!user || user.role === 'servant') return;

  const sched = getStore(STORE.schedule, DEFAULT_SCHEDULE) || DEFAULT_SCHEDULE;
  const accounts = getAccounts();
  const progressAll = getStore(STORE.progress, {});
  const results = getStore(STORE.results, []).filter(r => !r.pending);
  const posts = getStore(STORE.posts, DEFAULT_POSTS);
  const tk = todayKey();

  const keepForms = !!(opts && opts.keepForms);   // v1.2: التحديث الدوري لا يمسح نصًّا قيد الكتابة
  if (!keepForms) {
    fillAdminSchedForm(sched);
    adminInitPlanForm();
  }

  // متابعة الخدام: الخدام فقط (بدون المالك والمسؤول)
  const servants = accounts.filter(a => a.role === 'servant');
  const TASK_LABELS = { reading: '📖 القراءة', meditation: '💭 التأمل', prayer: '🙏 الصلاة', challenge: '🤝 الخدمة' };
  const rows = servants.map(a => {
    const p = progressAll[`${a.id}:${tk}`] || {};
    const done = TASK_KEYS.filter(k => p[k]).length;
    const pct = Math.round((done / TASK_KEYS.length) * 100);
    const userRes = results.filter(r => r.userId === a.id);
    const last = userRes[userRes.length - 1];
    return { a, p, done, pct, last };
  });
  const avg = rows.length ? Math.round(rows.reduce((t, r) => t + r.pct, 0) / rows.length) : 0;
  const finished = rows.filter(r => r.pct === 100).length;
  $('admin-tracking-body').innerHTML = rows.length ? `
    <div class="trk-summary">
      <div><strong>${rows.length}</strong><span>عدد الخدام</span></div>
      <div><strong>${avg}%</strong><span>متوسط إنجاز اليوم</span></div>
      <div><strong>${finished}</strong><span>أتمّوا مهامهم</span></div>
    </div>` + rows.map(({ a, p, done, pct, last }) => `
    <div class="trk-card ${a.active ? '' : 'inactive'}">
      <div class="trk-head">
        <div class="trk-avatar">${escapeHtml((a.name || '?').trim().charAt(0))}</div>
        <div style="flex:1; min-width:0;">
          <div class="trk-name">${escapeHtml(a.name)}</div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:4px;">
            ${a.stage ? `<span class="badge badge-gold">${escapeHtml(a.stage)}</span>` : ''}
            ${a.active ? '' : '<span class="badge badge-red">معطل</span>'}
          </div>
        </div>
      </div>
      <div class="trk-row"><span>إنجاز اليوم</span><span>${pct}% · ${done}/${TASK_KEYS.length}</span></div>
      <div class="trk-bar ${pct === 100 ? 'full' : ''}"><i style="width:${pct}%"></i></div>
      <div class="trk-chips" style="margin-top:10px;">
        ${TASK_KEYS.map(k => `<span class="trk-chip ${p[k] ? 'on' : ''}">${p[k] ? '✓ ' : ''}${TASK_LABELS[k]}</span>`).join('')}
      </div>
      <div class="trk-score">🏆 آخر درجة مسابقة: ${last ? `${last.score}/${last.total}` : 'لم يشارك'}</div>
    </div>`).join('') : '<p style="text-align:center; color:var(--text-muted); padding:14px;">لا يوجد خدام مسجلون بعد.</p>';

  const publicPosts = posts.filter(p => p.visibility === 'public');
  $('admin-moderation-list').innerHTML = publicPosts.length ? publicPosts.map(p => `
    <div class="post-card ${p.hidden ? 'hidden-post' : ''}">
      <div class="post-meta">
        <span><strong>${escapeHtml(p.authorName)}</strong> • ${escapeHtml(p.createdAt)}</span>
        <span>${p.hidden ? '🙈 مخفي' : '🌍 ظاهر'}</span>
      </div>
      <p style="font-size:0.9rem; white-space:pre-wrap;">${escapeHtml(p.text)}</p>
      <div class="post-actions">
        <button class="btn btn-outline btn-sm" onclick="toggleHidePost(${jsArg(p.id)})">${p.hidden ? '👁️ إظهار' : '🙈 إخفاء'}</button>
        <button class="btn btn-danger btn-sm" onclick="deletePost(${jsArg(p.id)})">🗑️ حذف نهائي</button>
      </div>
    </div>
  `).join('') : '<p style="text-align:center; color:var(--text-muted); padding:14px;">لا توجد مشاركات عامة.</p>';

  if (user.role === 'owner' && !keepForms) {
    $('owner-contest-json').value = JSON.stringify(getStore(STORE.contest, DEFAULT_CONTEST), null, 2);
  }
  renderAccountsTable(user, accounts);
}

/* ===========================================================
   v10: أدوات جديدة
   =========================================================== */
function fillStageSelects() {
  const opts = '<option value="">— اختر المرحلة —</option>' + Auth.STAGE_OPTIONS.map(s => `<option value="${escapeHtml(s.code)}">${escapeHtml(s.label)}</option>`).join('');
  const el = $('ca-stage');
  if (el) el.innerHTML = opts;
}

/* اسم الخادم المسجّل داخل أي رسالة له: {name} / {الاسم} تُستبدل، وإلا يُضاف الاسم في أولها */
function personalize(text, user, prefix) {
  const name = (user && user.name) || '';
  const t = String(text || '');
  if (/\{(name|الاسم)\}/.test(t)) return t.replace(/\{(name|الاسم)\}/g, name);
  return (prefix && name) ? `${name}، ${t}` : t;
}

function fmtSchedDate(d, t) {
  if (!d) return '';
  const dt = new Date(`${d}T${t || '00:00'}`);
  if (isNaN(dt)) return '';
  const day = dt.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = t ? dt.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' }) : '';
  return time ? `${day} — ${time}` : day;
}

function renderScheduleNote(sched) {
  const box = $('contest-schedule-note');
  const start = fmtSchedDate(sched.startDate, sched.startTime);
  const end = fmtSchedDate(sched.endDate, sched.endTime);
  const user = getCurrentUser();
  if (!start && !end) { box.style.display = 'none'; return; }
  box.innerHTML = `📅 ${user ? 'يا ' + escapeHtml(user.name) + '، ' : ''}ملاحظة بخصوص موعد المسابقة:`
    + (start ? `<br>🟢 <strong>تبدأ:</strong> ${escapeHtml(start)}` : '')
    + (end ? `<br>🔴 <strong>تنتهي:</strong> ${escapeHtml(end)}` : '');
  box.style.display = '';
}

/* --- v1.3: الخطة لكل يوم (اختيار تاريخ، والافتراضي اليوم). السفر من جدول books وليس من نص حر --- */
function adminBibleBooks() { return Sync.books().filter(b => b.kind === 'bible' && b.active !== false); }

function fillAdminBookSelect(sel, selected, emptyLabel) {
  const books = adminBibleBooks();
  sel.innerHTML = `<option value="">${emptyLabel}</option>` + books.map(b => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.title)}</option>`).join('');
  sel.value = books.some(b => b.id === selected) ? selected : '';
}

function fillAdminChapters(bookId, selected) {
  const sel = $('admin-plan-chapter');
  const b = adminBibleBooks().find(x => x.id === bookId);
  const n = b ? b.sections : 0;
  let html = '';
  for (let i = 1; i <= n; i++) html += `<option value="${i}">الأصحاح ${toAr(i)}</option>`;
  sel.innerHTML = html;
  sel.disabled = !n;
  if (selected && selected >= 1 && selected <= n) sel.value = String(selected);
}

function adminPlanPreview() {
  const bookId = $('admin-plan-book').value;
  const b = adminBibleBooks().find(x => x.id === bookId);
  const out = $('admin-plan-ref-preview');
  if (!b) { out.textContent = 'بلا قراءة لهذا اليوم.'; return; }
  const vf = parseInt($('admin-plan-vfrom').value, 10) || null, vt = parseInt($('admin-plan-vto').value, 10) || null;
  const v = planView({ book_title: b.title, book_short: b.short_title, section: parseInt($('admin-plan-chapter').value, 10) || null, verse_from: vf, verse_to: vt });
  out.textContent = `سيظهر للخدام: ${v.reading} — الشاهد: ${v.ref}`;
}

let adminPlanLoadedFor = null, adminPlanReq = 0;
function adminInitPlanForm() {
  const inp = $('admin-plan-date');
  if (!inp.value) inp.value = todayIso();   // الافتراضي: النهارده
  fillAdminBookSelect($('admin-plan-book'), $('admin-plan-book').value, '— بلا قراءة —');
  if (adminPlanLoadedFor !== inp.value) adminLoadPlanDay();
  else { fillAdminChapters($('admin-plan-book').value, parseInt($('admin-plan-chapter').value, 10) || null); adminPlanPreview(); }
}

function adminPlanDateChanged() { adminPlanLoadedFor = null; adminLoadPlanDay(); }

async function adminLoadPlanDay() {
  const day = $('admin-plan-date').value;
  const hint = $('admin-plan-date-hint');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) { hint.textContent = 'اختر تاريخًا.'; return; }
  const token = ++adminPlanReq;   // حماية التسابق: لو بدّل المسؤول التاريخ بسرعة يُهمَل الرد القديم
  hint.textContent = 'جارٍ التحميل…';
  const r = await Sync.call('plan_get', { p_day: day });
  if (token !== adminPlanReq || $('admin-plan-date').value !== day) return;
  if (!r.ok) { hint.textContent = r.error; return; }
  adminPlanLoadedFor = day;
  const p = r.data && r.data.plan;
  fillAdminBookSelect($('admin-plan-book'), p ? p.book_id : '', '— بلا قراءة —');
  fillAdminChapters($('admin-plan-book').value, p ? p.section : null);
  $('admin-plan-vfrom').value = p && p.verse_from ? p.verse_from : '';
  $('admin-plan-vto').value = p && p.verse_to ? p.verse_to : '';
  $('admin-plan-meditation').value = p ? p.meditation : '';
  $('admin-plan-prayer').value = p ? p.prayer : '';
  $('admin-plan-challenge').value = p ? p.challenge : '';
  hint.textContent = (p ? '✅ توجد خطة محفوظة ليوم ' : 'لا توجد خطة ليوم ') + fmtLongDate(day) + (p ? '.' : ' بعد.');
  adminPlanPreview();
}

function adminPlanBookChanged() {
  fillAdminChapters($('admin-plan-book').value, null);
  adminPlanPreview();
}

/* --- رفع JSON للتأمل والخدمة العملية --- */
const JSON_UPLOADS = { meditation: [], challenge: [] };
const JSON_FIELDS = {
  meditation: ['meditation', 'reflection', 'تأمل', 'التأمل', 'text', 'content'],
  challenge:  ['challenge', 'service', 'الخدمة', 'الخدمة_العملية', 'تحدي', 'text', 'content', 'title']
};
const JSON_LIST_KEYS = ['items', 'entries', 'days', 'list', 'data', 'meditations', 'challenges', 'تأملات', 'الخدمات'];

function pickField(o, keys) {
  for (const k of keys) if (typeof o[k] === 'string' && o[k].trim()) return o[k].trim();
  return '';
}

function normalizeJsonEntries(data, kind) {
  let arr;
  if (Array.isArray(data)) arr = data;
  else if (data && typeof data === 'object') {
    const lk = JSON_LIST_KEYS.find(k => Array.isArray(data[k]));
    arr = lk ? data[lk] : [data];
  } else arr = [data];
  return arr.map((it, i) => {
    if (typeof it === 'string') return { text: it.trim(), label: `#${i + 1}` };
    if (!it || typeof it !== 'object') return null;
    const text = pickField(it, JSON_FIELDS[kind]);
    if (!text) return null;
    return {
      text, label: '',
      ref: pickField(it, ['ref', 'الشاهد', 'شاهد']),
      verse: pickField(it, ['verse', 'آية', 'الآية']),
      reading: pickField(it, ['reading', 'القراءة']),
      book: pickField(it, ['book', 'السفر']),
      chapter: pickField(it, ['chapter', 'الأصحاح']),
      date: pickField(it, ['date', 'التاريخ']),
      title: pickField(it, ['title', 'العنوان']),
      idx: i
    };
  }).filter(e => e && e.text).map((e, i) => {
    e.label = `${i + 1}. ${e.title || e.date || e.text.slice(0, 30)}${(e.title || e.date) ? '' : '…'}`;
    return e;
  });
}

function adminLoadJson(kind, input) {
  if (!requireRole('admin', 'owner')) { input.value = ''; return; }
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const entries = normalizeJsonEntries(JSON.parse(reader.result), kind);
      if (!entries.length) throw new Error();
      JSON_UPLOADS[kind] = entries;
      const sel = $(kind === 'meditation' ? 'admin-med-pick' : 'admin-chal-pick');
      sel.innerHTML = entries.map((e, i) => `<option value="${i}">${escapeHtml(e.label)}</option>`).join('');
      sel.style.display = entries.length > 1 ? '' : 'none';
      const today = $('admin-plan-date').value || todayIso();   // v1.3: نختار مدخل اليوم المحدد في اختيار التاريخ
      const byDate = entries.findIndex(e => e.date === today);
      sel.value = String(byDate >= 0 ? byDate : 0);
      applyJsonEntry(kind, entries[byDate >= 0 ? byDate : 0]);
      showToast(`تم تحميل ${entries.length} ${kind === 'meditation' ? 'تأمل' : 'خدمة'} — اضغط «حفظ خطة اليوم» للتطبيق`, 'success');
    } catch { showToast('خطأ في صيغة JSON — يرجى المراجعة', 'error'); }
    input.value = '';
  };
  reader.readAsText(file, 'utf-8');
}

function adminPickJson(kind) {
  const sel = $(kind === 'meditation' ? 'admin-med-pick' : 'admin-chal-pick');
  const e = JSON_UPLOADS[kind][parseInt(sel.value, 10)];
  if (e) applyJsonEntry(kind, e);
}

function applyJsonEntry(kind, e) {
  if (kind === 'challenge') { $('admin-plan-challenge').value = e.text; return; }
  $('admin-plan-meditation').value = (e.verse ? `«${e.verse}»\n\n` : '') + e.text;
}

/* v1.3: بعد أي حفظ ناجح نسحب فورًا ليظهر على هذا الجهاز كما يراه الآخرون */
function adminAfterSave() { try { Sync.pull(); } catch (e) {} }

async function saveAdminPlan() {
  if (!requireRole('admin', 'owner')) return;
  const day = $('admin-plan-date').value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return showToast('اختر تاريخ الخطة أولًا', 'error');
  const book = $('admin-plan-book').value || null;
  const sec = book ? (parseInt($('admin-plan-chapter').value, 10) || null) : null;
  const vf = book && $('admin-plan-vfrom').value ? parseInt($('admin-plan-vfrom').value, 10) : null;
  const vt = book && $('admin-plan-vto').value ? parseInt($('admin-plan-vto').value, 10) : null;
  if ((vf || vt) && !sec) return showToast('اختر الأصحاح قبل تحديد الآيات', 'error');
  if (vf && vt && vt < vf) return showToast('آية النهاية يجب أن تكون بعد آية البداية', 'error');
  const r = await Sync.call('admin_save_plan', {
    p_day: day, p_book_id: book, p_section: sec, p_verse_from: vf, p_verse_to: vt,
    p_meditation: $('admin-plan-meditation').value, p_prayer: $('admin-plan-prayer').value, p_challenge: $('admin-plan-challenge').value
  });
  if (!r.ok) return showToast(r.error, 'error');
  adminPlanLoadedFor = day;
  $('admin-plan-date-hint').textContent = '✅ توجد خطة محفوظة ليوم ' + fmtLongDate(day) + '.';
  showToast(`تم حفظ خطة ${fmtLongDate(day)}`);
  const w = r.data && r.data.warning;
  if (w === 'SECTION_OPENS_LATER') showToast('⚠️ هذا الأصحاح يُفتح بعد هذا اليوم حسب جدول الأسفار. تم الحفظ.', 'warning');
  if (w === 'SECTION_NOT_SCHEDULED') showToast('⚠️ هذا الأصحاح ليس له موعد فتح في جدول السفر. تم الحفظ.', 'warning');
  adminAfterSave();
}

async function deleteAdminPlan() {
  if (!requireRole('admin', 'owner')) return;
  const day = $('admin-plan-date').value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
  if (!confirm(`حذف خطة ${fmtLongDate(day)}؟`)) return;
  const r = await Sync.call('admin_delete_plan', { p_day: day });
  if (!r.ok) return showToast(r.error, 'error');
  adminPlanLoadedFor = null;
  await adminLoadPlanDay();
  showToast('تم حذف خطة اليوم المحدد');
  adminAfterSave();
}

/* --- مواعيد المسابقة: تُفرض في السيرفر (submit_result يرفض خارج النافذة إلا بكود فتح). كل الأوقات بتوقيت القاهرة --- */
function fillAdminSchedForm(sched) {
  fillAdminBookSelect($('admin-sched-book-id'), sched.bookId || '', '— غير محدد —');
  $('admin-sched-book').value = sched.book || '';
  $('admin-sched-info').value = sched.info || '';
  $('admin-sched-timer').value = sched.timer || 0;
  $('admin-sched-start-date').value = sched.startDate || '';
  $('admin-sched-start-time').value = sched.startTime || '';
  $('admin-sched-end-date').value = sched.endDate || '';
  $('admin-sched-end-time').value = sched.endTime || '';
}

function adminSchedBookChanged() {
  const id = $('admin-sched-book-id').value;
  const b = adminBibleBooks().find(x => x.id === id);
  if (b && !$('admin-sched-book').value.trim()) $('admin-sched-book').value = b.title;
}

function schedTimes(sched) {
  return {
    starts: sched.startDate ? `${sched.startDate}T${sched.startTime || '00:00'}` : null,
    ends: sched.endDate ? `${sched.endDate}T${sched.endTime || '23:59'}` : null
  };
}

async function saveAdminSchedule() {
  if (!requireRole('admin', 'owner')) return;
  const startDate = $('admin-sched-start-date').value, startTime = $('admin-sched-start-time').value;
  const endDate = $('admin-sched-end-date').value, endTime = $('admin-sched-end-time').value;
  const t = schedTimes({ startDate, startTime, endDate, endTime });
  if (t.starts && t.ends && t.ends <= t.starts) return showToast('نهاية المسابقة يجب أن تكون بعد بدايتها', 'error');
  const baseCid = Sync.serverCid();
  if (!baseCid) return showToast('لا توجد مسابقة حالية. ارفع الأسئلة أولًا (المالك).', 'error');
  const label = $('admin-sched-book').value.trim();
  const questions = getStore(STORE.contest, DEFAULT_CONTEST);
  const r = await Sync.call('admin_save_contest', {
    p_cid: contestIdFor(questions, label), p_book_id: $('admin-sched-book-id').value || null, p_book_label: label,
    p_info: $('admin-sched-info').value.trim(), p_timer: Math.max(0, Math.min(300, parseInt($('admin-sched-timer').value, 10) || 0)),
    p_starts: t.starts, p_ends: t.ends, p_questions: null, p_base_cid: baseCid
  });
  if (!r.ok) return showToast(r.error, 'error');
  resetQuizState();
  showToast('تم تحديث مواعيد المسابقة');
  adminAfterSave();
}

async function saveOwnerContestJson() {
  if (!requireRole('owner')) return;
  let parsed;
  try {
    parsed = JSON.parse($('owner-contest-json').value);
    if (!Array.isArray(parsed)) throw new Error();
  } catch { showToast('خطأ في صيغة JSON — يرجى المراجعة', 'error'); return; }
  const sched = getStore(STORE.schedule, DEFAULT_SCHEDULE) || DEFAULT_SCHEDULE;
  const t = schedTimes(sched);
  const label = sched.book || '';
  const r = await Sync.call('admin_save_contest', {
    p_cid: contestIdFor(parsed, label), p_book_id: sched.bookId || null, p_book_label: label,
    p_info: sched.info || '', p_timer: Number(sched.timer) || 0, p_starts: t.starts, p_ends: t.ends,
    p_questions: JSON.stringify(parsed), p_base_cid: null
  });
  if (!r.ok) return showToast(r.error, 'error');
  resetQuizState();
  showToast('تم رفع وتحديث أسئلة المسابقة بنجاح');
  adminAfterSave();
}

/* --- v1.3: لوحة الأسفار (تسجيل سفر + جدولة فتح الأصحاحات بمعاينة قابلة للتعديل قبل الحفظ) --- */
function fmtOpenDate(iso) {
  try { return new Date(iso).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); } catch { return ''; }
}

function renderAdminBooks() {
  const books = Sync.books();
  const stateLbl = { open_all: 'مفتوح كله', partial: 'مفتوح جزئيًّا', not_started: 'لم يبدأ' };
  $('admin-books-list').innerHTML = books.length ? books.map(b => `
    <div class="trk-card">
      <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
        <div><strong>${escapeHtml(b.title)}</strong> <span class="badge badge-gold" dir="ltr">${escapeHtml(b.id)}</span>${b.active === false ? ' <span class="badge badge-red">معطّل</span>' : ''}</div>
        <button class="btn btn-outline btn-sm" onclick="adminEditBook(${jsArg(b.id)})">✏️ تعديل</button>
      </div>
      <div style="font-size:0.8rem; color:var(--text-muted); margin-top:6px;">
        ${b.kind === 'agpeya' ? 'أجبية' : 'كتاب مقدس'} · ${toAr(b.open_count)} من ${toAr(b.sections)} مفتوح · ${stateLbl[b.state] || ''}
        ${b.next_open_at ? ' · أقرب فتح: ' + escapeHtml(fmtOpenDate(b.next_open_at)) : ''}
      </div>
    </div>`).join('') : '<p style="text-align:center; color:var(--text-muted); padding:14px;">لا توجد أسفار مسجّلة بعد (شغّل 11_v1_3_migrate.sql أو أضف سفرًا).</p>';
}

function adminEditBook(id) {
  const b = Sync.books().find(x => x.id === id);
  if (!b) return;
  $('admin-book-id').value = b.id; $('admin-book-id').readOnly = true;
  $('admin-book-title').value = b.title; $('admin-book-short').value = b.short_title || '';
  $('admin-book-kind').value = b.kind; $('admin-book-sections').value = b.sections;
  $('admin-book-active').checked = b.active !== false;
  $('admin-book-title').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function adminClearBookForm() {
  ['admin-book-id', 'admin-book-title', 'admin-book-short', 'admin-book-sections'].forEach(i => { $(i).value = ''; });
  $('admin-book-id').readOnly = false; $('admin-book-active').checked = true; $('admin-book-kind').value = 'bible';
}

async function adminSaveBook() {
  if (!requireRole('admin', 'owner')) return;
  const id = $('admin-book-id').value.trim().toLowerCase();
  if (!/^[a-z][a-z0-9_-]{1,40}$/.test(id)) return showToast('المعرّف حروف لاتينية صغيرة وأرقام (مثل: luke)', 'error');
  const title = $('admin-book-title').value.trim();
  const sections = parseInt($('admin-book-sections').value, 10);
  if (!title) return showToast('اكتب اسم السفر', 'error');
  if (!(sections >= 1 && sections <= 400)) return showToast('عدد الأصحاحات بين ١ و ٤٠٠', 'error');
  const existing = Sync.books().find(b => b.id === id);
  const r = await Sync.call('admin_upsert_book', {
    p_id: id, p_kind: $('admin-book-kind').value, p_title: title, p_short: $('admin-book-short').value.trim(),
    p_sections: sections, p_sort: existing ? existing.sort : 100, p_active: $('admin-book-active').checked
  });
  if (!r.ok) return showToast(r.error, 'error');
  showToast('تم حفظ السفر');
  adminClearBookForm();
  await Sync.pull();
  renderAdminBooks();
}

/* --- v1.3: أكواد الفتح (المسؤول/المالك يولّدون كودًا لخادم معيّن) --- */
const fmtCode = c => String(c).slice(0, 5) + '-' + String(c).slice(5);
/* v1.6: مدة الكود بالدقائق (مسار واحد: p_minutes). المدى ٥ – ١٠٠٨٠ دقيقة. */
const UNLOCK_MIN = 5, UNLOCK_MAX = 10080, UNLOCK_UNITS = { m: 1, h: 60, d: 1440 };
function fmtDuration(mins) {
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60, out = [];
  if (d) out.push(toAr(d) + (d === 1 ? ' يوم' : d === 2 ? ' يومين' : ' أيام'));
  if (h) out.push(toAr(h) + (h === 1 ? ' ساعة' : h === 2 ? ' ساعتين' : h <= 10 ? ' ساعات' : ' ساعة'));
  if (m) out.push(toAr(m) + (m <= 10 ? ' دقائق' : ' دقيقة'));
  return out.join(' و') || '٠ دقيقة';
}
function readUnlockMinutes() {
  const per = UNLOCK_UNITS[$('admin-unlock-unit').value] || 60;
  const raw = parseInt($('admin-unlock-amount').value, 10);
  let mins = isNaN(raw) ? 1440 : raw * per;
  if (mins < UNLOCK_MIN || mins > UNLOCK_MAX) {
    mins = Math.max(UNLOCK_MIN, Math.min(UNLOCK_MAX, mins));
    showToast('المدة المسموحة من ٥ دقائق إلى ٧ أيام. ضُبطت على ' + fmtDuration(mins), 'warning');
  }
  return mins;
}
function fmtRemaining(iso) {
  const ms = Date.parse(iso) - Sync.nowMs();
  if (!(ms > 0)) return '';
  return 'متبقي ' + fmtDuration(Math.max(1, Math.ceil(ms / 60000)));
}

async function renderAdminUnlock() {
  const sel = $('admin-unlock-user');
  const cur = sel.value;
  const people = getAccounts().filter(a => a.active && a.id !== (getCurrentUser() || {}).id);
  sel.innerHTML = '<option value="">— اختر الخادم —</option>' + people.map(a => `<option value="${escapeHtml(a.id)}">${escapeHtml(a.name)}${a.stage ? ' — ' + escapeHtml(a.stage) : ''}</option>`).join('');
  if (people.some(a => a.id === cur)) sel.value = cur;
  const list = $('admin-unlock-list');
  const r = await Sync.call('admin_list_unlock_codes', {});
  if (!r.ok) { list.innerHTML = `<p style="text-align:center; color:var(--text-muted);">${escapeHtml(r.error)}</p>`; return; }
  const rows = Array.isArray(r.data) ? r.data : [];
  const lbl = { active: '<span class="badge badge-green">فعّال</span>', used: '<span class="badge badge-gold">مستعمل</span>', expired: '<span class="badge badge-red">منتهي</span>' };
  list.innerHTML = rows.length ? `<div class="table-wrap"><table><thead><tr><th>الخادم</th><th>الكود</th><th>الحالة</th><th>ينتهي</th><th></th></tr></thead><tbody>` +
    rows.map(k => `<tr><td>${escapeHtml(k.user_name)}</td><td dir="ltr"><strong>${escapeHtml(fmtCode(k.code))}</strong></td><td>${lbl[k.state] || ''}</td><td>${escapeHtml(fmtOpenDate(k.expires_at))}${k.state === 'active' ? `<div style="font-size:0.74rem; color:var(--text-muted);">${escapeHtml(fmtRemaining(k.expires_at))}</div>` : ''}</td>
      <td>${k.state === 'active' ? `<button class="btn btn-outline btn-sm" onclick="adminRevokeUnlock(${jsArg(k.id)})">إلغاء</button>` : ''}</td></tr>`).join('') +
    `</tbody></table></div>` : '<p style="text-align:center; color:var(--text-muted); padding:14px;">لم تُولَّد أكواد لهذه المسابقة بعد.</p>';
}

async function adminCreateUnlock() {
  if (!requireRole('admin', 'owner')) return;
  const uid = $('admin-unlock-user').value;
  if (!UUID_RE.test(uid)) return showToast('اختر الخادم أولًا', 'error');
  const mins = readUnlockMinutes();
  const r = await Sync.call('admin_create_unlock_code', { p_user: uid, p_minutes: mins });
  if (!r.ok) return showToast(r.error, 'error');
  const d = r.data || {};
  const box = $('admin-unlock-new');
  box.innerHTML = `🔑 كود <strong>${escapeHtml(d.user_name || '')}</strong>: <strong dir="ltr" style="font-size:1.15rem; letter-spacing:1px;">${escapeHtml(fmtCode(d.code || ''))}</strong><br>صالح لمدة ${escapeHtml(fmtDuration(mins))} — ينتهي ${escapeHtml(fmtOpenDate(d.expires_at))}. صالح لمرة واحدة.
    <div style="margin-top:8px;"><button class="btn btn-outline btn-sm" onclick="navigator.clipboard && navigator.clipboard.writeText(${jsArg(fmtCode(d.code || ''))}).then(() => showToast('تم نسخ الكود'))">📋 نسخ</button></div>`;
  box.style.display = '';
  renderAdminUnlock();
}

async function adminRevokeUnlock(id) {
  if (!requireRole('admin', 'owner') || !UUID_RE.test(id)) return;
  const r = await Sync.call('admin_revoke_unlock_code', { p_id: id });
  if (!r.ok) return showToast(r.error, 'error');
  renderAdminUnlock();
}

/* ===== v1.1: إدارة الحسابات على Supabase ===== */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fmtLastLogin(iso) {
  if (!iso) return 'لم يدخل بعد';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  try {
    return d.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return d.toLocaleString(); }
}

function renderAccountsTable(user, accounts) {
  const body = $('owner-accounts-body');
  if (!body || !isStaffUser(user)) return;
  const canAct = a => a.id !== user.id && !(user.role === 'admin' && a.role === 'owner');   // المسؤول لا يعدّل المالك، ولا أحد على نفسه
  const roleSelect = a => user.role === 'owner' && a.id !== user.id
    ? `<select class="form-control" style="margin-top:6px; padding:4px 6px; font-size:0.78rem;" onchange="changeAccountRole(${jsArg(a.id)}, this.value)" aria-label="تغيير الدور">
         <option value="servant" ${a.role === 'servant' ? 'selected' : ''}>👤 خادم</option>
         <option value="admin" ${a.role === 'admin' ? 'selected' : ''}>🛡️ مسؤول</option>
         <option value="owner" ${a.role === 'owner' ? 'selected' : ''}>👑 مالك</option>
       </select>` : '';
  body.innerHTML = accounts.length ? accounts.map(a => `
    <tr>
      <td><strong>${escapeHtml(a.name)}</strong><br><span style="font-size:0.72rem; color:var(--text-muted);">${escapeHtml(roleLabel(a.role))}</span></td>
      <td style="font-family:monospace; font-size:0.75rem; direction:ltr; text-align:right;">${escapeHtml(a.email || '—')}</td>
      <td style="direction:ltr; text-align:right;">${escapeHtml(a.phone || '—')}</td>
      <td>${escapeHtml(a.stage || '—')}</td>
      <td style="font-size:0.78rem;">${escapeHtml(fmtLastLogin(a.lastLogin))}</td>
      <td>${a.active ? '<span class="badge badge-green">نشط</span>' : '<span class="badge badge-red">معطل</span>'}</td>
      <td>
        ${canAct(a) ? `
          <button class="btn btn-outline btn-sm" onclick="setAccountStatus(${jsArg(a.id)}, ${jsArg(a.active ? 'disabled' : 'active')})">${a.active ? 'تعطيل' : 'تفعيل'}</button>
          <button class="btn btn-danger btn-sm" onclick="deleteAccountById(${jsArg(a.id)})">حذف</button>
          ${roleSelect(a)}` : '—'}
      </td>
    </tr>
  `).join('') : '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:14px;">لا توجد حسابات لعرضها.</td></tr>';
}

/* تحميل قائمة الحسابات من السيرفر (للمسؤول والمالك). full=true يعيد رسم الأقسام المعتمدة عليها */
async function refreshAccounts(full) {
  const user = getCurrentUser();
  if (!isStaffUser(user)) return;
  const r = await Auth.loadAccounts();
  if (!r.ok) { showToast(r.error || 'تعذّر تحديث قائمة الحسابات.', 'warning'); return; }
  const now = getCurrentUser();
  if (!now) return;
  if (full) { renderToday(); renderAdminPanels(); }
  else renderAccountsTable(now, getAccounts());
}

async function setAccountStatus(id, status) {
  if (!requireRole('admin', 'owner') || !UUID_RE.test(id)) return;
  const acc = getAccounts().find(a => a.id === id);
  if (status === 'disabled' && !confirm(`تعطيل حساب ${acc ? acc.name : ''}؟ لن يستطيع الدخول للتطبيق حتى يُفعَّل مرة أخرى.`)) return;
  const r = await Auth.setStatus(id, status);
  if (!r.ok) { showToast(r.error, 'error'); return; }
  showToast(status === 'disabled' ? 'تم تعطيل الحساب' : 'تم تفعيل الحساب');
  refreshAccounts(false);
}

async function deleteAccountById(id) {
  if (!requireRole('admin', 'owner') || !UUID_RE.test(id)) return;
  const acc = getAccounts().find(a => a.id === id);
  if (!confirm(`حذف حساب ${acc ? acc.name : ''} نهائيًّا؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
  const r = await Auth.deleteAccount(id);
  if (!r.ok) { showToast(r.error, 'error'); return; }
  showToast('تم حذف الحساب');
  refreshAccounts(true);
}

async function changeAccountRole(id, role) {
  if (!requireRole('owner') || !UUID_RE.test(id)) return;
  const acc = getAccounts().find(a => a.id === id);
  if (!acc || acc.role === role) return;
  if (!confirm(`تغيير دور ${acc.name} إلى «${roleLabel(role)}»؟`)) { refreshAccounts(false); return; }
  const r = await Auth.setRole(id, role);
  if (!r.ok) { showToast(r.error, 'error'); refreshAccounts(false); return; }
  showToast('تم تغيير الدور');
  refreshAccounts(true);
}

/* ===========================================================
   v1.2: استقبال تحديثات المزامنة (js/sync.js) وإعادة الرسم دون مقاطعة المستخدم
   =========================================================== */
/* مسابقة قيد الحل: لا نعيد رسمها ولا نحدّث التطبيق وقتها (يستعملها js/update.js أيضًا) */
function isQuizInProgress() {
  return !quizDone && (quizIndex > 0 || Object.keys(selectedAnswers).length > 0);
}

function onSyncUpdated(kinds) {
  const user = getCurrentUser();
  if (!user) return;
  const has = k => kinds.includes(k);

  if (has('config') || has('progress') || has('results')) { renderToday(); renderStreakCard(); }
  if (has('config') || has('results')) {
    if (isQuizInProgress()) {
      if (has('config')) showToast('تم تحديث المسابقة. ستظهر النسخة الجديدة بعد إنهاء الحل الحالي.', 'warning');
    } else {
      resetQuizState();
      renderContest();
    }
    renderMyResults();
  }
  if (has('posts')) renderPosts();
  /* v1.3: وصلت قائمة الأسفار (أو تغيّرت): نحدّث القوائم دون مسح ما يكتبه المسؤول */
  if (isStaffUser(user) && has('books')) {
    const hadBooks = $('admin-plan-book').options.length > 1;
    const sched = getStore(STORE.schedule, DEFAULT_SCHEDULE) || DEFAULT_SCHEDULE;
    fillAdminBookSelect($('admin-sched-book-id'), $('admin-sched-book-id').value || sched.bookId || '', '— غير محدد —');
    if (!hadBooks) adminLoadPlanDay();   // أول وصول للأسفار: نعيد تحميل يوم الخطة ليُختار سفره
    else {
      fillAdminBookSelect($('admin-plan-book'), $('admin-plan-book').value, '— بلا قراءة —');
      fillAdminChapters($('admin-plan-book').value, parseInt($('admin-plan-chapter').value, 10) || null);
    }
    if ($('admin-sub-books').style.display === 'block') renderAdminBooks();
  }
  if (isStaffUser(user) && (has('progress') || has('results') || has('posts') || has('accounts'))) {
    renderAdminPanels({ keepForms: true });
  }
}

/* ===========================================================
   10.16 التهيئة الأولية
   =========================================================== */
function initApp() {
  if (!localStorage.getItem(STORE.schedule)) setStore(STORE.schedule, DEFAULT_SCHEDULE);
  if (!localStorage.getItem(STORE.contest)) setStore(STORE.contest, DEFAULT_CONTEST);
  if (!localStorage.getItem(STORE.posts)) setStore(STORE.posts, []);

  const savedFont = localStorage.getItem(STORE.fontSize);
  if (savedFont) document.documentElement.style.setProperty('--font-size-base', savedFont + 'px');

  fillStageSelects();
  initTheme();

  /* v1.1: خروج إجباري (حساب معطّل/محذوف/جلسة منتهية) وتغيّر بيانات الحساب */
  Auth.on.forced = (msg) => logout(msg);
  Auth.on.changed = () => { if (getCurrentUser()) renderAll(); };
  Sync.on.updated = onSyncUpdated;
  Sync.on.notice = (msg, type) => showToast(msg, type || 'warning');

  const user = Auth.restore();
  if (user) {
    enterApp();
    Auth.verify(true);
  } else {
    loginScreen.style.display = '';
    appShell.style.display = 'none';
    if (!Auth.configured) showToast('لم يتم ضبط الاتصال بالخادم بعد (ملف js/config.js).', 'warning');
  }
}

/* Esc لإغلاق أي مودال مفتوح */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

/* بدء التطبيق */
window.addEventListener('load', initApp);

/* ===========================================================
   v11 — طبقة الحركة (لا تغيّر أي منطق؛ تلتف حول الدوال الأصلية)
   =========================================================== */
(function () {
  const REDUCED = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $id = (id) => document.getElementById(id);
  let booting = true;

  /* ---- كشف دائري بين الشاشات (View Transitions) ---- */
  function reveal(update, x, y) {
    if (!document.startViewTransition || REDUCED()) { update(); return; }
    const t = document.startViewTransition(update);
    t.ready.then(() => {
      const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 500, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => {});
  }
  const centerOf = (el) => {
    if (!el) return [innerWidth / 2, innerHeight / 2];
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  };
  let lastPt = null;
  document.addEventListener('pointerdown', (e) => { lastPt = [e.clientX, e.clientY, Date.now()]; }, true);

  /* ---- مؤشر منزلق (الشريط السفلي + التبويب الفرعي) ---- */
  function slide(host, itemSel, thumbCls, hostCls) {
    if (!host) return;
    let th = host.querySelector('.' + thumbCls);
    if (!th) { th = document.createElement('span'); th.className = thumbCls; host.prepend(th); }
    const act = host.querySelector(itemSel + '.active');
    if (!host.offsetWidth || !act || !act.offsetWidth) { th.dataset.placed = ''; if (hostCls) host.classList.remove(hostCls); th.style.opacity = '0'; return; }
    const first = th.dataset.placed !== '1';
    if (first) th.classList.add('instant');
    const hr = host.getBoundingClientRect(), ar = act.getBoundingClientRect();
    th.style.opacity = '1';
    th.style.width = ar.width + 'px';
    th.style.transform = `translateX(${ar.left - hr.left - host.clientLeft}px)`;
    if (hostCls) host.classList.add(hostCls);
    if (first) { void th.offsetWidth; th.classList.remove('instant'); th.dataset.placed = '1'; }
  }
  const placeNav = () => slide(document.querySelector('.bottom-nav'), '.nav-item', 'nav-pill');
  const placeSeg = () => slide(document.querySelector('.today-sub-nav'), '.today-sub-btn', 'seg-thumb', 'has-thumb');
  const placeAll = () => { placeNav(); placeSeg(); };

  let raf = 0;
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(placeAll); };
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  const nav = document.querySelector('.bottom-nav');
  if (nav) {
    new MutationObserver((ms) => {
      if (ms.every((m) => m.target.classList && m.target.classList.contains('nav-pill'))) return;
      schedule();
    }).observe(nav, { attributes: true, attributeFilter: ['class', 'style'], subtree: true });
  }

  /* ---- ترتيب الصفحات لتحديد اتجاه الانزلاق (RTL) ---- */
  const ORDER = ['today', 'contest', 'posts', 'profile', 'admin'];
  const _switchTab = window.switchTab;
  window.switchTab = function (name) {
    if (name === 'bible') return _switchTab(name);
    const a = document.querySelector('.nav-item.active');
    const from = ORDER.indexOf(a ? a.dataset.tab : 'today');
    const to = ORDER.indexOf(name);
    const dir = to > from ? -1 : to < from ? 1 : 0;
    document.documentElement.style.setProperty('--tab-dir', dir);
    const out = _switchTab(name);
    placeAll();
    return out;
  };

  const _switchTodaySub = window.switchTodaySub;
  window.switchTodaySub = function (sub) {
    const out = _switchTodaySub(sub);
    placeSeg();
    return out;
  };

  /* ---- دخول / خروج التطبيق ---- */
  const shell = () => $id('app-shell');
  const _enterApp = window.enterApp;
  window.enterApp = function () {
    const run = () => {
      _enterApp();
      const s = shell();
      if (s) {
        s.classList.remove('just-entered');
        void s.offsetWidth;
        s.classList.add('just-entered');
        setTimeout(() => s.classList.remove('just-entered'), 1800);
      }
      placeAll();
    };
    if (booting) { run(); return; }
    const [x, y] = centerOf($id('submitBtn'));
    reveal(run, x, y);
  };

  const _logout = window.logout;
  window.logout = function () {
    const fresh = lastPt && Date.now() - lastPt[2] < 3000;
    const x = fresh ? lastPt[0] : innerWidth / 2, y = fresh ? lastPt[1] : innerHeight / 2;
    reveal(() => { _logout(); placeAll(); }, x, y);
  };

  /* ---- إغلاق النوافذ بحركة ---- */
  const _closeModal = window.closeModal;
  window.closeModal = function (id) {
    const el = $id(id);
    if (!el || !el.classList.contains('open') || el.classList.contains('closing') || REDUCED()) return _closeModal(id);
    el.classList.add('closing');
    setTimeout(() => { el.classList.remove('closing'); _closeModal(id); }, 220);
  };

  window.addEventListener('load', () => setTimeout(() => { booting = false; placeAll(); }, 0));
})();

/* ===========================================================
   v1.4: تصدير Excel + نسخة احتياطية JSON (الإدارة)
   =========================================================== */
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/* حفظ ملف: في آيفون نحاول مشاركة الملف (التنزيل داخل PWA غير مضمون)، وإلا تنزيل عادي */
async function saveFileBlob(blob, name, mime) {
  try {
    const file = new File([blob], name, { type: mime });
    const ua = navigator.userAgent || '';
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (ios && navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); return 'share'; }
      catch (e) { if (e && e.name === 'AbortError') return 'share'; }
    }
  } catch (e) { /* نكمل بالتنزيل العادي */ }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(() => { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) {} }, 4000);
    return 'download';
  } catch (e) { return 'fail'; }
}

/* «2026-11-23 18:30» بتوقيت القاهرة */
function cairoStamp(iso) {
  if (!iso) return '';
  const t = new Date(iso);
  if (isNaN(t.getTime())) return '';
  try {
    const p = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(t).forEach(x => { p[x.type] = x.value; });
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
  } catch (e) { return t.toISOString().slice(0, 16).replace('T', ' '); }
}

async function finishExport(btnId, name, blob, mime) {
  const how = await saveFileBlob(blob, name, mime);
  showToast(how === 'fail' ? 'تعذّر حفظ الملف على هذا الجهاز.' : how === 'share' ? 'اختر «حفظ في الملفات» من قائمة المشاركة.' : 'تم تجهيز الملف: ' + name, how === 'fail' ? 'error' : 'success');
}

/* نتائج المسابقات: ورقة «ملخص المسابقات» + ورقة «النتائج» (كل المحاولات). المصدر: السيرفر مباشرة (يتطلب اتصالًا). */
async function adminExportResultsXlsx() {
  if (!requireRole('admin', 'owner')) return;
  const btn = $('export-results-btn'); if (btn) btn.disabled = true;
  try {
    const [cr, rr] = await Promise.all([
      Sync.fetchAll('/rest/v1/contests?select=cid,book_label,info,starts_at,ends_at,is_current,created_at&order=created_at.asc,cid.asc'),
      Sync.fetchAll('/rest/v1/results?select=id,user_id,user_name,cid,score,total,attempt,created_at&order=created_at.asc,id.asc')
    ]);
    if (!cr.ok || !rr.ok) return showToast((cr.ok ? rr.error : cr.error) || 'تعذّر جلب النتائج.', 'error');
    const stageOf = {};
    (getAccounts() || []).forEach(a => { stageOf[a.id] = a.stage || ''; });
    const label = {}, order = [];
    cr.rows.forEach(c => { label[c.cid] = c; order.push(c.cid); });
    rr.rows.forEach(r => { if (!label[r.cid]) { label[r.cid] = { cid: r.cid, book_label: '', info: '' }; order.push(r.cid); } });
    const ratio = r => (r.total ? r.score / r.total : 0);
    const pct = r => (r.total ? Math.round((r.score / r.total) * 1000) / 10 : 0);
    const who = r => r.user_id || ('deleted:' + r.id);
    // أفضل محاولة لكل (خادم، مسابقة): الأعلى نسبة، وعند التساوي الأحدث
    const best = {};
    rr.rows.forEach(r => {
      const k = who(r) + '|' + r.cid, b = best[k];
      if (!b || ratio(r) > ratio(b) || (ratio(r) === ratio(b) && (r.attempt || 1) > (b.attempt || 1))) best[k] = r;
    });
    const sum = [['م', 'المسابقة', 'المعرّف', 'حالية', 'البداية (القاهرة)', 'النهاية (القاهرة)', 'عدد المشاركين', 'عدد المحاولات', 'متوسط أفضل الدرجات %', 'الأعلى %', 'الأدنى %']];
    order.forEach((cid, i) => {
      const c = label[cid];
      const bs = Object.keys(best).filter(k => best[k].cid === cid).map(k => best[k]);
      const n = bs.length, att = rr.rows.filter(r => r.cid === cid).length;
      const ps = bs.map(pct);
      sum.push([i + 1, c.book_label || c.info || cid, cid, c.is_current ? 'نعم' : '', cairoStamp(c.starts_at), cairoStamp(c.ends_at), n, att,
        n ? Math.round(ps.reduce((a, b) => a + b, 0) / n * 10) / 10 : '', n ? Math.max(...ps) : '', n ? Math.min(...ps) : '']);
    });
    const rows = [['الاسم', 'المرحلة', 'المسابقة', 'المحاولة', 'الدرجة', 'من', 'النسبة %', 'أفضل محاولة', 'التاريخ (القاهرة)']];
    rr.rows.slice().sort((a, b) => order.indexOf(a.cid) - order.indexOf(b.cid) || String(a.user_name).localeCompare(String(b.user_name), 'ar') || (a.attempt || 1) - (b.attempt || 1))
      .forEach(r => rows.push([r.user_name || '—', r.user_id ? (stageOf[r.user_id] || '') : 'حساب محذوف', (label[r.cid].book_label || label[r.cid].info || r.cid),
        r.attempt || 1, r.score, r.total, pct(r), best[who(r) + '|' + r.cid] === r ? '✓' : '', cairoStamp(r.created_at)]));
    const bytes = XlsxLite.build([
      { name: 'ملخص المسابقات', rows: sum, widths: [5, 28, 14, 8, 18, 18, 14, 14, 20, 10, 10] },
      { name: 'النتائج', rows, widths: [26, 16, 28, 9, 9, 7, 11, 12, 18] }
    ]);
    await finishExport('export-results-btn', `contest-results-${todayIso()}.xlsx`, new Blob([bytes], { type: XLSX_MIME }), XLSX_MIME);
  } catch (e) {
    showToast('تعذّر إنشاء الملف.', 'error');
  } finally { if (btn) btn.disabled = false; }
}

async function adminExportAccountsXlsx() {
  if (!requireRole('admin', 'owner')) return;
  const btn = $('export-accounts-btn'); if (btn) btn.disabled = true;
  try {
    const r = await Auth.loadAccounts();
    if (!r.ok) return showToast(r.error || 'تعذّر جلب الحسابات.', 'error');
    const rows = [['الاسم', 'الإيميل', 'التليفون', 'المرحلة', 'الدور', 'الحالة', 'آخر دخول (القاهرة)', 'تاريخ التسجيل (القاهرة)']];
    getAccounts().forEach(a => rows.push([a.name || '—', a.email || '', a.phone || '', a.stage || '',
      a.role === 'owner' ? 'مالك' : a.role === 'admin' ? 'مسؤول' : 'خادم', a.active ? 'نشط' : 'معطل', cairoStamp(a.lastLogin), cairoStamp(a.createdAt)]));
    const bytes = XlsxLite.build([{ name: 'الحسابات', rows, widths: [26, 30, 16, 18, 10, 10, 20, 20] }]);
    await finishExport('export-accounts-btn', `accounts-${todayIso()}.xlsx`, new Blob([bytes], { type: XLSX_MIME }), XLSX_MIME);
  } catch (e) {
    showToast('تعذّر إنشاء الملف.', 'error');
  } finally { if (btn) btn.disabled = false; }
}

/* ===== نسخة احتياطية JSON (المالك) ===== */
let pendingBackup = null;
const BACKUP_WARN_AR = {
  CONTEST_CONFLICT: 'مسابقة موجودة بنفس المعرّف لكن بأسئلة مختلفة — تُركت كما هي:',
  PLAN_BOOK_MISSING: 'خطة يوم بسفر غير موجود — تُخطّيت:',
  OPENINGS_BOOK_MISSING: 'مواعيد لسفر غير موجود — تُخطّيت:',
  OPENING_SECTION_OUT_OF_RANGE: 'موعد لقسم خارج عدد أقسام السفر — تُخطّي:',
  CONTEST_BOOK_MISSING: 'مسابقة بسفر غير موجود — سُجّلت بلا سفر:'
};
function backupWarnHtml(w) {
  const i = String(w).indexOf(':');
  const k = i === -1 ? String(w) : String(w).slice(0, i), v = i === -1 ? '' : String(w).slice(i + 1);
  return `<li>${escapeHtml(BACKUP_WARN_AR[k] || k)} <span dir="ltr">${escapeHtml(v)}</span></li>`;
}
function backupAccountsHtml(list) {
  if (!Array.isArray(list) || !list.length) return '';
  const rows = list.slice(0, 300).map(a => `<tr><td>${escapeHtml(a.full_name || '—')}</td><td>${escapeHtml(a.stage || '—')}</td><td>${escapeHtml(a.role === 'owner' ? 'مالك' : a.role === 'admin' ? 'مسؤول' : 'خادم')}</td><td>${escapeHtml(a.status === 'active' ? 'نشط' : 'معطل')}</td></tr>`).join('');
  return `<div class="json-hint" style="margin-top:10px;">👥 تقرير الحسابات (للمراجعة فقط — لا يُستعاد، ولا يحمل أرقام تليفونات):</div>
    <div class="table-wrap"><table><thead><tr><th>الاسم</th><th>المرحلة</th><th>الدور</th><th>الحالة</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

async function ownerExportBackup() {
  if (!requireRole('owner')) return;
  const btn = $('backup-export-btn'); if (btn) btn.disabled = true;
  try {
    const r = await Sync.call('owner_export_backup', {});
    if (!r.ok) return showToast(r.error, 'error');
    const d = r.data || {};
    const len = k => (Array.isArray(d[k]) ? d[k].length : 0);
    const blob = new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' });
    const how = await saveFileBlob(blob, `daily-service-backup-${todayIso()}.json`, 'application/json');
    $('backup-report').innerHTML = `<div class="json-hint">✅ تم تجهيز النسخة الاحتياطية:
        ${len('books')} سفر · ${len('openings')} موعد فتح · ${len('plan_days')} يوم خطة · ${len('contests')} مسابقة (بأجوبتها)
        · ${len('results')} نتيجة (قراءة فقط) · ${len('accounts_report')} حساب (للمراجعة فقط).</div>` + backupAccountsHtml(d.accounts_report);
    showToast(how === 'fail' ? 'تعذّر حفظ الملف على هذا الجهاز.' : how === 'share' ? 'اختر «حفظ في الملفات» من قائمة المشاركة.' : 'تم تنزيل النسخة الاحتياطية', how === 'fail' ? 'error' : 'success');
  } finally { if (btn) btn.disabled = false; }
}

function ownerPickBackup() { if (requireRole('owner')) $('backup-file').click(); }

async function ownerBackupFileChosen(input) {
  const f = input.files && input.files[0];
  input.value = '';
  if (!f || !requireRole('owner')) return;
  if (f.size > 15 * 1024 * 1024) return showToast('الملف كبير جدًّا (أكثر من ١٥ ميجابايت).', 'error');
  let obj;
  try { obj = JSON.parse(await f.text()); } catch (e) { return showToast('الملف ليس JSON صالحًا.', 'error'); }
  if (!obj || typeof obj !== 'object' || obj.format !== 'ds-backup') return showToast('هذا ليس ملف نسخة احتياطية من التطبيق.', 'error');
  const r = await Sync.call('owner_import_backup', { p_backup: obj, p_apply: false });
  if (!r.ok) return showToast(r.error, 'error');
  pendingBackup = obj;
  const s = (r.data && r.data.summary) || {}, w = (r.data && r.data.warnings) || [];
  const n = (o, k) => (o && o[k] != null ? o[k] : 0);
  const curChange = s.contests && s.contests.current_from !== s.contests.current_to
    ? `<li>⚠️ المسابقة الحالية ستتغيّر من <span dir="ltr">${escapeHtml(s.contests.current_from || '—')}</span> إلى <span dir="ltr">${escapeHtml(s.contests.current_to || '—')}</span></li>` : '';
  $('backup-preview').innerHTML = `<div class="card" style="margin-top:12px; border:1px solid var(--gold);">
      <div style="font-weight:800; margin-bottom:8px;">👁️ معاينة الاستعادة (لم يُغيَّر شيء بعد)</div>
      <ul style="line-height:2; padding-inline-start:20px; font-size:0.88rem;">
        <li>الأسفار: ${n(s.books, 'add')} جديد · ${n(s.books, 'update')} يُحدَّث</li>
        <li>مواعيد الفتح: تُستبدل مواعيد ${n(s.openings, 'books_replaced')} سفر (${n(s.openings, 'rows')} موعد)</li>
        <li>أيام الخطة: ${n(s.plan_days, 'add')} جديد · ${n(s.plan_days, 'update')} يُحدَّث${n(s.plan_days, 'skipped') ? ' · ' + n(s.plan_days, 'skipped') + ' يُتخطّى' : ''}</li>
        <li>المسابقات: ${n(s.contests, 'add')} جديدة · ${n(s.contests, 'update')} تُحدَّث${n(s.contests, 'skipped') ? ' · ' + n(s.contests, 'skipped') + ' تُتخطّى' : ''}</li>
        ${curChange}
        <li style="color:var(--text-muted);">لن يُمس: ${n(s.ignored, 'results')} نتيجة و${n(s.ignored, 'accounts')} حساب (لا تُستعاد).</li>
      </ul>
      ${w.length ? `<div class="json-hint" style="margin-top:8px;">تحذيرات:</div><ul style="line-height:1.9; padding-inline-start:20px; font-size:0.82rem;">${w.map(backupWarnHtml).join('')}</ul>` : ''}
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
        <button class="btn btn-gold" onclick="ownerApplyBackup()">✅ تأكيد الاستعادة</button>
        <button class="btn btn-outline" onclick="ownerCancelBackup()">إلغاء</button>
      </div>
    </div>` + backupAccountsHtml(obj.accounts_report);
}

function ownerCancelBackup() { pendingBackup = null; $('backup-preview').innerHTML = ''; }

async function ownerApplyBackup() {
  if (!requireRole('owner') || !pendingBackup) return;
  if (!confirm('تأكيد الاستعادة؟ سيُدمج محتوى الملف مع الموجود (لا يُحذف شيء غير موجود في الملف).')) return;
  const r = await Sync.call('owner_import_backup', { p_backup: pendingBackup, p_apply: true });
  if (!r.ok) return showToast(r.error, 'error');
  pendingBackup = null;
  $('backup-preview').innerHTML = '<div class="json-hint">✅ تمت الاستعادة. جارٍ تحديث البيانات…</div>';
  showToast('تمت استعادة النسخة الاحتياطية', 'success');
  try { await Sync.pull(); } catch (e) {}
  renderAll();
}

/* ===========================================================
   لوحة النتائج المباشرة — الإدارة
   =========================================================== */
(function () {
  const $id = (i) => document.getElementById(i);
  let filter = 'last', lastSig = '', timer = null;
  const pct = (r) => (r.total ? Math.round((r.score / r.total) * 100) : 0);
  const cls = (p) => (p >= 80 ? 'good' : p >= 50 ? 'mid' : 'low');
  const medal = (n) => (n === 1 ? '🥇' : n === 2 ? '🥈' : n === 3 ? '🥉' : n);

  function row(r, rank, k, extra) {
    const p = pct(r);
    return `<div class="live-row ${rank === 1 ? 'top' : ''}" style="--k:${k}">
      <span class="live-rank">${medal(rank)}</span>
      <div class="live-info">
        <div class="live-name">${escapeHtml(r.userName || '—')}</div>
        <div class="live-meta">${escapeHtml(extra || r.date || '')}</div>
        <div class="live-bar"><i class="${cls(p)}" style="width:${p}%"></i></div>
      </div>
      <span class="badge ${p === 100 ? 'badge-gold' : 'badge-blue'}" dir="ltr">${r.score} / ${r.total}${p === 100 ? ' 🏅' : ''}</span>
    </div>`;
  }
  const rankAll = (arr, getP) => {
    let prev = null, rank = 0;
    return arr.map((x, i) => { const p = getP(x); if (p !== prev) { rank = i + 1; prev = p; } return rank; });
  };

  function render(force) {
    const box = $id('admin-live-body');
    if (!box) return;
    const results = getStore(STORE.results, []).filter(r => !r.pending);
    const sig = filter + '|' + results.map((r) => `${r.userId}:${r.score}/${r.total}:${r.cid}`).join(',');
    if (!force && sig === lastSig) return;
    lastSig = sig;

    if (!results.length) { box.innerHTML = '<p class="results-empty">لا توجد نتائج بعد — ستظهر هنا فور مشاركة أي خادم.</p>'; return; }

    const cids = [];
    results.forEach((r) => { if (!cids.includes(r.cid)) cids.push(r.cid); });
    const latest = results[results.length - 1].cid;
    const num = (cid) => cids.indexOf(cid) + 1;
    let list, html = '';

    if (filter === 'last') {
      list = results.filter((r) => r.cid === latest).sort((a, b) => pct(b) - pct(a));
      const rk = rankAll(list, pct);
      const avg = Math.round(list.reduce((t, r) => t + pct(r), 0) / list.length);
      html = `<div class="live-sum"><div><strong>${list.length}</strong><span>مشارك</span></div><div><strong>${avg}%</strong><span>المتوسط</span></div><div><strong>${pct(list[0])}%</strong><span>الأعلى</span></div></div>`
        + list.map((r, i) => row(r, rk[i], i, r.date)).join('');
    } else if (filter === 'best') {
      const by = {};
      results.forEach((r) => {
        const b = by[r.userId];
        if (!b) by[r.userId] = { r, n: 1 }; else { b.n++; if (pct(r) > pct(b.r)) b.r = r; }
      });
      list = Object.values(by).sort((a, b) => pct(b.r) - pct(a.r));
      const rk = rankAll(list, (x) => pct(x.r));
      html = `<div class="live-sum"><div><strong>${list.length}</strong><span>مشارك</span></div><div><strong>${pct(list[0].r)}%</strong><span>أعلى درجة</span></div><div><strong>${cids.length}</strong><span>مسابقات</span></div></div>`
        + list.map((x, i) => row(x.r, rk[i], i, `أفضل نتيجة · ${x.n} مشاركة`)).join('');
    } else {
      cids.slice().reverse().forEach((cid, gi) => {
        const g = results.filter((r) => r.cid === cid).sort((a, b) => pct(b) - pct(a));
        const rk = rankAll(g, pct);
        html += `<div class="live-group"><span>🗓️ المسابقة ${num(cid)}${cid === latest ? ' (الأحدث)' : ''}</span><span>${g.length} مشارك</span></div>`
          + g.map((r, i) => row(r, rk[i], i, r.date)).join('');
      });
    }
    box.innerHTML = html;
  }

  function setFilter(f) {
    filter = f;
    document.querySelectorAll('#admin-live-filters .reading-mode-btn').forEach((b) => b.classList.toggle('active', b.dataset.f === f));
    render(true);
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('#admin-live-filters .reading-mode-btn');
    if (b) setFilter(b.dataset.f);
  });

  const visible = () => { const p = $id('admin-sub-live'); return p && p.style.display !== 'none' && p.offsetParent !== null && !document.hidden; };
  function tick() { if (visible()) render(false); }
  timer = setInterval(tick, 2000);
  window.addEventListener('storage', tick);
  document.addEventListener('visibilitychange', tick);

  const _sw = window.switchAdminSub;
  window.switchAdminSub = function (panel, btn) { const o = _sw(panel, btn); if (panel === 'live') render(true); return o; };
  const _rap = window.renderAdminPanels;
  window.renderAdminPanels = function () { const o = _rap.apply(this, arguments); render(true); return o; };
})();
