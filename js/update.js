'use strict';
/* الخدمة اليومية v1.2 — تسجيل الـService Worker وتحديث آمن
   السلوك:
   - الـSW الجديد يُحمَّل في الخلفية وينتظر. تظهر لافتة «يتوفر تحديث» بزر «حدّث الآن».
   - التحديث لا يحدث وسط مسابقة قيد الحل ولا وفي الطابور بيانات لم تُرفع بعد.
   - التفعيل التلقائي الصامت يحدث عندما يذهب التطبيق للخلفية (والتحديث آمن)، وإلا عند الفتح التالي.
   - إعادة التحميل مرة واحدة فقط وبعد طلبنا نحن (لا عند أول تثبيت). */
(function () {
  if (!('serviceWorker' in navigator)) return;
  var reg = null, waiting = null, asked = false, reloading = false;
  var hadController = !!navigator.serviceWorker.controller;

  function quizBusy() { try { return typeof window.isQuizInProgress === 'function' && window.isQuizInProgress(); } catch (e) { return false; } }
  function unsynced() { try { return typeof Sync !== 'undefined' && Sync.pendingCount() > 0; } catch (e) { return false; } }
  function safeNow() { return !quizBusy() && !unsynced(); }

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
    if (!waiting) return;
    asked = true;
    try { waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (e) {}
  }
  async function applyNow() {
    if (quizBusy()) { if (typeof showToast === 'function') showToast('أنهِ المسابقة الحالية أولًا ثم حدّث.', 'warning'); return; }
    if (unsynced()) { try { await Sync.flush(); } catch (e) {} }
    if (unsynced()) { if (typeof showToast === 'function') showToast('بعض بياناتك لم تُرفع بعد. اتصل بالإنترنت ثم حدّث.', 'warning'); return; }
    activate();
  }
  function onWaiting(w) { waiting = w; showBar(); }

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
    if (document.hidden) { if (waiting && safeNow()) activate(); }   // تحديث صامت أثناء غياب المستخدم
    else check();
  });
  window.addEventListener('online', check);
  setInterval(check, 30 * 60 * 1000);

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' }).then(function (r) {
      reg = r; track(r); check();
    }).catch(function (err) { console.warn('تعذّر تسجيل الـService Worker:', err); });
  });
})();
