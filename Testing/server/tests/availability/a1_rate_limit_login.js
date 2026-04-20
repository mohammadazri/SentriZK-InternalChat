// A1 — Login Rate Limit: HTTP 429 at Max 10 req/min
// Sends 15 rapid POST /login requests with a fake proof.
// PASS = server returns 429 at or before request 11.

const axios  = require('axios');
const config = require('../../config');

const FAKE_PROOF = {
  pi_a: ['1', '2', '1'],
  pi_b: [['1', '2'], ['3', '4'], ['1', '0']],
  pi_c: ['5', '6', '1'],
  protocol: 'groth16',
  curve: 'bn128',
};

module.exports = {
  id:          'a1',
  name:        'Rate Limit: Login Brute Force (10/min)',
  category:    'AVAILABILITY',
  description: 'Flood POST /login at 10 req/s. Server must return 429 within first 11 requests.',

  async run(emit) {
    const BASE     = config.BACKEND_URL;
    const TOTAL    = 16;
    const results  = [];

    emit({ type: 'ATTACK', msg: `Sending ${TOTAL} rapid POST /login requests (100ms apart) with invalid proof...` });
    emit({ type: 'LOG',    msg: 'Rate limit window: 60s | Max allowed: 10 per IP' });

    for (let i = 1; i <= TOTAL; i++) {
      const r = await axios.post(
        `${BASE}/login`,
        { username: config.TEST_USER, proof: FAKE_PROOF, publicSignals: ['0', '0', '0', '0'] },
        { validateStatus: () => true }
      );
      results.push(r.status);
      const icon = r.status === 429 ? '🚫 429' : r.status === 400 ? '✅ 400' : `⚠️  ${r.status}`;
      emit({ type: r.status === 429 ? 'RESULT' : 'LOG', msg: `  Request ${String(i).padStart(2)}  →  ${icon}` });
      await new Promise((res) => setTimeout(res, 100));
    }

    const first429 = results.indexOf(429) + 1; // 1-indexed
    const total429 = results.filter((s) => s === 429).length;

    emit({ type: 'RESULT', msg: `\nFirst 429 at request: ${first429 > 0 ? first429 : 'never'}` });
    emit({ type: 'RESULT', msg: `Total 429 responses: ${total429}` });

    const rateLimitHit = first429 > 0 && first429 <= 11;
    emit({ type: 'CHECK',  msg: `Rate limit triggered at or before request 11: ${rateLimitHit ? '✅ YES' : '❌ NO — No rate limiting!'}` });

    emit({ type: 'EXPLAIN', msg: 'Rate limiter window: 60s, max 10 login attempts per IP.' });
    emit({ type: 'EXPLAIN', msg: 'Bonus: ZKP proof generation costs ~2.5s on device — real attacker top speed: ~24 attempts/min (still blocked).' });
    emit({ type: 'EXPLAIN', msg: 'Combined: rate limit + ZKP cost makes brute force computationally and temporally infeasible.' });

    const passed = rateLimitHit;
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? `✅ PASS — Rate limit triggered at request ${first429}. Login brute force attack blocked.`
        : '❌ FAIL — 429 not received! Rate limiting is not working.',
    });

    return { passed };
  },
};
