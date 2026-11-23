'use strict';
/* الخدمة اليومية v1.4 — كاتب ملفات .xlsx صغير بلا مكتبات (لا CDN).
   يكتب ملف OOXML صحيحًا داخل زيب بلا ضغط (store). النصوص تُكتب inlineStr فلا يُفسَّر أي نص كصيغة (لا حقن صيغ).
   الواجهة:
     XlsxLite.build([{ name, rows: [[...], ...], widths: [..], rtl: true }]) → Uint8Array
     XlsxLite.save(fileName, sheets) → يحمّل الملف، وإن تعذّر (آيفون/PWA) يستعمل مشاركة الملف، وإلا يفتح رابطًا. يرجع Promise<'download'|'share'|'open'|'fail'>
   الصف الأول من كل ورقة يُنسَّق كترويسة (غامق + خلفية). الأعمدة: أرقام تُكتب أرقامًا، والباقي نصوصًا. */
var XlsxLite = (function () {
  var enc = new TextEncoder();

  /* ---------- CRC32 ---------- */
  var CRC_T = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
    return t;
  })();
  function crc32(u8) { var c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

  /* ---------- زيب (store) ---------- */
  function u16(v, n) { v.push(n & 255, (n >>> 8) & 255); }
  function u32(v, n) { v.push(n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255); }
  function zip(files) {
    var chunks = [], central = [], offset = 0;
    var DOS_TIME = 0, DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = f.data, crc = crc32(data);
      var h = [];
      u32(h, 0x04034b50); u16(h, 20); u16(h, 0x0800); u16(h, 0); u16(h, DOS_TIME); u16(h, DOS_DATE);
      u32(h, crc); u32(h, data.length); u32(h, data.length); u16(h, name.length); u16(h, 0);
      chunks.push(new Uint8Array(h), name, data);
      var c = [];
      u32(c, 0x02014b50); u16(c, 20); u16(c, 20); u16(c, 0x0800); u16(c, 0); u16(c, DOS_TIME); u16(c, DOS_DATE);
      u32(c, crc); u32(c, data.length); u32(c, data.length); u16(c, name.length); u16(c, 0); u16(c, 0); u16(c, 0); u16(c, 0); u32(c, 0); u32(c, offset);
      central.push(new Uint8Array(c), name);
      offset += h.length + name.length + data.length;
    });
    var cSize = 0; central.forEach(function (x) { cSize += x.length; });
    var end = [];
    u32(end, 0x06054b50); u16(end, 0); u16(end, 0); u16(end, files.length); u16(end, files.length); u32(end, cSize); u32(end, offset); u16(end, 0);
    var all = chunks.concat(central, [new Uint8Array(end)]);
    var total = 0; all.forEach(function (x) { total += x.length; });
    var out = new Uint8Array(total), p = 0;
    all.forEach(function (x) { out.set(x, p); p += x.length; });
    return out;
  }

  /* ---------- XML ---------- */
  function esc(s) {
    return String(s)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')   // محارف ممنوعة في XML
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function colName(i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function safeSheetName(n, used) {
    var s = String(n || 'ورقة').replace(/[\[\]:*?\/\\]/g, ' ').replace(/^'+|'+$/g, '').trim().slice(0, 31) || 'ورقة';
    var base = s, k = 2;
    while (used[s.toLowerCase()]) { var suf = ' ' + k++; s = base.slice(0, 31 - suf.length) + suf; }
    used[s.toLowerCase()] = true;
    return s;
  }
  function sheetXml(sh) {
    var rows = sh.rows || [], maxC = 0;
    rows.forEach(function (r) { if (r.length > maxC) maxC = r.length; });
    var x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
    x += '<sheetViews><sheetView workbookViewId="0"' + (sh.rtl === false ? '' : ' rightToLeft="1"') + '><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>';
    x += '<sheetFormatPr defaultRowHeight="18"/>';
    if (sh.widths && sh.widths.length) {
      x += '<cols>';
      sh.widths.forEach(function (w, i) { x += '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + (Number(w) || 14) + '" customWidth="1"/>'; });
      x += '</cols>';
    }
    x += '<sheetData>';
    rows.forEach(function (r, ri) {
      x += '<row r="' + (ri + 1) + '">';
      for (var ci = 0; ci < r.length; ci++) {
        var v = r[ci];
        if (v === null || v === undefined || v === '') continue;
        var ref = colName(ci) + (ri + 1), st = ri === 0 ? ' s="1"' : '';
        if (typeof v === 'number' && isFinite(v)) x += '<c r="' + ref + '"' + st + '><v>' + v + '</v></c>';
        else x += '<c r="' + ref + '"' + st + ' t="inlineStr"><is><t xml:space="preserve">' + esc(v) + '</t></is></c>';
      }
      x += '</row>';
    });
    x += '</sheetData>';
    if (maxC && rows.length) x += '<autoFilter ref="A1:' + colName(maxC - 1) + rows.length + '"/>';
    x += '<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>';
    return x;
  }
  var STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF1C3A97"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf></cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

  function build(sheets) {
    if (!sheets || !sheets.length) throw new Error('لا توجد أوراق');
    var used = {}, names = sheets.map(function (s) { return safeSheetName(s.name, used); });
    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
    sheets.forEach(function (s, i) { ct += '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; });
    ct += '</Types>';
    var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    var wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>';
    var wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
    names.forEach(function (n, i) {
      wb += '<sheet name="' + esc(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
      wbRels += '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
    });
    wb += '</sheets></workbook>';
    wbRels += '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    var files = [
      { name: '[Content_Types].xml', data: enc.encode(ct) },
      { name: '_rels/.rels', data: enc.encode(rels) },
      { name: 'xl/workbook.xml', data: enc.encode(wb) },
      { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(wbRels) },
      { name: 'xl/styles.xml', data: enc.encode(STYLES) }
    ];
    sheets.forEach(function (s, i) { files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: enc.encode(sheetXml(s)) }); });
    return zip(files);
  }

  var MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  /* تنزيل الملف. في آيفون/PWA قد لا يعمل a[download] فنجرّب مشاركة الملف أولًا حين تكون مدعومة للملفات. */
  function save(fileName, sheets) {
    var bytes = build(sheets);
    var blob = new Blob([bytes], { type: MIME });
    try {
      var file = new File([blob], fileName, { type: MIME });
      var ua = (navigator.userAgent || '');
      var ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (ios && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        return navigator.share({ files: [file], title: fileName }).then(function () { return 'share'; }, function (e) {
          return (e && e.name === 'AbortError') ? 'share' : fallbackDownload(blob, fileName);
        });
      }
    } catch (e) { /* نكمل بالتنزيل العادي */ }
    return Promise.resolve(fallbackDownload(blob, fileName));
  }
  function fallbackDownload(blob, fileName) {
    try {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = fileName; a.style.display = 'none';
      document.body.appendChild(a); a.click();
      setTimeout(function () { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) {} }, 4000);
      return 'download';
    } catch (e) { return 'fail'; }
  }

  return { build: build, save: save, _crc32: crc32 };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = XlsxLite;
