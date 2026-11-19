# CHANGED — الخدمة اليومية v1.0

أول إصدار في الخط المستقل، فكل الملفات «جديدة» بالنسبة للريبو. العمود الثاني يبيّن علاقتها بالنموذج الأولي v12.

| المسار | الحالة | ملاحظة |
|---|---|---|
| `index.html` | منقول + معدّل | جسم الصفحة من v12 حرفيًّا. **ثلاثة فروق فقط:** (١) الـhead: التعليق، `theme-color` من `#1e3a8a` إلى `#1c3a97`، روابط manifest والأيقونات، واستبدال كتلة `<style>` برابط `css/app.css`. (٢) عنصر «الإصدار» في آخر تبويب «حسابي». (٣) استبدال كتلة `<script>` بثلاثة سكربتات خارجية. الإثبات: `DIFF-v12-to-v1.0-index.html.patch` |
| `css/app.css` | منقول | مطابق بالبايت لكتلة `<style>` في v12 (SHA-256: `d66ed376…cbf74`) |
| `js/app.js` | منقول | مطابق بالبايت لكتلة `<script>` في v12 (SHA-256: `6258ff29…27`). الحسابات التجريبية ما زالت داخله |
| `js/version.js` | جديد | `APP_VERSION = 'v1.0'`، مصدر واحد لسطر الإصدار |
| `js/pwa.js` | جديد | سطر الإصدار + التفاف `applyTheme` للحفاظ على `#1c3a97` + تسجيل الـService Worker |
| `js/demo-config.example.js` | جديد | مرجع فقط، غير محمَّل ولا مُخزَّن بالكاش |
| `sw.js` | جديد | `VERSION='v1.0'`؛ index.html: network-first · css/js/icons/manifest: cache-first · الخطوط: stale-while-revalidate · بلا `skipWaiting` |
| `manifest.json` | جديد | `start_url='./?source=pwa'`، `scope='./'`، `theme_color='#1c3a97'` |
| `icons/icon-192.png` | جديد | صليب قبطي ذهبي على لازوردي (زوايا مدوّرة شفافة) |
| `icons/icon-512.png` | جديد | نفسه بحجم 512 |
| `icons/maskable-512.png` | جديد | ملء كامل والمحتوى داخل المنطقة الآمنة (80%) |
| `icons/apple-touch-icon.png` | جديد | 180×180 معتم (متطلب iOS) |
| `.gitignore` | جديد | يستثني `js/demo-config.js` و`node_modules/` و`.DS_Store` |
| `.nojekyll` | جديد | فارغ، لتقديم الملفات كما هي على GitHub Pages |
| `README.md` | جديد | فيه التحذير الأمني |
| `CHANGED.md` | جديد | هذا الملف |
| `SETUP-v1.0.md` | جديد | commits + نشر Pages + اختبار الموبايل + Rollback + نتيجة الاختبار |
| `PROJECT-HANDOFF-v1.0.md` | جديد | دليل التسليم (قرارات معمارية + دَين تقني) |
| `tests/v1-smoke.browser.mjs` | جديد | اختبار دخان بـ Playwright (شُغّل فعليًّا، النتيجة في SETUP) |
| `tests/screenshots/*.png` | جديد | 40 لقطة على 390px (الجدول في SETUP) |

**ليس في الريبو:** `daily_service_v12.html` (نموذج أولي خارج الترقيم، يُحتفظ به خارج الريبو كمرجع للمقارنة).
