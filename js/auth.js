'use strict';
/* الخدمة اليومية v1.2 — الحسابات: Supabase Auth + جدول profiles
   - يعتمد على js/supa.js. لا يعتمد على app.js (يُحمَّل قبله).
   - الواجهة القديمة متزامنة، فنحتفظ بالمستخدم الحالي في الذاكرة وفي التخزين (آخر نسخة معروفة).
   - الحماية الحقيقية في السيرفر (RLS + دوال SQL) وليست هنا. */
const Auth = (function () {
  const KEY = 'ds_v2_auth';
  const STAGE_OPTIONS = [
    { code: 'p1', label: 'أولى ابتدائي' },
    { code: 'p2', label: 'ثانية ابتدائي' },
    { code: 'p3', label: 'ثالثة ابتدائي' },
    { code: 'p4', label: 'رابعة ابتدائي' },
    { code: 'p5', label: 'خامسة ابتدائي' },
    { code: 'p6', label: 'سادسة ابتدائي' },
    { code: 'general', label: 'عام / غير محدد' }
  ];
  const stageLabel = function (c) {
    const s = STAGE_OPTIONS.find(function (x) { return x.code === c; });
    return s ? s.label : '';
  };

  let sess = null;        // { access_token, refresh_token, expires_at (ثواني) }
  let me = null;          // المستخدم الحالي بشكل التطبيق
  let remember = true;
  let accounts = [];      // قائمة الحسابات (للمسؤول والمالك فقط)
  let refreshing = null;
  let lastVerify = 0;
  const on = { forced: null, changed: null };

  /* ---------- التخزين ---------- */
  function clearStore() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    try { sessionStorage.removeItem(KEY); } catch (e) {}
  }
  function persist() {
    clearStore();
    if (!sess || !me) return;
    const json = JSON.stringify({ sess: sess, user: me });
    try { (remember ? localStorage : sessionStorage).setItem(KEY, json); } catch (e) {}
  }
  function readStore() {
    try { const s = sessionStorage.getItem(KEY); if (s) return { data: JSON.parse(s), remember: false }; } catch (e) {}
    try { const l = localStorage.getItem(KEY); if (l) return { data: JSON.parse(l), remember: true }; } catch (e) {}
    return null;
  }
  /* بيانات النسخة التجريبية (v1.0) فيها كلمات مرور نصية — تُمسح مرة واحدة */
  function purgeLegacy() {
    ['ds_v2_accounts', 'ds_v2_session'].forEach(function (k) {
      try { localStorage.removeItem(k); } catch (e) {}
      try { sessionStorage.removeItem(k); } catch (e) {}
    });
  }
  function resetState() { sess = null; me = null; accounts = []; clearStore(); }

  /* ---------- تحويلات ---------- */
  function mapProfile(p) {
    if (!p || !p.id) return null;
    return {
      id: p.id,
      name: p.full_name || '',
      email: p.email || '',
      phone: p.phone || '',
      role: p.role,
      stageCode: p.stage,
      stage: stageLabel(p.stage),
      status: p.status,
      active: p.status === 'active',
      lastLogin: p.last_login_at || null,
      createdAt: p.created_at || null
    };
  }
  function setSession(d) {
    sess = {
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expires_at: d.expires_at || (Math.floor(Date.now() / 1000) + (d.expires_in || 3600))
    };
  }
  function normalizePhone(s) {
    let t = String(s || '')
      .replace(/[\u0660-\u0669]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[\u06F0-\u06F9]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); });
    t = t.replace(/[\s\-().]/g, '');
    return /^\+?[0-9]{8,15}$/.test(t) ? t : '';
  }
  function msgFor(r, fallback) {
    if (r.config) return 'لم يتم ضبط الاتصال بالخادم بعد (ملف js/config.js).';
    if (r.offline) return 'لا يوجد اتصال بالإنترنت. حاول مرة أخرى.';
    const m = String((r.error && r.error.message) || '').toLowerCase();
    const c = String((r.error && r.error.code) || '').toLowerCase();
    if (c === 'invalid_credentials' || m.indexOf('invalid login') !== -1) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    if (c === 'user_already_exists' || m.indexOf('already registered') !== -1) return 'هذا البريد مسجّل بالفعل.';
    if (c === 'same_password' || m.indexOf('different from the old') !== -1) return 'كلمة المرور الجديدة يجب أن تختلف عن القديمة.';
    if (c === 'weak_password' || m.indexOf('password should be at least') !== -1) return 'كلمة المرور ضعيفة. استخدم ٦ أحرف على الأقل.';
    if (c === 'reauthentication_needed' || m.indexOf('reauthentication') !== -1) return 'سجّل الخروج ثم ادخل من جديد، وبعدها غيّر كلمة المرور.';
    if (c === 'email_not_confirmed') return 'البريد غير مؤكَّد في إعدادات الخادم. تواصل مع المسؤول.';
    if (c === 'over_request_rate_limit' || c === 'over_email_send_rate_limit' || r.status === 429) return 'محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.';
    if (m.indexOf('database error') !== -1) return 'تعذّر إنشاء الحساب. راجع الاسم ورقم التليفون والمرحلة.';
    if (m.indexOf('forbidden') !== -1) return 'غير مصرح لك بهذا الإجراء.';
    if (m.indexOf('self_action') !== -1) return 'لا يمكنك تنفيذ هذا الإجراء على حسابك الشخصي.';
    if (m.indexOf('not_found') !== -1) return 'هذا الحساب لم يعد موجودًا.';
    if (m.indexOf('bad_input') !== -1) return 'بيانات غير صالحة.';
    return fallback || 'حدث خطأ غير متوقع. حاول مرة أخرى.';
  }

  /* ---------- تجديد الجلسة ---------- */
  function refresh() {
    if (!sess || !sess.refresh_token) return Promise.resolve({ ok: false, auth: true });
    if (refreshing) return refreshing;
    refreshing = (async function () {
      const r = await Supa.request('POST', '/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: sess.refresh_token } });
      if (r.ok && r.data && r.data.access_token) { setSession(r.data); persist(); return { ok: true }; }
      if (r.offline || r.config) return { ok: false, offline: true };
      return { ok: false, auth: r.status >= 400 && r.status < 500 && r.status !== 429 };
    })().then(function (x) { refreshing = null; return x; });
    return refreshing;
  }
  async function ensureFresh() {
    if (!sess) return { ok: false, auth: true };
    if (sess.expires_at - 60 > Date.now() / 1000) return { ok: true };
    return refresh();
  }
  function forceLogout(msg) {
    const had = !!sess;
    resetState();
    if (had && on.forced) on.forced(msg);
    return { ok: false, forced: true };
  }
  /* استدعاء بتوكن صالح؛ إن فقدت الجلسة صلاحيتها نخرج المستخدم */
  async function call(fn) {
    const f = await ensureFresh();
    if (!f.ok) {
      if (f.auth) { forceLogout('انتهت الجلسة. سجّل الدخول من جديد.'); return { ok: false, authLost: true, status: 401, error: {} }; }
      return { ok: false, offline: true, status: 0, error: {} };
    }
    let r = await fn(sess.access_token);
    if (!r.ok && r.status === 401) {
      const f2 = await refresh();
      if (f2.ok) r = await fn(sess.access_token);
      else if (f2.auth) { forceLogout('انتهت الجلسة. سجّل الدخول من جديد.'); return { ok: false, authLost: true, status: 401, error: {} }; }
    }
    return r;
  }
  function rpc(name, args) {
    return call(function (t) { return Supa.request('POST', '/rest/v1/rpc/' + name, { token: t, body: args || {} }); });
  }

  /* ---------- الدخول والتسجيل ---------- */
  async function finishSignIn() {
    const tok = sess.access_token;
    const r = await Supa.request('POST', '/rest/v1/rpc/my_profile', { token: tok, body: {} });
    function abort(msg) {
      Supa.request('POST', '/auth/v1/logout?scope=local', { token: tok });
      sess = null; me = null; clearStore();
      return { ok: false, error: msg };
    }
    if (!r.ok) return abort(msgFor(r, 'تعذّر تحميل بيانات الحساب.'));
    const p = mapProfile(r.data);
    if (!p) return abort('لا توجد بيانات لهذا الحساب. تواصل مع المسؤول.');
    if (!p.active) return abort('هذا الحساب معطّل. تواصل مع المسؤول.');
    me = p;
    persist();
    rpc('touch_login', {}).then(function (t) {
      if (t.ok && t.data && t.data.last_login_at && me) { me.lastLogin = t.data.last_login_at; persist(); }
    });
    lastVerify = Date.now();
    return { ok: true, user: me };
  }
  async function login(email, password, rem) {
    const r = await Supa.request('POST', '/auth/v1/token?grant_type=password', {
      body: { email: String(email || '').trim().toLowerCase(), password: String(password || '') }
    });
    if (!r.ok || !r.data || !r.data.access_token) return { ok: false, error: msgFor(r, 'تعذّر تسجيل الدخول.') };
    remember = !!rem;
    setSession(r.data);
    return finishSignIn();
  }
  async function signup(f) {
    const r = await Supa.request('POST', '/auth/v1/signup', {
      body: {
        email: String(f.email || '').trim().toLowerCase(),
        password: String(f.password || ''),
        data: { full_name: String(f.name || '').trim(), phone: f.phone, stage: f.stage }
      }
    });
    if (!r.ok) return { ok: false, error: msgFor(r, 'تعذّر إنشاء الحساب.') };
    if (!r.data || !r.data.access_token) {
      return { ok: false, error: 'تم تسجيل الحساب لكن الخادم طلب تأكيد البريد. تواصل مع المسؤول لإيقاف «تأكيد البريد».' };
    }
    remember = true;
    setSession(r.data);
    return finishSignIn();
  }
  function logout() {
    const tok = sess && sess.access_token;
    resetState();
    if (tok) Supa.request('POST', '/auth/v1/logout?scope=local', { token: tok });
  }

  /* ---------- استعادة الجلسة والتحقق ---------- */
  function restore() {
    purgeLegacy();
    const s = readStore();
    const d = s && s.data;
    if (!d || !d.sess || !d.sess.refresh_token || !d.user || !d.user.id || !d.user.active) {
      if (s) clearStore();
      return null;
    }
    sess = d.sess; me = d.user; remember = s.remember;
    return me;
  }
  /* يتحقق من حالة الحساب في السيرفر. المعطّل أو المحذوف يُخرَج فورًا */
  async function verify(force) {
    if (!sess || !me) return { ok: false };
    if (!force && Date.now() - lastVerify < 45000) return { ok: true, skipped: true };
    lastVerify = Date.now();
    const r = await rpc('my_profile', {});
    if (!r.ok) return { ok: false, offline: !!r.offline };
    const p = mapProfile(r.data);
    if (!p) return forceLogout('هذا الحساب لم يعد موجودًا.');
    if (!p.active) return forceLogout('تم تعطيل هذا الحساب. تواصل مع المسؤول.');
    const changed = me.role !== p.role || me.name !== p.name || me.stageCode !== p.stageCode;
    me = p; persist();
    if (changed && on.changed) on.changed();
    return { ok: true, changed: changed };
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && sess) verify(false);
  });
  window.addEventListener('online', function () { if (sess) verify(true); });

  /* ---------- الحسابات والإجراءات ---------- */
  async function loadAccounts() {
    if (!me || (me.role !== 'admin' && me.role !== 'owner')) { accounts = []; return { ok: true }; }
    const r = await call(function (t) {
      return Supa.request('GET',
        '/rest/v1/profiles?select=id,full_name,email,phone,stage,role,status,last_login_at,created_at&order=created_at.desc',
        { token: t });
    });
    if (!r.ok) return { ok: false, error: msgFor(r, 'تعذّر تحديث قائمة الحسابات.') };
    accounts = (Array.isArray(r.data) ? r.data : []).map(mapProfile).filter(Boolean);
    return { ok: true };
  }
  async function action(name, args) {
    const r = await rpc(name, args);
    return r.ok ? { ok: true } : { ok: false, error: msgFor(r, 'تعذّر تنفيذ الإجراء.') };
  }
  const setStatus = function (id, status) { return action('admin_set_status', { p_uid: id, p_status: status }); };
  const deleteAccount = function (id) { return action('admin_delete_account', { p_uid: id }); };
  const setRole = function (id, role) { return action('owner_set_role', { p_uid: id, p_role: role }); };
  async function updateName(name) {
    const r = await action('update_my_name', { p_name: name });
    if (r.ok && me) { me.name = String(name).trim(); persist(); }
    return r;
  }
  /* v1.5: تعديل بيانات حساب (الاسم، التليفون، المرحلة) — مسؤول/مالك. لو الحساب هو حسابي نحدّث النسخة المحلية */
  async function updateProfile(id, name, phone, stage) {
    const r = await action('admin_update_profile', { p_uid: id, p_name: name, p_phone: phone, p_stage: stage });
    if (r.ok && me && me.id === id) {
      me.name = String(name).trim(); me.phone = String(phone).trim();
      me.stageCode = stage; me.stage = stageLabel(stage); persist();
    }
    return r;
  }
  async function changePassword(pw) {
    const r = await call(function (t) { return Supa.request('PUT', '/auth/v1/user', { token: t, body: { password: pw } }); });
    return r.ok ? { ok: true } : { ok: false, error: msgFor(r, 'تعذّر تغيير كلمة المرور.') };
  }

  return {
    STAGE_OPTIONS: STAGE_OPTIONS,
    configured: Supa.configured,
    on: on,
    normalizePhone: normalizePhone,
    restore: restore,
    login: login,
    signup: signup,
    logout: logout,
    verify: verify,
    getUser: function () { return me; },
    getAccounts: function () { return accounts; },
    loadAccounts: loadAccounts,
    setStatus: setStatus,
    deleteAccount: deleteAccount,
    setRole: setRole,
    updateName: updateName,
    updateProfile: updateProfile,
    changePassword: changePassword,
    /* v1.2: للمزامنة (js/sync.js) — استدعاء بتوكن صالح مع تجديد/خروج إجباري عند فقد الجلسة */
    rpc: rpc,
    get: function (path) { return call(function (t) { return Supa.request('GET', path, { token: t }); }); },
    errText: msgFor
  };
})();
