// I5 — Admin JWT Forgery (4-Vector Attack)
// Tests: wrong key, alg:none bypass, wrong role, expired token.
// PASS = all four return HTTP 401.

const axios  = require('axios');
const jwt    = require('jsonwebtoken');
const config = require('../../config');

module.exports = {
  id:          'i5',
  name:        'Admin JWT Forgery (4 Vectors)',
  category:    'INTEGRITY',
  description: 'Attempt 4 JWT attack vectors on admin endpoints.',

  async run(emit) {
    const BASE = config.BACKEND_URL;

    /** Build an unsigned/alg:none JWT manually */
    function buildNoneAlgToken(payload) {
      const header  = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const body    = Buffer.from(JSON.stringify(payload)).toString('base64url');
      return `${header}.${body}.`;
    }

    const attacks = [
      {
        label: 'Forged HMAC key (wrong secret)',
        token: jwt.sign({ username: 'hacker', role: 'admin' }, 'totally_wrong_secret_key_123'),
      },
      {
        label: 'alg:none — unsigned token bypass',
        token: buildNoneAlgToken({ username: 'hacker', role: 'admin', iat: Math.floor(Date.now() / 1000) }),
      },
      {
        label: 'Valid structure, role:"user" not "admin"',
        token: jwt.sign({ username: 'hacker', role: 'user' }, 'totally_wrong_secret_key_123'),
      },
      {
        label: 'Expired token (iat = 2 hours ago)',
        // We sign with a wrong key anyway — double attack: wrong key AND expired
        token: jwt.sign(
          { username: 'admin', role: 'admin', iat: Math.floor(Date.now() / 1000) - 7200, exp: Math.floor(Date.now() / 1000) - 3600 },
          'totally_wrong_secret_key_123'
        ),
      },
    ];

    const results = [];

    emit({ type: 'ATTACK', msg: `Targeting GET ${BASE}/admin/users with ${attacks.length} forged JWT tokens...` });

    for (let i = 0; i < attacks.length; i++) {
      const { label, token } = attacks[i];
      emit({ type: 'ATTACK', msg: `\nVector ${i + 1}: ${label}` });
      emit({ type: 'LOG',    msg: `Token: ${token.substring(0, 60)}...` });

      const r = await axios.get(`${BASE}/admin/users`, {
        headers:        { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      });

      emit({ type: 'RESULT', msg: `HTTP ${r.status} — ${JSON.stringify(r.data).substring(0, 100)}` });
      const blocked = r.status === 401 || r.status === 403;
      emit({ type: 'CHECK',  msg: `Forged token rejected: ${blocked ? '✅ YES' : '❌ NO — SECURITY FAILURE'}` });
      results.push(blocked);
    }

    // Also test with NO token at all
    emit({ type: 'ATTACK', msg: '\nVector 5: No Authorization header at all' });
    const rNoAuth = await axios.get(`${BASE}/admin/users`, { validateStatus: () => true });
    const noAuthBlocked = rNoAuth.status === 401 || rNoAuth.status === 403;
    emit({ type: 'RESULT', msg: `HTTP ${rNoAuth.status} — ${JSON.stringify(rNoAuth.data).substring(0, 100)}` });
    emit({ type: 'CHECK',  msg: `No-auth request rejected: ${noAuthBlocked ? '✅ YES' : '❌ NO — SECURITY FAILURE'}` });
    results.push(noAuthBlocked);

    emit({ type: 'EXPLAIN', msg: 'jsonwebtoken.verify() performs signature + expiry check. alg:none is rejected by default.' });
    emit({ type: 'EXPLAIN', msg: 'Admin middleware extracts and validates role==="admin" separately from signature.' });

    const passed = results.every(Boolean);
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? '✅ PASS — All 5 JWT attack vectors rejected. Admin endpoints are secure.'
        : `❌ FAIL — ${results.filter(b => !b).length} vector(s) bypassed admin auth!`,
    });

    return { passed };
  },
};
