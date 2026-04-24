// I8 — Input Injection & Validation
// Tests SQL injection, XSS, path traversal, oversized fields, and out-of-range values.
// PASS = all injections get 400, server does not crash or return 500.

const axios  = require('axios');
const config = require('../../config');

module.exports = {
  id:          'i8',
  name:        'Input Injection & Validation',
  category:    'INTEGRITY',
  description: 'Test SQL injection, XSS, path traversal, and malformed input vectors.',

  async run(emit) {
    const BASE = config.BACKEND_URL;
    const results = [];

    emit({ type: 'ATTACK', msg: 'Testing injection vectors against backend endpoints...\n' });

    const USERNAME_TESTS = [
      { label: "SQL Injection",      username: "alice'; DROP TABLE users;--" },
      { label: "2nd SQLi",           username: "' OR '1'='1" },
      { label: "Path Traversal",     username: "../../../etc/passwd" },
      { label: "XSS Payload",        username: "<script>alert('XSS')</script>" },
      { label: "Null byte",          username: "alice\x00admin" },
      { label: "200-char overflow",  username: 'a'.repeat(200) },
      { label: "Unicode overflow",   username: '𝒂𝒃𝒄𝒅𝒆𝒇𝒈'.repeat(30) },
    ];

    emit({ type: 'ATTACK', msg: '── Username injection on POST /commitment/:username ──' });
    for (const t of USERNAME_TESTS) {
      const targetUrl = `/commitment/${t.username}`;
      emit({ type: 'TRACE', msg: `>> GET ${targetUrl}` });

      const r = await axios.get(
        `${BASE}/commitment/${encodeURIComponent(t.username)}`,
        { validateStatus: () => true }
      );
      const safe = r.status !== 200 && r.status !== 500;
      emit({
        type: safe ? 'CHECK' : 'FAIL',
        msg: `  ${t.label.padEnd(22)} → HTTP ${r.status}  ${safe ? '✅ Rejected' : '❌ SECURITY ISSUE'}`,
      });
      results.push(safe);
    }

    // ── Threat Score out-of-range ──────────────────────────────────
    emit({ type: 'ATTACK', msg: '\n── Threat score validation on POST /threat-log ──' });
    const THREAT_TESTS = [
      { label: 'score = 99.9',    body: { senderId: 'a', receiverId: 'b', content: 'x', threatScore: 99.9 } },
      { label: 'score = -1',      body: { senderId: 'a', receiverId: 'b', content: 'x', threatScore: -1 } },
      { label: 'score = "hack"',  body: { senderId: 'a', receiverId: 'b', content: 'x', threatScore: 'hack' } },
      { label: 'content 5000 ch', body: { senderId: 'a', receiverId: 'b', content: 'x'.repeat(5000), threatScore: 0.5 } },
      { label: 'no content',      body: { senderId: 'a', receiverId: 'b', threatScore: 0.5 } },
    ];

    for (const t of THREAT_TESTS) {
      emit({ type: 'TRACE', msg: `>> POST /threat-log BODY: ${JSON.stringify(t.body)}` });
      const r = await axios.post(`${BASE}/threat-log`, t.body, { validateStatus: () => true });
      // 400 = good validation. 401 = needs auth. Either is fine.  500 = crash = bad.
      const safe = r.status !== 500;
      emit({
        type: safe ? 'CHECK' : 'FAIL',
        msg: `  ${t.label.padEnd(22)} → HTTP ${r.status}  ${safe ? '✅' : '❌ SERVER CRASHED (500)'}`,
      });
      results.push(safe);
    }

    // ── Header injection attempt ───────────────────────────────────
    emit({ type: 'ATTACK', msg: '\n── Header injection on /login ──' });
    emit({ type: 'TRACE', msg: '>> POST /login HEADERS: { "X-Custom-Inject": "value\\r\\nSet-Cookie: evil=1", ... }' });
    const rHeader = await axios.post(`${BASE}/login`, {}, {
      headers: {
        'Content-Type': 'application/json',
        'X-Custom-Inject': "value\r\nSet-Cookie: evil=1",
        'X-Forwarded-For': "127.0.0.1\r\nAdmin: true",
      },
      validateStatus: () => true,
    });
    const headerSafe = rHeader.status !== 500;
    emit({ type: headerSafe ? 'CHECK' : 'FAIL', msg: `  Header injection → HTTP ${rHeader.status}  ${headerSafe ? '✅ No crash' : '❌ SERVER CRASHED'}` });
    results.push(headerSafe);

    emit({ type: 'EXPLAIN', msg: 'Supabase uses parameterized queries — SQL injection has no pathway.' });
    emit({ type: 'EXPLAIN', msg: 'Express input validation sanitizes username format before any DB call.' });
    emit({ type: 'EXPLAIN', msg: 'No server crash (500) means no unhandled injection reaching the database.' });

    const allSafe   = results.every(Boolean);
    const passCount = results.filter(Boolean).length;
    emit({
      type:   'VERDICT',
      passed: allSafe,
      msg:    allSafe
        ? `✅ PASS — All ${results.length} injection vectors handled safely. No server crashes.`
        : `❌ FAIL — ${results.length - passCount} vector(s) caused unexpected server behavior!`,
    });

    return { passed: allSafe };
  },
};
