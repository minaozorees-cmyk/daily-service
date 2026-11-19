# SETUP — الخدمة اليومية v1.0

> ## ⚠️ يحتوي على حسابات تجريبية مكشوفة — للاستخدام التجريبي فقط.
> **لا تضع أي بيانات حقيقية في هذا الريبو حتى v1.2.**
> الريبو عام، وكلمات مرور الحسابات التجريبية ظاهرة في `js/app.js`. لا تستعملها في أي مكان آخر.

**ملخص:** أول إصدار في الخط المستقل. تقسيم النموذج الأولي v12 إلى ملفات + هيكل PWA (تثبيت + أوفلاين). **بلا SQL وبلا Supabase.** السلوك والتصميم والنصوص كما في v12.

---

## ١) اللي اتعمل

- تقسيم `daily_service_v12.html` إلى `index.html` و`css/app.css` و`js/app.js`، والتطابق **بالبايت** لـCSS وJS (SHA-256 أدناه).
- هيكل PWA: `manifest.json` و`sw.js` و`js/pwa.js` وأربع أيقونات PNG.
- سطر «الإصدار: v1.0» ظاهر في آخر تبويب «حسابي»، يُقرأ من `APP_VERSION` في `js/version.js`.
- توحيد `theme-color` على `#1c3a97` في `manifest.json` وفي `<meta>`.
- الحسابات التجريبية باقية في `js/app.js` (للجسر فقط، وتُحذف في v1.2). أدوارها `servant` / `admin` / `owner`.
- `.gitignore` فيه `js/demo-config.js`، و`js/demo-config.example.js` مرفوع كمرجع.

## ٢) قرارات فرقت عن الطلب (لازم تعرفها)

1. **عدد الـ`onclick` = 61 موزّعة على ملفين:** 46 في `index.html` و15 داخل سلاسل HTML تُولَّد في `app.js`. كلها كما هي حرفيًّا. (المجموع 61 كما طُلب، لكنه موزّع على ملفين وليس كله داخل `app.js`.)
2. **سطر الإصدار موضعه خارج بطاقة الإعدادات المطوية** (آخر التبويب بعدها) ليكون ظاهرًا دائمًا دون فتح الإعدادات. هو عنصر واحد، فالفروق في `index.html` ما زالت ثلاثة.
3. **التفاف `applyTheme` داخل `js/pwa.js`:** الدالة في `app.js` تُعيد كتابة `<meta theme-color>` إلى `#1e3a8a` في الوضع الفاتح عند كل تطبيق للثيم. ولأن `app.js` يجب أن يبقى مطابقًا بالبايت، يلتف `pwa.js` حولها ليبقى اللون `#1c3a97` (والداكن `#0b1220` كما هو). الاختبار يتحقق منه.
4. **مهلة 5 ثوانٍ في `network-first`** لـ`index.html`: إن كانت الشبكة بطيئة أو متقطعة يعود للنسخة المخزّنة بدل أن يعلق التطبيق عند الفتح. (إضافة منّي على الاستراتيجية المطلوبة؛ تُحذف بسطر واحد إن لم ترغب.)
5. **`clients.claim()` في `activate`** ليخضع أول تحميل للـService Worker فيعمل أوفلاين فورًا بعد أول زيارة. لا علاقة له بـ`skipWaiting` (غير موجود).
6. **`js/demo-config.js` غير محمَّل:** لأنه مُستثنى من الريبو، أي تحميل له سيعطي 404 على Pages. يبقى `demo-config.example.js` مرجعًا لـv1.2، ولا يدخل كاش الـService Worker.

## ٣) إثبات التطابق مع v12

| الملف | الكتلة المصدر في v12 | SHA-256 | النتيجة |
|---|---|---|---|
| `css/app.css` | `<style>` (الأسطر 16–1651) | `d66ed3768a1e6ecb3b81bdc3be69f31f4063b7fdf11c8420cb11f0cadcadbf74` | مطابق بالبايت |
| `js/app.js` | `<script>` (الأسطر 2401–4342) | `6258ff29c0a1a5d5db845437078319540279544aa399af74c134aee44d234f27` | مطابق بالبايت |
| `index.html` | باقي الملف | — | **3 كتل فروق فقط**، انظر `DIFF-v12-to-v1.0-index.html.patch` |

