'use strict';
/* الخدمة اليومية v1.1 — عميل Supabase صغير بـ fetch (بدون مكتبات) */
const Supa = (function () {
  const cfg = window.DS_CONFIG || {};
  const base = String(cfg.SUPABASE_URL || '').replace(/\/+$/, '');
  const apiKey = String(cfg.SUPABASE_ANON_KEY || '');
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(base) && apiKey.length > 20;
  const TIMEOUT_MS = 12000;

  function normError(d, status) {
    d = (d && typeof d === 'object') ? d : {};
    return {
      status: status,
      code: String(d.error_code || d.code || d.error || ''),
      message: String(d.msg || d.message || d.error_description || d.hint || '')
    };
  }

  /* يرجع دائمًا كائنًا: { ok, status, data, error, offline, config } ولا يرمي استثناء */
  async function request(method, path, opts) {
    opts = opts || {};
    if (!configured) return { ok: false, status: 0, config: true, error: { message: 'config', code: 'config' } };
    const headers = { apikey: apiKey, 'Content-Type': 'application/json' };
    if (opts.token) headers.Authorization = 'Bearer ' + opts.token;
    else if (!apiKey.startsWith('sb_')) headers.Authorization = 'Bearer ' + apiKey;
    const ctl = new AbortController();
    const timer = setTimeout(function () { ctl.abort(); }, TIMEOUT_MS);
    try {
      const res = await fetch(base + path, {
        method: method,
        headers: headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: ctl.signal
      });
      let data = null;
      const text = await res.text();
      if (text) { try { data = JSON.parse(text); } catch (e) { data = text; } }
      if (!res.ok) return { ok: false, status: res.status, data: data, error: normError(data, res.status) };
      return { ok: true, status: res.status, data: data };
    } catch (e) {
      return { ok: false, status: 0, offline: true, error: { message: 'network', code: 'network' } };
    } finally {
      clearTimeout(timer);
    }
  }

  return { configured: configured, request: request };
})();
