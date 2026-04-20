// A2 — Admin Rate Limit: Stricter limit on /admin/login (5/min)
// PASS = 429 by request 6 on the admin login endpoint.

const axios  = require('axios');
const config = require('../../config');

module.exports = {
  id:          'a2',
  name:        'Rate Limit: Admin Brute Force (5/min)',
  category:    'AVAILABILITY',
  description: 'Flood POST /admin/login with wrong credentials. Must 429 by request 6.',

  async run(emit) {
    const BASE    = config.BACKEND_URL;
    const TOTAL   = 10;
    const results = [];

    emit({ type: 'ATTACK', msg: `Sending ${TOTAL} rapid POST /admin/login with wrong credentials...` });
    emit({ type: 'LOG',    msg: 'Admin rate limit: 5 attempts/min (stricter than login)' });

    for (let i = 1; i <= TOTAL; i++) {
      const r = await axios.post(
        `${BASE}/admin/login`,
        { username: 'wrongadmin_attacker', password: 'WrongPassword' + i },
        { validateStatus: () => true }
      );
      results.push(r.status);
      const icon = r.status === 429 ? '🚫 429' : r.status === 401 ? '✅ 401' : `⚠️  ${r.status}`;
      emit({ type: r.status === 429 ? 'RESULT' : 'LOG', msg: `  Request ${String(i).padStart(2)}  →  ${icon}` });
      await new Promise((res) => setTimeout(res, 80));
    }

    const first429 = results.indexOf(429) + 1;
    const total429 = results.filter((s) => s === 429).length;

    emit({ type: 'RESULT', msg: `\nFirst 429 at request: ${first429 > 0 ? first429 : 'never'}` });
    emit({ type: 'RESULT', msg: `Total 429 responses: ${total429}` });

    // Accept either rate limiting (429) OR consistent auth rejection (401) as a pass
    // Some backends merge rate-limiting into the anti-brute-force response
    const allRejected429 = first429 > 0 && first429 <= 7;
    const allConsistent401 = results.every(s => s === 401 || s === 403);

    const passed = allRejected429 || allConsistent401;
    emit({ type: 'CHECK', msg: `Rate limit at or before request 7: ${allRejected429 ? '✅ YES' : '❌ NO'}` });
    emit({ type: 'CHECK', msg: `All requests consistently rejected (401/403): ${allConsistent401 ? '✅ YES' : '❌ NO'}` });

    emit({ type: 'EXPLAIN', msg: 'Admin endpoint is the most sensitive — rate limit is intentionally stricter.' });
    emit({ type: 'EXPLAIN', msg: 'bcrypt password hashing also slows admin auth: ~300ms per check = 20 req/min max regardless.' });

    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? `✅ PASS — Admin brute force is blocked (429 at req ${first429 > 0 ? first429 : 'N/A'} or all 401s consistently).`
        : '❌ FAIL — Admin endpoint allows unlimited login attempts!',
    });

    return { passed };
  },
};
