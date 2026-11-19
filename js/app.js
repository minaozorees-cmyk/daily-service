'use strict';

/* ===========================================================
   10.1 البيانات الافتراضية
   =========================================================== */
/* v10: مراحل الخدام */
const STAGES = ['أولى ابتدائي', 'ثانية ابتدائي', 'ثالثة ابتدائي', 'رابعة ابتدائي', 'خامسة ابتدائي', 'سادسة ابتدائي'];

const DEFAULT_ACCOUNTS = [
  { id: 'u1', name: 'مينا جورج',  email: 'servant@bnikhalid.church', role: 'servant', pass: 'Servant@2026', active: true },
  { id: 'u2', name: 'بيتر سمير',  email: 'admin@bnikhalid.church',   role: 'admin',   pass: 'Admin@2026',   active: true },
  { id: 'u3', name: 'مينا ماجد',  email: 'owner@bnikhalid.church',   role: 'owner',   pass: 'Owner@2026',   active: true }
];

const BIBLE_DATA = {
  'إنجيل يوحنا': {
    'الأصحاح ١٥': [
      'أَنَا الْكَرْمَةُ الْحَقِيقِيَّةُ وَأَبِي الْكَرَّامُ.',
      'كُلُّ غُصْنٍ فِيَّ لاَ يَأْتِي بِثَمَرٍ يَنْزِعُهُ، وَكُلُّ مَا يَأْتِي بِثَمَرٍ يُنَقِّيهِ لِيَأْتِيَ بِثَمَرٍ أَكْثَرَ.',
      'أَنْتُمُ الآنَ أَنْقِيَاءُ لِسَبَبِ الْكَلاَمِ الَّذِي كَلَّمْتُكُمْ بِهِ.',
      'اُثْبُتُوا فِيَّ وَأَنَا فِيكُمْ. كَمَا أَنَّ الْغُصْنَ لاَ يَقْدِرُ أَنْ يَأْتِيَ بِثَمَرٍ مِنْ ذَاتِهِ إِنْ لَمْ يَثْبُتْ فِي الْكَرْمَةِ، كَذلِكَ أَنْتُمْ أَيْضًا إِنْ لَمْ تَثْبُتُوا فِيَّ.',
      'أَنَا الْكَرْمَةُ وَأَنْتُمُ الأَغْصَانُ. الَّذِي يَثْبُتُ فِيَّ وَأَنَا فِيهِ هذَا يَأْتِي بِثَمَرٍ كَثِيرٍ، لأَنَّكُمْ بِدُونِي لاَ تَقْدِرُونَ أَنْ تَفْعَلُوا شَيْئًا.'
    ]
  },
  'الأجبية المقدسة': {
    'صلاة باكر — المزمور ٥٠': [
      'ارحمني يا الله كعظيم رحمتك، ومثل كثرة رأفتك تمحو إثمي.',
      'تغسلني كثيراً من إثمي ومن خطيتي تطهرني، لأني أنا عارف بإثمي وخطيتي أمامي في كل حين.',
      'لك وحدك أخطأت، والشر قدامك صنعت، لكي تتبرر في أقوالك وتغلب إذا حوكمت.',
      'قلباً نقياً اخلق فيَّ يا الله، وروحاً مستقيماً جدد في أحشائي.'
    ],
    'صلاة النوم — مزمور ١٣٣': [
      'ها باركوا الرب يا جميع عبيد الرب، القائمين في بيت الرب، في ديار بيت إلهنا.',
      'في الليالي ارفعوا أيديكم إلى القدس وباركوا الرب.',
      'يباركك الرب من صهيون، الذي خلق السماء والأرض.'
    ]
  }
};

const DEFAULT_PLAN = {
  ref: 'يوحنا ١٥ : ١ - ١٢',
  reading: 'إنجيل يوحنا — الأصحاح ١٥',
  meditation: 'الخدمة الحقيقية ليست مجرد مجهود بشري أو نشاط تنظيمي، بل هي ثمر طبيعي للثبات في المسيح الكرمة الحقيقية. كلما التصق الخادم بالمسيح في مخدعه وصلاته، فاضت النعمة من خلاله إلى مخدوميه دون عناء.',
  prayer: 'الأجبية المقدسة — صلاة باكر (المزمور ٥٠)',
  challenge: 'تواصل اليوم مع مخدوم غائب أو محتاج للسؤال عنه وتشجيعه بمحبة.'
};

const DEFAULT_SCHEDULE = {
  book: 'إنجيل يوحنا (الأصحاحات ١٣ - ١٧)',
  info: 'متاحة طوال الأسبوع — يغلق التقييم يوم الجمعة الساعة ٨ مساءً',
  timer: 0
};

