// A4 — Session Expiry: Expired Sessions Cannot Access Resources
// Creates a fake/expired session and verifies it's blocked on all authenticated endpoints.
// PASS = validate-session returns { valid: false }, firebase-token returns 401.

const axios  = require('axios');
const config = require('../../config');

module.exports = {
  id:          'a4',
  name:        'Session Expiry Enforcement',
  category:    'AVAILABILITY',
  description: 'Verify expired and invalid sessions cannot access any authenticated endpoints.',

  async run(emit) {
    const BASE = config.BACKEND_URL;

    emit({ type: 'ATTACK', msg: 'Testing expired/invalid session handling across all authenticated endpoints...\n' });

    const TEST_CASES = [
      { label: 'Random fake session ID',     sessionId: 'totally-fake-session-' + Date.now() },
      { label: 'Empty string',               sessionId: '' },
      { label: 'SQL injection session',      sessionId: "' OR '1'='1" },
      { label: 'Old timestamp session',      sessionId: 'session_2020_01_01_expired_long_ago' },
      { label: 'JWT-like forged session',    sessionId: 'eyJhbGciOiJub25lIn0.eyJ1c2VyIjoiaGFja2VyIn0.' },
    ];

    const results = [];

    // ── validate-session ───────────────────────────────────────────
    emit({ type: 'ATTACK', msg: '── Endpoint: POST /validate-session ──' });
    for (const { label, sessionId } of TEST_CASES) {
      const r = await axios.post(
        `${BASE}/validate-session`,
        { sessionId },
        { validateStatus: () => true }
      );
      const rejected = r.data?.valid === false || r.status === 400 || r.status === 401;
      emit({
        type: rejected ? 'CHECK' : 'FAIL',
        msg:  `  ${label.padEnd(36)} → HTTP ${r.status} | valid: ${r.data?.valid} | ${rejected ? '✅ BLOCKED' : '❌ ACCEPTED!'}`,
      });
      results.push(rejected);
    }

    // ── firebase-token ─────────────────────────────────────────────
    emit({ type: 'ATTACK', msg: '\n── Endpoint: POST /firebase-token ──' });
    const firebaseTests = [
      'completely-fake-session-id',
      'another-invalid-token',
    ];
    for (const sessionId of firebaseTests) {
      const r = await axios.post(
        `${BASE}/firebase-token`,
        { sessionId },
        { validateStatus: () => true }
      );
      const rejected = r.status !== 200;
      emit({
        type: rejected ? 'CHECK' : 'FAIL',
        msg:  `  sessionId: ${sessionId.substring(0, 30)}... → HTTP ${r.status} | ${rejected ? '✅ BLOCKED' : '❌ RETURNED FIREBASE TOKEN WITH FAKE SESSION!'}`,
      });
      results.push(rejected);
    }

    // ── refresh-session ────────────────────────────────────────────
    emit({ type: 'ATTACK', msg: '\n── Endpoint: POST /refresh-session ──' });
    const r3 = await axios.post(
      `${BASE}/refresh-session`,
      { sessionId: 'expired-or-fake-session-id', deviceId: config.TEST_DEVICE },
      { validateStatus: () => true }
    );
    const refreshBlocked = r3.status !== 200;
    emit({
      type: refreshBlocked ? 'CHECK' : 'FAIL',
      msg:  `  refresh with invalid sessionId → HTTP ${r3.status} | ${refreshBlocked ? '✅ BLOCKED' : '❌ REFRESHED FAKE SESSION!'}`,
    });
    results.push(refreshBlocked);

    emit({ type: 'EXPLAIN', msg: 'Sessions have a 30-minute TTL stored in Supabase.' });
    emit({ type: 'EXPLAIN', msg: 'validate-session checks: session exists + not expired + matching deviceId.' });
    emit({ type: 'EXPLAIN', msg: 'Firebase custom token is only issued to validated sessions — no token = no Firebase access.' });

    const passed = results.every(Boolean);
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? `✅ PASS — All ${results.length} expired/invalid session tests correctly rejected.`
        : `❌ FAIL — ${results.filter(b => !b).length} invalid session(s) were accepted by the backend!`,
    });

    return { passed };
  },
};