كتل الـdiff الثلاث: **(١)** الـhead، **(٢)** سطر الإصدار، **(٣)** استبدال `<script>` المضمّن بثلاثة سكربتات خارجية. (الـdiff يقارن v12 بعد حذف جسمَي `<style>` و`<script>` فقط، لأنهما ينتقلان لملفين منفصلين.)

## ٤) الملفات

القائمة الكاملة بحالة كل ملف في `CHANGED.md`.

## ٥) جدول Commit

> ارفع **كل الملفات معًا** في commit واحد أو متتابعين قبل تفعيل Pages. لا تعتمد على الترتيب بين الملفات.

| مسار الملف ← | رسالة الـCommit |
|---|---|
| `index.html` | `v1.0: صفحة التطبيق (من v12) + روابط manifest والأيقونات وسطر الإصدار` |
| `css/app.css` | `v1.0: نقل التنسيقات من v12 كما هي (مطابق بالبايت)` |
| `js/app.js` | `v1.0: نقل المنطق من v12 كما هو (مطابق بالبايت)` |
| `js/version.js` | `v1.0: رقم الإصدار APP_VERSION` |
| `js/pwa.js` | `v1.0: تسجيل Service Worker + سطر الإصدار + ثبات لون شريط الحالة` |
| `js/demo-config.example.js` | `v1.0: مرجع إعدادات محلية (غير محمَّل)` |
| `sw.js` | `v1.0: Service Worker (network-first للصفحة، cache-first للأصول، SWR للخطوط)` |
| `manifest.json` | `v1.0: manifest (standalone، RTL، start_url ?source=pwa)` |
| `icons/icon-192.png` | `v1.0: أيقونة 192` |
| `icons/icon-512.png` | `v1.0: أيقونة 512` |
| `icons/maskable-512.png` | `v1.0: أيقونة maskable 512` |
| `icons/apple-touch-icon.png` | `v1.0: أيقونة iOS` |
| `.gitignore` | `v1.0: استثناء js/demo-config.js` |
| `.nojekyll` | `v1.0: تعطيل Jekyll على Pages` |
| `README.md` | `v1.0: README مع تحذير الحسابات التجريبية` |
| `CHANGED.md` | `v1.0: قائمة الملفات` |
| `SETUP-v1.0.md` | `v1.0: دليل النشر والاختبار والرجوع` |
| `PROJECT-HANDOFF-v1.0.md` | `v1.0: دليل التسليم` |
| `tests/v1-smoke.browser.mjs` | `v1.0: اختبار دخان Playwright` |
| `tests/screenshots/*.png` (40 ملف، **اختياري**) | `v1.0: لقطات 390px للمراجعة` — وثائق فقط، يمكن تأجيلها (حجمها نحو 9 ميجا) |

**رفع الملفات من الموبايل:** أنشئ الملفات النصية بـ«Add file → Create new file» وأدخل المسار كاملًا في خانة الاسم (مثل `css/app.css`). للأيقونات: أنشئ أولًا `icons/.gitkeep`، ثم ادخل مجلد `icons` واستعمل «Upload files». الأسهل رفع المجلد كاملًا من كمبيوتر بالسحب والإفلات.

## ٦) نشر GitHub Pages

1. أنشئ ريبو **عامًّا** باسم `daily-service` على حسابك.
2. ارفع الملفات (القسم ٥) إلى الفرع `main`.
3. Settings ← Pages ← Source: **Deploy from a branch** ← Branch: `main` و`/ (root)` ← Save.
4. انتظر دقيقة أو دقيقتين، ثم افتح `https://<اسم-حسابك>.github.io/daily-service/`.
5. تأكد أن `.nojekyll` موجود في الجذر، وأن كل المسارات نسبية (هكذا هي).

## ٧) قائمة تحقق ما بعد النشر (Pages)