const DEFAULT_CONTEST = [
  { q: 'من هو الكرّام في مثل الكرمة الحقيقية بإنجيل يوحنا ١٥؟', options: ['الآب السماوي', 'الرسل', 'الملائكة', 'يوحنا المعمدان'], answer: 0 },
  { q: 'ماذا قال الرب يسوع: "بدوني لا تقدرون أن..."؟', options: ['تتكلموا', 'تفعلوا شيئاً', 'تسافروا', 'تتعلموا'], answer: 1 },
  { q: 'في أي صلاة بالأجبية نصلي المزمور الخمسين في مقدمة كل ساعة؟', options: ['في كل الصلوات', 'باكر فقط', 'الغروب فقط', 'نصف الليل فقط'], answer: 0 }
];

const DEFAULT_POSTS = [
  {
    id: 'p1', authorId: 'u2', authorName: 'بيتر سمير',
    text: 'آية اليوم: "اثبتوا فيّ وأنا فيكم".. ربنا يبارك خدمتنا جميعاً في كنيسة العذراء ومارجرجس ببني خالد.',
    visibility: 'public', hidden: false, likes: ['u1', 'u3'], createdAt: 'اليوم ٨:٣٠ ص'
  },
  {
    id: 'p2', authorId: 'u1', authorName: 'مينا جورج',
    text: 'ملاحظة خاصة في مخدعي: محتاج أصلي أكتر لأجل أولاد الفصل قبل تحضير الدرس.',
    visibility: 'private', hidden: false, likes: [], createdAt: 'اليوم ٩:٠٠ ص'
  }
];

/* ===========================================================
   10.2 مفاتيح التخزين
   =========================================================== */
const STORE = {
  session: 'ds_v2_session',
  accounts: 'ds_v2_accounts',
  plan: 'ds_v2_plan',
  schedule: 'ds_v2_schedule',
  contest: 'ds_v2_contest',
  progress: 'ds_v2_progress',
  results: 'ds_v2_results',
  posts: 'ds_v2_posts',
  fontSize: 'ds_v2_font_size',
  theme: 'ds_v2_theme'
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
function saveSession(session, remember) {
  const json = JSON.stringify(session);
  if (remember) { setStore(STORE.session, session); }
  else { sessionStorage.setItem(STORE.session, json); }
  if (!remember) removeStore(STORE.session);
}

function loadSession() {
  try {
    const fromSession = sessionStorage.getItem(STORE.session);
    if (fromSession) return JSON.parse(fromSession);
  } catch {}
  return getStore(STORE.session, null);
}

function clearSession() {
  removeStore(STORE.session);
  try { sessionStorage.removeItem(STORE.session); } catch {}
}

function getCurrentUser() {
  const session = loadSession();
  if (!session) return null;
  const accounts = getStore(STORE.accounts, DEFAULT_ACCOUNTS);
  return accounts.find(a => a.id === session.userId && a.active) || null;
}

function attemptLogin(email, password) {
  const accounts = getStore(STORE.accounts, DEFAULT_ACCOUNTS);
  const user = accounts.find(a => a.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) return { ok: false, error: 'لا يوجد حساب بهذا البريد الإلكتروني.' };
  if (!user.active) return { ok: false, error: 'هذا الحساب معطّل. تواصل مع المسؤول.' };
  if (password !== user.pass) return { ok: false, error: 'كلمة المرور غير صحيحة.' };
  return { ok: true, user };
}

function createServantAccount({ name, email, password, stage }) {
  const accounts = getStore(STORE.accounts, DEFAULT_ACCOUNTS);
  if (accounts.some(a => a.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false, error: 'هذا البريد مسجّل بالفعل.' };
  }
  const newUser = {
    id: 'u_' + Date.now(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: 'servant',
    stage: stage || '',
    pass: password,
    active: true
  };
  accounts.push(newUser);
  setStore(STORE.accounts, accounts);
  return { ok: true, user: newUser };
}

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
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  clearFieldError(emailWrap, emailError);
  clearFieldError(passwordWrap, passwordError);

  if (!validateLogin()) { showToast('راجع البيانات المُدخلة.', 'error'); return; }

  setLoading(submitBtn, true, 'جارٍ التحقق…');
  setTimeout(() => {
    const result = attemptLogin(emailInput.value, passwordInput.value);
    setLoading(submitBtn, false, 'دخول');

    if (!result.ok) { showToast(result.error, 'error'); return; }

    saveSession({ userId: result.user.id, loginAt: Date.now() }, rememberChk.checked);
    showToast(`أهلاً ${result.user.name} ✅`, 'success');
    enterApp();
  }, 400);
});

/* نسيت كلمة المرور */
$('forgotLink').addEventListener('click', (e) => {
  e.preventDefault();
  showToast('في النسخة التجريبية: استخدم بيانات الحسابات الظاهرة بالأسفل.', 'warning');
});

