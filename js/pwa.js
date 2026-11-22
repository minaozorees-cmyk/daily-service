/* الخدمة اليومية — طبقة PWA (v1.2)
   ملف مستقل عمدًا: js/app.js يبقى مطابقًا بالبايت لـ v12. */
(function () {
  'use strict';

  /* 1) سطر «الإصدار» في آخر تبويب «حسابي» — القيمة من APP_VERSION (js/version.js) */
  try {
    var ver = document.getElementById('app-version');
    if (ver && typeof APP_VERSION === 'string') ver.textContent = APP_VERSION;
  } catch (e) { /* العرض ثانوي: لا يوقف التطبيق */ }

  /* 2) لون شريط الحالة في الوضع الفاتح.
     app.js (دالة applyTheme) يعيد كتابة <meta name="theme-color"> إلى #1e3a8a عند كل تطبيق للثيم،
     بينما المعتمد #1c3a97. بدل تعديل app.js نلتف حول الدالة هنا (الوضع الداكن #0b1220 كما هو). */
  try {
    var LIGHT = '#1c3a97';
    var orig = window.applyTheme;
    if (typeof orig === 'function') {
      window.applyTheme = function (theme) {
        var r = orig.apply(this, arguments);
        if (theme !== 'dark') {
          var m = document.querySelector('meta[name="theme-color"]');
          if (m) m.setAttribute('content', LIGHT);
        }
        return r;
      };
      /* التطبيق الأول للثيم حدث قبل تحميل هذا الملف، فنعيده مرة واحدة */
      window.applyTheme(document.documentElement.getAttribute('data-theme'));
    }
  } catch (e) { /* ثانوي */ }

  /* 3) تسجيل الـService Worker والتحديث الآمن: انتقل إلى js/update.js (v1.2) */
})();