- [ ] الرابط يفتح شاشة الدخول بتصميم v12، ولا صفحة 404.
- [ ] `…/daily-service/manifest.json` و`…/daily-service/sw.js` و`…/icons/icon-192.png` تُفتح مباشرة.
- [ ] الدخول بكل من الأدوار الثلاثة يعمل، والخادم لا يرى تبويب «الإدارة».
- [ ] «حسابي» يعرض في آخره «الإصدار: v1.0».
- [ ] (من كمبيوتر) DevTools ← Console بلا أخطاء حمراء ولا 404. DevTools ← Application ← Manifest بلا تحذيرات، والأيقونات الثلاث تظهر.
- [ ] DevTools ← Application ← Service Workers: الحالة `activated` والنطاق `/daily-service/`، وCache Storage فيه `ds-v1.0` و`ds-fonts-v1`.
- [ ] README على GitHub يظهر فيه التحذير الأمني.
- [ ] لم يُرفع أي ملف بيانات حقيقية، ولا `js/demo-config.js`.
- [ ] الخطوط (Amiri · Tajawal · El Messiri) تظهر على الموبايل بعد أول زيارة بنت، ثم تظهر أيضًا بعد قطع الإنترنت وإعادة فتح التطبيق.

## ٨) خطوات تجربة الموبايل (عليك أنت)

1. **أندرويد (Chrome):** افتح الرابط ← قائمة ⋮ ← «تثبيت التطبيق». تأكد: الأيقونة غير مقصوصة، والتطبيق يفتح بدون شريط المتصفح، ولون الشريط العلوي لازوردي.
2. **آيفون (Safari):** مشاركة ← «إضافة إلى الشاشة الرئيسية». تأكد من الأيقونة والفتح بملء الشاشة.
3. افتح التطبيق مرة واحدة بإنترنت، ثم فعّل وضع الطيران وأعد فتحه من الأيقونة: يجب أن يفتح ويعمل.
4. جرّب: الدخول، إتمام مهمة، مسابقة، مشاركة، الوضع الليلي (لون الشريط العلوي يتغير)، حجم الخط، تسجيل الخروج.
5. تذكّر: **كل جهاز له بياناته** في هذه النسخة (متوقع، وتُحل في v1.2).

## ٩) الرجوع (Rollback)

- v1.0 أول إصدار: الرجوع = تعطيل Pages (Settings ← Pages ← None) أو حذف الريبو. لا بيانات على سيرفر، ولا SQL.
- على جهاز ثبّت التطبيق: احذف الأيقونة، ثم امسح بيانات الموقع لإزالة الـService Worker والكاش.
- **تنبيه للإصدارات القادمة:** لأن CSS وJS تُقدَّم بـcache-first، **أي تعديل عليهما لا يصل للأجهزة إلا بتغيير `VERSION` في `sw.js`** (وفي `js/version.js`). الرجوع لإصدار سابق يحتاج أيضًا رفع `VERSION` أعلى (لا أقل).

## ١٠) تقرير الاختبار — نتيجة فعلية

**نُفّذ آليًّا في بيئة Claude** بالأمر `node tests/v1-smoke.browser.mjs` (مع `V12=` لفحص البايت)، Playwright + Chromium على 390×844، Node 22:

> **PASS=76 · FAIL=0 · INFO=4 · SKIP=0** — الخروج برمز 0 — 40 لقطة.

(احتاج التشغيل ثلاث محاولات: الأولى توقفت عند أزرار حجم الخط لأنها داخل قسم الإعدادات المطوي، والثانية فشلت في فحصين بسبب خطأ في كود الاختبار نفسه، لا في التطبيق. صُحّح الاختبار وجاءت الثالثة كاملة. ونقلت سطر الإصدار خارج الإعدادات المطوية بين المحاولتين.)

**ما غطّاه الاختبار:**
- الملفات: التطابق بالبايت (CSS وJS)، 61 onclick، `theme-color`، المانيفست (`start_url`/`scope`/الأيقونات)، أربع PNG فعلية، `sw.js` (VERSION وبلا `skipWaiting`)، `.gitignore` ومرجع الإعدادات.
- الأدوار الثلاثة: الدخول، التبويبات، الوضعان الفاتح والداكن، `theme-color` في كل وضع، لا تمرير أفقي، لوحات الإدارة (5 للمسؤول، 7 للمالك)، وإخفاء تبويب «الإدارة» عن الخادم.
- رحلة خادم: المهام الأربع (+ حفظها بعد إعادة التحميل)، القراءة (كتاب مقدس وأجبية)، المسابقة (أول محاولة فقط + المراجعة)، المشاركات (نشر عام وخاص، فلتر، تعديل، حذف)، حجم الخط والوضع الليلي بعد إعادة التحميل، تسجيل الخروج، إنشاء حساب جديد والدخول به.
- PWA على localhost تحت `/daily-service/`: تسجيل الـService Worker وتفعيله، كاش `ds-v1.0` بكل الملفات، وفتح `./?source=pwa` وإعادة التحميل والدخول **بدون شبكة**.
- الـconsole: صفر أخطاء وصفر 404 (باستثناء طلبات الخطوط).