/* بناء بطاقات الحسابات التجريبية */
function renderDemoAccounts() {
  const list = $('demoAccountsList');
  list.innerHTML = '';
  const accounts = getStore(STORE.accounts, DEFAULT_ACCOUNTS);
  accounts.filter(a => a.active).forEach(user => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'demo-account';
    card.innerHTML = `
      <div class="demo-account-info">
        <span class="demo-account-role ${roleClass(user.role)}">${roleLabel(user.role)}</span>
        <span class="demo-account-email">${user.email}</span>
        <span class="demo-account-pass">${user.pass}</span>
      </div>
      <div class="demo-account-fill" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
    `;
    card.addEventListener('click', () => {
      emailInput.value = user.email;
      passwordInput.value = user.pass;
      clearFieldError(emailWrap, emailError);
      clearFieldError(passwordWrap, passwordError);
      showToast(`تم ملء بيانات ${roleLabel(user.role)} — اضغط «دخول».`, 'success');
      submitBtn.focus({ preventScroll: true });
    });
    list.appendChild(card);
  });
}

/* فتح مودال إنشاء الحساب */
$('openCreateAccountBtn').addEventListener('click', () => {
  $('createAccountForm').reset();
  ['ca-name-error','ca-stage-error','ca-email-error','ca-pass-error','ca-pass2-error'].forEach(id => {
    $(id).textContent = ''; $(id).classList.remove('visible');
  });
  openModal('createAccountModal');
});

/* حفظ حساب الخادم الجديد */
$('createAccountForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('ca-name').value.trim();
  const email = $('ca-email').value.trim();
  const stage = $('ca-stage').value;
  const pass = $('ca-pass').value;
  const pass2 = $('ca-pass2').value;
  let valid = true;

  if (!name || name.length < 2) { showFieldError(null, $('ca-name-error'), 'أدخل الاسم الكامل.'); valid = false; }
  else $('ca-name-error').classList.remove('visible');

  if (!stage) { showFieldError(null, $('ca-stage-error'), 'اختر المرحلة.'); valid = false; }
  else $('ca-stage-error').classList.remove('visible');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showFieldError(null, $('ca-email-error'), 'بريد إلكتروني غير صالح.'); valid = false; }
  else $('ca-email-error').classList.remove('visible');

  if (!pass || pass.length < 6) { showFieldError(null, $('ca-pass-error'), 'كلمة المرور ٦ أحرف على الأقل.'); valid = false; }
  else $('ca-pass-error').classList.remove('visible');

  if (pass !== pass2) { showFieldError(null, $('ca-pass2-error'), 'كلمتا المرور غير متطابقتين.'); valid = false; }
  else $('ca-pass2-error').classList.remove('visible');

  if (!valid) return;

  const res = createServantAccount({ name, email, password: pass, stage });
  if (!res.ok) { showFieldError(null, $('ca-email-error'), res.error); return; }

  showToast(`✨ تم إنشاء حساب ${name} بنجاح — جاري الدخول...`, 'success');
  closeModal('createAccountModal');
  saveSession({ userId: res.user.id, loginAt: Date.now() }, true);
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
}

function logout() {
  clearSession();
  appShell.style.display = 'none';
  loginScreen.style.display = '';
  emailInput.value = '';
  passwordInput.value = '';
  clearFieldError(emailWrap, emailError);
  clearFieldError(passwordWrap, passwordError);
  renderDemoAccounts();
  showToast('تم تسجيل الخروج.', '');
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
  if (sub === 'reading' && !$('scripture-display').innerHTML.trim()) initBibleSelectors();
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
}

/* ===========================================================
   10.9 العرض الرئيسي
   =========================================================== */
