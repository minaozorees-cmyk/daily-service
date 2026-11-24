'use strict';
/* الخدمة اليومية v1.5 — تسجيل الـService Worker وتحديث تلقائي آمن.
   السلوك:
   - الـSW الجديد يُحمَّل في الخلفية وينتظر (لا skipWaiting من الـSW نفسه).
   - يُفعَّل تلقائيًّا (ثم تُعاد الصفحة مرة واحدة) فقط عندما يكون «آمنًا» و«هادئًا»:
       آمن  = لا مسابقة قيد الحل، لا بيانات في الطابور لم تُرفع، لا نص قيد الكتابة (مشاركة/نموذج إدارة).
       هادئ = لا لمس للشاشة منذ ٦٠ ثانية، أو التطبيق في الخلفية، أو التطبيق فُتح للتو ولم يلمسه المستخدم بعد.
   - لو بقي التحديث معلَّقًا أكثر من ٥ دقائق (لأن الظروف لم تتحقق) تظهر اللافتة القديمة «حدّث الآن» كخيار يدوي.
   - المسودة: كتابة المشاركة تُحفظ تلقائيًّا في app.js، فلا تضيع حتى لو أُعيد تحميل الصفحة. */
(function () {
  if (!('serviceWorker' in navigator)) return;
  var IDLE_MS = 60 * 1000, BANNER_AFTER_MS = 5 * 60 * 1000, CHECK_EVERY = 10 * 60 * 1000, TICK = 10 * 1000;
  var reg = null, waiting = null, asked = false, reloading = false, waitingSince = 0;
  var hadController = !!navigator.serviceWorker.controller;
  var lastTouch = Date.now(), interacted = false;

  function quizBusy() { try { return typeof window.isQuizInProgress === 'function' && window.isQuizInProgress(); } catch (e) { return false; } }
  function unsynced() { try { return typeof Sync !== 'undefined' && Sync.pendingCount() > 0; } catch (e) { return false; } }
  function typing() { try { return typeof window.hasUnsavedInput === 'function' && window.hasUnsavedInput(); } catch (e) { return false; } }
  function safeNow() { return !quizBusy() && !unsynced() && !typing(); }
  function idleNow() {
    return document.hidden || !interacted || (Date.now() - lastTouch >= IDLE_MS);
  }

  ['pointerdown', 'touchstart', 'keydown', 'scroll', 'input', 'wheel'].forEach(function (ev) {
    window.addEventListener(ev, function () { interacted = true; lastTouch = Date.now(); }, { passive: true, capture: true });
  });

  function bar() {
    var el = document.getElementById('update-bar');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'update-bar';
    el.className = 'update-bar';
    el.setAttribute('role', 'status');
    el.innerHTML = '<span>يتوفر تحديث جديد للتطبيق</span><button type="button" class="btn btn-gold btn-sm" id="update-now">حدّث الآن</button>';
    document.body.appendChild(el);
    document.getElementById('update-now').addEventListener('click', applyNow);
    return el;
  }
  function showBar() { try { bar().classList.add('show'); } catch (e) {} }

  function activate() {
    if (!waiting || asked) return;
    asked = true;
    try { waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (e) {}
  }
  /* زر «حدّث الآن» اليدوي: لا يتجاوز حماية المسابقة، ويحاول رفع الطابور أولًا */
  async function applyNow() {
    if (quizBusy()) { if (typeof showToast === 'function') showToast('أنهِ المسابقة الحالية أولًا ثم حدّث.', 'warning'); return; }
    if (unsynced()) { try { await Sync.flush(); } catch (e) {} }
    if (unsynced()) { if (typeof showToast === 'function') showToast('بعض بياناتك لم تُرفع بعد. اتصل بالإنترنت ثم حدّث.', 'warning'); return; }
    if (typing()) { if (typeof showToast === 'function') showToast('أرسل ما تكتبه أو امسحه أولًا ثم حدّث.', 'warning'); return; }
    activate();
  }

  /* قرار التفعيل التلقائي: يُستدعى دوريًّا وعند كل حدث مناسب */
  function tick() {
    if (!waiting || asked) return;
    if (safeNow() && idleNow()) { activate(); return; }
    if (waitingSince && Date.now() - waitingSince >= BANNER_AFTER_MS) showBar();
  }

  function onWaiting(w) { waiting = w; if (!waitingSince) waitingSince = Date.now(); tick(); }

  function track(r) {
    if (r.waiting && navigator.serviceWorker.controller) onWaiting(r.waiting);
    r.addEventListener('updatefound', function () {
      var nw = r.installing;
      if (!nw) return;
      nw.addEventListener('statechange', function () {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) onWaiting(nw);
      });
    });
  }
  function check() { try { if (reg && navigator.onLine !== false) reg.update().catch(function () {}); } catch (e) {} }

  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (reloading || !asked || !hadController) return;   // أول تثبيت (clients.claim) لا يعيد التحميل
    reloading = true;
    window.location.reload();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) tick(); else check();
  });
  window.addEventListener('online', check);
  setInterval(check, CHECK_EVERY);
  setInterval(tick, TICK);

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' }).then(function (r) {
      reg = r; track(r); check();
    }).catch(function (err) { console.warn('تعذّر تسجيل الـService Worker:', err); });
  });

  /* للاختبار والتشخيص فقط */
  window.DSUpdate = { tick: tick, state: function () { return { waiting: !!waiting, asked: asked, safe: safeNow(), idle: idleNow(), interacted: interacted }; } };
})();