**ما لم يُختبر (وعليك أو للإصدارات التالية):**
- **أجهزة حقيقية:** التثبيت على أندرويد وآيفون، سلوك iOS/Safari (الـService Worker، الأيقونة، لون الشريط).
- **النشر على GitHub Pages الفعلي** (الاختبار على خادم محلي بنفس المسار فقط).
- **الخطوط الحقيقية:** بيئة الاختبار لا تصل إلى Google Fonts، فاللقطات بخطوط بديلة (Cairo ثم خط النظام) وليست El Messiri/Tajawal/Amiri، وشكلها على جهازك قد يختلف قليلًا. واستراتيجية stale-while-revalidate للخطوط اختُبرت **بردّ تجريبي بديل** (مدخل واحد في `ds-fonts-v1`)، لا بملفات الخطوط الحقيقية.
- مسار **تحديث** الـService Worker (من نسخة لأخرى)، لأنه لا توجد نسخة ثانية بعد.
- الأداء والبطارية على أجهزة قديمة، و`prefers-reduced-motion`.
- التقاط الشاشة كان `fullPage`، فيظهر الشريط السفلي (ثابت الموضع) في منتصف اللقطات الطويلة؛ هذا أثر التصوير وليس عيبًا في الواجهة.

**ملاحظات INFO (لا تُفشل):**
- استدعاء `switchTab('admin')` من وحدة التحكم لحساب خادم **يفتح** التبويب؛ حماية «الإدارة» في v12 على مستوى الواجهة فقط (الزر مخفي). الحماية الحقيقية = RLS في v1.1.
- لوحات الإدارة الظاهرة: المسؤول خمس، المالك سبع.

### جدول اللقطات (تبويب × دور) — `tests/screenshots/`

| التبويب | خادم (فاتح) | خادم (داكن) | مسؤول (فاتح) | مسؤول (داكن) | مالك (فاتح) | مالك (داكن) |
|---|---|---|---|---|---|---|
| اليوم | `servant-today-light.png` | `servant-today-dark.png` | `admin-today-light.png` | `admin-today-dark.png` | `owner-today-light.png` | `owner-today-dark.png` |
| المسابقة | `servant-contest-light.png` | `servant-contest-dark.png` | `admin-contest-light.png` | `admin-contest-dark.png` | `owner-contest-light.png` | `owner-contest-dark.png` |
| المشاركات | `servant-posts-light.png` | `servant-posts-dark.png` | `admin-posts-light.png` | `admin-posts-dark.png` | `owner-posts-light.png` | `owner-posts-dark.png` |
| حسابي | `servant-profile-light.png` | `servant-profile-dark.png` | `admin-profile-light.png` | `admin-profile-dark.png` | `owner-profile-light.png` | `owner-profile-dark.png` |
| الإدارة | — | — | `admin-admin-light.png` | `admin-admin-dark.png` | `owner-admin-light.png` | `owner-admin-dark.png` |

لقطات إضافية (لوحات الإدارة وشاشات فرعية):

| الدور | الشاشة | الثيم | الملف |
|---|---|---|---|
| admin | admin/tracking | فاتح | `admin-admin-tracking-light.png` |
| admin | admin/live | فاتح | `admin-admin-live-light.png` |
| owner | admin/plan | فاتح | `owner-admin-plan-light.png` |
| owner | admin/schedule | فاتح | `owner-admin-schedule-light.png` |
| owner | admin/tracking | فاتح | `owner-admin-tracking-light.png` |
| owner | admin/live | فاتح | `owner-admin-live-light.png` |
| owner | admin/moderation | فاتح | `owner-admin-moderation-light.png` |
| owner | admin/accounts | فاتح | `owner-admin-accounts-light.png` |
| owner | admin/json | فاتح | `owner-admin-json-light.png` |
| servant | today/reading | فاتح | `servant-reading-bible-light.png` |
| servant | contest (مراجعة) | فاتح | `servant-contest-review-light.png` |
| servant | posts (بعد النشر) | فاتح | `servant-posts-after-light.png` |