function renderAll() {
  const user = getCurrentUser();
  if (!user) return;

  $('current-role-badge').textContent = `${roleLabel(user.role)}: ${user.name}` + (user.stage ? ` • ${user.stage}` : '');

  // مبدّل الأدوار السريع — للمالك فقط
  const roleBar = $('roleSwitcherBar');
  if (user.role === 'owner') {
    roleBar.style.display = '';
    const accounts = getStore(STORE.accounts, DEFAULT_ACCOUNTS).filter(a => a.active);
    $('quick-role-switcher').innerHTML = accounts.map(a => `
      <button class="role-btn ${a.id === user.id ? 'active' : ''}" onclick="quickSwitchUser('${a.id}')">
        ${roleLabel(a.role)} (${a.name.split(' ')[0]})
      </button>
    `).join('');
  } else {
    roleBar.style.display = 'none';
  }

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

function quickSwitchUser(id) {
  setStore(STORE.session, { userId: id, loginAt: Date.now() });
  resetQuizState();
  renderAll();
  showToast('تم تبديل الحساب (وضع تجريبي)', 'warning');
}

/* ===========================================================
   10.10 تبويب اليوم
   =========================================================== */
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

function renderToday() {
  const user = getCurrentUser();
  if (!user) return;
  const plan = getStore(STORE.plan, DEFAULT_PLAN);
  const key = `${user.id}:${todayKey()}`;
  const progressAll = getStore(STORE.progress, {});
  const userProg = progressAll[key] || { reading: false, meditation: false, prayer: false, challenge: false };

  const dateLabel = new Date().toLocaleDateString('ar-EG', { weekday: 'long', month: 'short', day: 'numeric' });
  $('today-date-label').textContent = dateLabel;
  $('plan-verse-ref').textContent = plan.ref;
  $('plan-reading-title').textContent = plan.reading;
  const medText = personalize(plan.meditation, user);
  $('plan-meditation-preview').textContent = medText.length > 46 ? medText.slice(0, 46) + '...' : medText;
  $('full-meditation-text').textContent = medText;
  $('plan-prayer-title').textContent = plan.prayer;
  $('plan-challenge-title').textContent = personalize(plan.challenge, user, true);
  renderTaskPanels(plan);

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
    const accs = getStore(STORE.accounts, DEFAULT_ACCOUNTS).filter(a => a.active);
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

/* مطابقة نص الخطة مع النصوص المتوفرة أوفلاين */
function normAr(str) {
  return String(str || '')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\s+/g, ' ').trim();
}

function findPlanReading(text) {
  const t = normAr(text);
  let found = null;
  Object.keys(BIBLE_DATA).filter(b => b !== AGPEYA_KEY).forEach(book => {
    const full = normAr(book);
    const short = full.replace(/^(انجيل|سفر|رساله)\s+(معلمنا\s+)?/, '');
    if (!(t.includes(full) || (short && t.includes(short)))) return;
    Object.keys(BIBLE_DATA[book]).forEach(ch => {
      const num = (normAr(ch).match(/\d+/) || [])[0];
      if (num && new RegExp('(?<!\\d)' + num + '(?!\\d)').test(t)) found = { book, chapter: ch };
    });
  });
  return found;
}

function findPlanPrayer(text) {
  const t = normAr(text);
  const keys = Object.keys(BIBLE_DATA[AGPEYA_KEY]);
  return keys.find(k => { const title = normAr(k.split('—')[0]); return title && t.includes(title); }) || keys[0];
}

function versesHtml(verses) {
  return verses.map((v, i) => `<p style="margin-bottom:10px;"><span class="verse-num">${i + 1}</span> ${v}</p>`).join('');
}

function renderTaskPanels(plan) {
  const openLink = (fn, label) => `<div style="margin-top:12px;"><button class="btn btn-outline btn-sm" onclick="${fn}()">${label}</button></div>`;

  // القراءة
  const m = findPlanReading(plan.reading);
  $('task-reading-content').innerHTML = m
    ? `<div style="font-weight:800; color:var(--primary); margin-bottom:10px;">${escapeHtml(m.book)} — ${escapeHtml(m.chapter)}</div>
       <div class="scripture-text">${versesHtml(BIBLE_DATA[m.book][m.chapter])}</div>` + openLink('openBible', '📖 فتح في قسم القراءة')
    : `<p style="color:var(--text-muted); font-size:0.9rem; line-height:1.8;">نص «${escapeHtml(plan.reading)}» غير متوفر داخل التطبيق بعد. يمكنك تصفح الأسفار المتاحة من قسم القراءة.</p>` + openLink('openBible', '📖 فتح قسم القراءة');

  // التأمل
  const curUser = getCurrentUser();
  $('task-meditation-content').innerHTML = `<p style="line-height:1.9; font-size:0.96rem; white-space:pre-wrap;">${escapeHtml(personalize(plan.meditation, curUser, true))}</p>`;

  // الأجبية
  const sel = $('task-prayer-select');
  if (!sel.options.length) {
    sel.innerHTML = Object.keys(BIBLE_DATA[AGPEYA_KEY]).map(k => `<option value="${k}">${k}</option>`).join('');
  }
  if (sel.dataset.plan !== plan.prayer) {
    sel.value = findPlanPrayer(plan.prayer);
    sel.dataset.plan = plan.prayer;
  }
  renderPrayerText();
}

function renderPrayerText() {
  const verses = BIBLE_DATA[AGPEYA_KEY][$('task-prayer-select').value] || [];
  $('task-prayer-text').innerHTML = versesHtml(verses);
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
  const d = new Date(); d.setHours(0, 0, 0, 0);
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
  const now = new Date();
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
  const now = new Date();
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
    html += `<button type="button" class="cal-cell lvl${counts[k] || 0} ${k === todayK ? 'today' : ''} ${future ? 'future' : ''}" ${future ? 'disabled' : ''} onclick="showDayInfo('${k}')">${day.toLocaleString('ar-EG')}</button>`;
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
const AGPEYA_KEY = 'الأجبية المقدسة';
let readingMode = 'bible';

function currentReadingBook() {
  return readingMode === 'agpeya' ? AGPEYA_KEY : $('bible-book-select').value;
}

function initBibleSelectors() {
  const books = Object.keys(BIBLE_DATA).filter(b => b !== AGPEYA_KEY);
  $('bible-book-select').innerHTML = books.map(b => `<option value="${b}">${b}</option>`).join('');
  updateChapterSelector();
}

function updateChapterSelector() {
  const chapSel = $('bible-chapter-select');
  const chapters = Object.keys(BIBLE_DATA[currentReadingBook()] || {});
  chapSel.innerHTML = chapters.map(c => `<option value="${c}">${c}</option>`).join('');
  renderScripture();
}

function renderScripture() {
  const verses = (BIBLE_DATA[currentReadingBook()] && BIBLE_DATA[currentReadingBook()][$('bible-chapter-select').value]) || [];
  $('scripture-display').innerHTML = verses.map((v, i) =>
    `<p style="margin-bottom:10px;"><span class="verse-num">${i + 1}</span> ${v}</p>`
  ).join('');
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
let quizReview = null;  // بيانات مراجعة آخر محاولة
let quizTimerId = null;

function clearQuizTimer() { if (quizTimerId) { clearInterval(quizTimerId); quizTimerId = null; } }

function resetQuizState() {
  clearQuizTimer();
  selectedAnswers = {};
  quizIndex = 0;
  quizDone = false;
  quizBusy = false;
  quizReview = null;
  const rb = $('quiz-result-box');
  if (rb) rb.style.display = 'none';
}

function quizTimerSeconds() {
  const sched = getStore(STORE.schedule, DEFAULT_SCHEDULE) || {};
  return Math.max(0, parseInt(sched.timer, 10) || 0);
}

function renderContest() {
  const sched = getStore(STORE.schedule, DEFAULT_SCHEDULE);
  $('contest-book-badge').textContent = sched.book;
  $('contest-schedule-info').textContent = sched.info;
  renderScheduleNote(sched);
  renderQuiz();
}

/* معرّف المسابقة الحالية: يتغير فقط عند تغيير الأسئلة أو السفر، فتُفتح محاولة جديدة لمسابقة جديدة */
function contestId() {
  const sched = getStore(STORE.schedule, DEFAULT_SCHEDULE) || {};
  const str = JSON.stringify(getStore(STORE.contest, DEFAULT_CONTEST)) + '|' + (sched.book || '');
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return 'c' + (h >>> 0).toString(36);
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

  if (!n) { box.innerHTML = '<p style="text-align:center; color:var(--text-muted);">لا توجد أسئلة حالياً.</p>'; return; }
  if (!quizDone) {
    const user = getCurrentUser();
    const prev = user && firstAttempt(user);
    if (prev) {
      quizReview = prev.answers
        ? { score: prev.score, total: prev.total, questions, answers: prev.answers }
        : null;
      quizDone = true;
    }
  }
  if (quizDone) { renderQuizReview(box); return; }

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

function renderQuizReview(box) {
  const r = quizReview;
  if (!r) {
    box.innerHTML = `<div class="quiz-card" style="text-align:center;"><div style="font-size:2.2rem;">✅</div>
      <div class="quiz-q" style="margin:8px 0 14px;">تم إرسال إجاباتك وتسجيل نتيجتك</div>
      <button class="btn btn-gold btn-sm" onclick="switchTab('profile')">🏆 نتائجي في حسابي</button></div>`;
    return;
  }
  const pct = r.total ? Math.round((r.score / r.total) * 100) : 0;
  const msg = pct === 100 ? 'ممتاز! علامة كاملة 🎉' : pct >= 70 ? 'أحسنت 👏' : pct >= 50 ? 'جيد، وتستطيع أفضل 💪' : 'بارك الله مجهودك، وفي المرة القادمة بتركيز أكبر 🙏';
  const summary = `<div class="quiz-summary">
      <div class="quiz-summary-score">${r.score}<small> / ${r.total}</small></div>
      <div class="quiz-summary-msg">${msg}</div>
      <div style="font-size:0.78rem; color:var(--text-muted); margin-top:6px;">تُحتسب المحاولة الأولى فقط</div>
      <div class="quiz-nav" style="justify-content:center;">
        <button class="btn btn-gold btn-sm" onclick="switchTab('profile')">🏆 نتائجي في حسابي</button>
      </div>
    </div>`;
  const list = r.questions.map((item, qi) => {
    const mine = r.answers[qi];
    const hasKey = typeof item.answer === 'number';
    const isOk = hasKey && mine === item.answer;
    const status = mine === undefined ? '<span class="badge badge-red">⏰ لم تُجب</span>'
                 : isOk ? '<span class="badge badge-green">صحيحة</span>' : '<span class="badge badge-red">خاطئة</span>';
    const opts = item.options.map((opt, oi) => {
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
  if (firstAttempt(user)) { renderContest(); return; }
  const questions = getStore(STORE.contest, DEFAULT_CONTEST);
  const answered = Object.keys(selectedAnswers).length;
  if (!quizTimerSeconds() && answered < questions.length) { showToast('⚠️ برجاء الإجابة على جميع الأسئلة أولاً'); return; }

  let score = 0;
  questions.forEach((q, idx) => { if (selectedAnswers[idx] === q.answer) score++; });

  const results = getStore(STORE.results, []);
  results.push({
    userId: user.id, userName: user.name,
    score, total: questions.length,
    cid: contestId(), answers: { ...selectedAnswers },
    date: new Date().toLocaleDateString('ar-EG')
  });
  setStore(STORE.results, results);

  quizReview = { score, total: questions.length, questions, answers: { ...selectedAnswers } };
  selectedAnswers = {};
  quizIndex = 0;
  quizDone = true;
  renderContest();
  renderMyResults();
  renderToday();
  $('quiz-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (questions.length && score === questions.length) { fireConfetti('big'); haptic([60, 40, 60, 40, 140]); }
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

function setPostFilter(f) {
  postFilter = f;
  $('filter-all-btn').className = f === 'all' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline';
  $('filter-mine-btn').className = f === 'mine' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline';
  renderPosts();
}

function createPost() {
  const user = getCurrentUser();
  if (!user) return;
  const text = $('new-post-text').value.trim();
  if (!text) return showToast('اكتب محتوى المشاركة أولاً');
  const posts = getStore(STORE.posts, DEFAULT_POSTS);
  posts.unshift({
    id: 'p_' + Date.now(),
    authorId: user.id, authorName: user.name,
    text, visibility: $('new-post-visibility').value,
    hidden: false, likes: [], createdAt: 'الآن'
  });
  setStore(STORE.posts, posts);
  $('new-post-text').value = '';
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
          <button class="react-btn ${liked ? 'active' : ''}" onclick="toggleLike('${p.id}')">❤️ 🙏 (${p.likes.length})</button>
          ${isMine && p.visibility === 'private' ? `<button class="btn btn-outline btn-sm" onclick="makePublic('${p.id}')">🔄 تحويل لعام</button>` : ''}
          ${isMine ? `<button class="btn btn-outline btn-sm" onclick="editPost('${p.id}')">✏️ تعديل</button>` : ''}
          ${(isMine || (isMod && p.visibility === 'public')) ? `<button class="btn btn-outline btn-sm" style="color:var(--danger);" onclick="deletePost('${p.id}')">🗑️ حذف</button>` : ''}
          ${(isMod && p.visibility === 'public') ? `<button class="btn btn-outline btn-sm" onclick="toggleHidePost('${p.id}')">${p.hidden ? '👁️ إظهار' : '🙈 إخفاء'}</button>` : ''}
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
  renderPosts();
}

function makePublic(id) {
  const posts = getStore(STORE.posts, DEFAULT_POSTS);
  const post = posts.find(p => p.id === id);
  if (post) { post.visibility = 'public'; setStore(STORE.posts, posts); renderPosts(); showToast('تم تحويل المشاركة إلى عامة'); }
}

function editPost(id) {
  const posts = getStore(STORE.posts, DEFAULT_POSTS);
  const post = posts.find(p => p.id === id);
  if (!post) return;
  const updated = prompt('تعديل نص المشاركة:', post.text);
  if (updated !== null && updated.trim() !== '') {
    post.text = updated.trim();
    setStore(STORE.posts, posts);
    renderPosts();
    showToast('تم تعديل المشاركة');
  }
}

function deletePost(id) {
  if (!confirm('هل أنت متأكد من حذف هذه المشاركة؟')) return;
  let posts = getStore(STORE.posts, DEFAULT_POSTS);
  posts = posts.filter(p => p.id !== id);
  setStore(STORE.posts, posts);
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
        const existing = getStore(STORE.posts, DEFAULT_POSTS);
        const ids = new Set(existing.map(p => p.id));
        data.posts.forEach(p => { if (!ids.has(p.id)) existing.unshift(p); });
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
  const all = getStore(STORE.results, []);
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

function saveProfile() {
  const user = getCurrentUser();
  const accounts = getStore(STORE.accounts, DEFAULT_ACCOUNTS);
  const acc = accounts.find(a => a.id === user.id);
  const newName = $('profile-name-input').value.trim();
  const newPass = $('profile-pass-input').value.trim();
  if (newName) acc.name = newName;
  if (newPass) {
    if (newPass.length < 6) { showToast('كلمة المرور ٦ أحرف على الأقل', 'error'); return; }
    acc.pass = newPass;
  }
  setStore(STORE.accounts, accounts);
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

function renderAdminPanels() {
  const user = getCurrentUser();
  if (!user || user.role === 'servant') return;

  const plan = getStore(STORE.plan, DEFAULT_PLAN);
  const sched = getStore(STORE.schedule, DEFAULT_SCHEDULE);
  const accounts = getStore(STORE.accounts, DEFAULT_ACCOUNTS);
  const progressAll = getStore(STORE.progress, {});
  const results = getStore(STORE.results, []);
  const posts = getStore(STORE.posts, DEFAULT_POSTS);
  const tk = todayKey();

  $('admin-plan-ref').value = plan.ref;
  $('admin-plan-reading').value = plan.reading;
  $('admin-plan-meditation').value = plan.meditation;
  $('admin-plan-prayer').value = plan.prayer;
  $('admin-plan-challenge').value = plan.challenge;

  $('admin-sched-book').value = sched.book;
  $('admin-sched-info').value = sched.info;
  $('admin-sched-timer').value = sched.timer || 0;
  $('admin-sched-start-date').value = sched.startDate || '';
  $('admin-sched-start-time').value = sched.startTime || '';
  $('admin-sched-end-date').value = sched.endDate || '';
  $('admin-sched-end-time').value = sched.endTime || '';
  syncAdminPlanSelectors(plan);

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
        <button class="btn btn-outline btn-sm" onclick="toggleHidePost('${p.id}')">${p.hidden ? '👁️ إظهار' : '🙈 إخفاء'}</button>
        <button class="btn btn-danger btn-sm" onclick="deletePost('${p.id}')">🗑️ حذف نهائي</button>
      </div>
    </div>
  `).join('') : '<p style="text-align:center; color:var(--text-muted); padding:14px;">لا توجد مشاركات عامة.</p>';

  if (user.role === 'owner') {
    $('owner-contest-json').value = JSON.stringify(getStore(STORE.contest, DEFAULT_CONTEST), null, 2);
    $('owner-accounts-body').innerHTML = accounts.map(a => `
      <tr>
        <td><strong>${escapeHtml(a.name)}</strong></td>
        <td>${escapeHtml(a.stage || '—')}</td>
        <td style="font-family:monospace; font-size:0.75rem; direction:ltr; text-align:right;">${escapeHtml(a.email || '—')}</td>
        <td>${roleLabel(a.role)}</td>
        <td>${a.active ? '<span class="badge badge-green">نشط</span>' : '<span class="badge badge-red">معطل</span>'}</td>
        <td>
          ${a.id !== user.id ? `<button class="btn btn-outline btn-sm" onclick="toggleAccountStatus('${a.id}')">${a.active ? 'تعطيل' : 'تفعيل'}</button>` : '—'}
        </td>
      </tr>
    `).join('');
  }
}

/* ===========================================================
   v10: أدوات جديدة
   =========================================================== */
function fillStageSelects() {
  const opts = '<option value="">— اختر المرحلة —</option>' + STAGES.map(s => `<option value="${s}">${s}</option>`).join('');
  ['ca-stage', 'new-acc-stage'].forEach(id => { const el = $(id); if (el) el.innerHTML = opts; });
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

/* --- اختيار السفر من ملف القراءة (BIBLE_DATA) --- */
const ADMIN_MANUAL = '__manual__';

function adminBookOptions() {
  return Object.keys(BIBLE_DATA).filter(b => b !== AGPEYA_KEY);
}

function fillAdminChapters(book, selected) {
  const chapters = Object.keys(BIBLE_DATA[book] || {});
  $('admin-plan-chapter').innerHTML = chapters.map(c => `<option value="${c}">${c}</option>`).join('');
  if (selected && chapters.includes(selected)) $('admin-plan-chapter').value = selected;
}

function syncAdminPlanSelectors(plan) {
  const bookSel = $('admin-plan-book');
  bookSel.innerHTML = adminBookOptions().map(b => `<option value="${b}">${b}</option>`).join('')
    + `<option value="${ADMIN_MANUAL}">✏️ كتابة يدوية</option>`;
  const m = findPlanReading(plan.reading);
  if (m) { bookSel.value = m.book; fillAdminChapters(m.book, m.chapter); }
  else { bookSel.value = ADMIN_MANUAL; fillAdminChapters(ADMIN_MANUAL); }
}

function adminPlanBookChanged() {
  const book = $('admin-plan-book').value;
  fillAdminChapters(book);
  adminPlanChapterChanged();
}

function adminPlanChapterChanged() {
  const book = $('admin-plan-book').value, ch = $('admin-plan-chapter').value;
  if (book === ADMIN_MANUAL || !ch) return;
  const verses = (BIBLE_DATA[book] || {})[ch] || [];
  const short = book.replace(/^(إنجيل|سفر|رسالة)\s+(معلمنا\s+)?/, '');
  const num = ch.replace(/^الأصحاح\s*/, '');
  const toAr = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  $('admin-plan-reading').value = `${book} — ${ch}`;
  $('admin-plan-ref').value = `${short} ${num}` + (verses.length ? ` : ١ - ${toAr(verses.length)}` : '');
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
      const iso = new Date(); const today = `${iso.getFullYear()}-${String(iso.getMonth() + 1).padStart(2, '0')}-${String(iso.getDate()).padStart(2, '0')}`;
      const byDate = entries.findIndex(e => e.date === today);
      sel.value = String(byDate >= 0 ? byDate : 0);
      applyJsonEntry(kind, entries[byDate >= 0 ? byDate : 0]);
      showToast(`تم تحميل ${entries.length} ${kind === 'meditation' ? 'تأمل' : 'خدمة'} — اضغط «حفظ وتعميم الخطة» للتطبيق`, 'success');
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
  if (e.ref) $('admin-plan-ref').value = e.ref;
  if (e.reading) $('admin-plan-reading').value = e.reading;
  else if (e.book && e.chapter) $('admin-plan-reading').value = `${e.book} — ${e.chapter}`;
  if (e.reading || (e.book && e.chapter)) syncAdminPlanSelectors({ reading: $('admin-plan-reading').value });
}

function saveAdminPlan() {
  if (!requireRole('admin', 'owner')) return;
  setStore(STORE.plan, {
    ref: $('admin-plan-ref').value,
    reading: $('admin-plan-reading').value,
    meditation: $('admin-plan-meditation').value,
    prayer: $('admin-plan-prayer').value,
    challenge: $('admin-plan-challenge').value
  });
  renderToday();
  showToast('تم تحديث خطة اليوم للجميع');
}

function saveAdminSchedule() {
  if (!requireRole('admin', 'owner')) return;
  const startDate = $('admin-sched-start-date').value, startTime = $('admin-sched-start-time').value;
  const endDate = $('admin-sched-end-date').value, endTime = $('admin-sched-end-time').value;
  if (startDate && endDate) {
    const a = new Date(`${startDate}T${startTime || '00:00'}`), b = new Date(`${endDate}T${endTime || '23:59'}`);
    if (b <= a) return showToast('نهاية المسابقة يجب أن تكون بعد بدايتها', 'error');
  }
  setStore(STORE.schedule, {
    book: $('admin-sched-book').value,
    info: $('admin-sched-info').value,
    timer: Math.max(0, Math.min(300, parseInt($('admin-sched-timer').value, 10) || 0)),
    startDate, startTime, endDate, endTime
  });
  resetQuizState();
  renderContest();
  showToast('تم تحديث مواعيد المسابقة');
}

function saveOwnerContestJson() {
  if (!requireRole('owner')) return;
  try {
    const parsed = JSON.parse($('owner-contest-json').value);
    if (!Array.isArray(parsed)) throw new Error();
    setStore(STORE.contest, parsed);
    resetQuizState();
    renderContest();
    showToast('تم رفع وتحديث أسئلة المسابقة بنجاح');
  } catch { showToast('خطأ في صيغة JSON — يرجى المراجعة', 'error'); }
}

function adminAddAccount() {
  if (!requireRole('admin', 'owner')) return;
  const name = $('new-acc-name').value.trim();
  const email = $('new-acc-email').value.trim();
  const role = $('new-acc-role').value;
  const stage = $('new-acc-stage').value;
  if (!name) return showToast('أدخل اسم الخادم', 'error');
  if (role === 'servant' && !stage) return showToast('اختر مرحلة الخادم', 'error');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast('بريد غير صالح', 'error');
  const accounts = getStore(STORE.accounts, DEFAULT_ACCOUNTS);
  if (accounts.some(a => a.email.toLowerCase() === email.toLowerCase())) return showToast('البريد مسجّل بالفعل', 'error');
  accounts.push({ id: 'u_' + Date.now(), name, email, role, stage: role === 'servant' ? stage : '', pass: '123456', active: true });
  setStore(STORE.accounts, accounts);
  $('new-acc-name').value = '';
  $('new-acc-email').value = '';
  renderAll();
  showToast(`تم إضافة ${name} — كلمة المرور الافتراضية: 123456`);
}

function toggleAccountStatus(id) {
  if (!requireRole('owner')) return;
  const accounts = getStore(STORE.accounts, DEFAULT_ACCOUNTS);
  const acc = accounts.find(a => a.id === id);
  if (acc) {
    acc.active = !acc.active;
    setStore(STORE.accounts, accounts);
    renderAll();
    showToast('تم تحديث حالة الحساب');
  }
}

function resetDemoData() {
  if (!requireRole('owner')) return;
  if (!confirm('هل تريد إعادة ضبط جميع بيانات التطبيق للحالة الافتراضية؟')) return;
  Object.values(STORE).forEach(k => { try { localStorage.removeItem(k); } catch {} });
  initApp();
  showToast('تمت استعادة البيانات الافتراضية');
}

/* ===========================================================
   10.16 التهيئة الأولية
   =========================================================== */
function initApp() {
  if (!localStorage.getItem(STORE.accounts)) setStore(STORE.accounts, DEFAULT_ACCOUNTS);
  if (!localStorage.getItem(STORE.plan)) setStore(STORE.plan, DEFAULT_PLAN);
  if (!localStorage.getItem(STORE.schedule)) setStore(STORE.schedule, DEFAULT_SCHEDULE);
  if (!localStorage.getItem(STORE.contest)) setStore(STORE.contest, DEFAULT_CONTEST);
  if (!localStorage.getItem(STORE.posts)) setStore(STORE.posts, DEFAULT_POSTS);

  const savedFont = localStorage.getItem(STORE.fontSize);
  if (savedFont) document.documentElement.style.setProperty('--font-size-base', savedFont + 'px');

  fillStageSelects();
  initTheme();
  initBibleSelectors();
  renderDemoAccounts();

  const session = loadSession();
  if (session && getCurrentUser()) {
    enterApp();
  } else {
    loginScreen.style.display = '';
    appShell.style.display = 'none';
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
    const results = getStore(STORE.results, []);
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
