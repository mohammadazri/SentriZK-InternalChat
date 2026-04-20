// A1 — Login Rate Limit: HTTP 429 at Max 10 req/min
// Refactored to show raw HTTP telemetry for the rapid-fire flood.
// TRACE: High-fidelity DoS attack logging.

const config = require('../../config');
const { createTracer } = require('../../utils/tracer');

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
    const trace    = createTracer(emit);

    emit({ type: 'ATTACK', msg: `Initiating rapid-fire DoS flood: sending ${TOTAL} requests to /login...` });
    emit({ type: 'LOG',    msg: 'Target: POST /login | Config: 100ms interval | Expect: HTTP 429' });

    for (let i = 1; i <= TOTAL; i++) {
       // We use trace for each individual attack request to show the flood in action
       emit({ type: 'LOG', msg: `--- Flood Request #${i} ---` });
       const r = await trace({
         method: 'post',
         url: `${BASE}/login`,
         data: { username: config.TEST_USER, proof: FAKE_PROOF, publicSignals: ['0', '0', '0', '0'] }
       });
       
       results.push(r.status);
       
       if (r.status === 429) {
         emit({ type: 'RESULT', msg: `>> Request ${i} BLOCKED: HTTP 429 Too Many Requests` });
       }
       
       await new Promise((res) => setTimeout(res, 100));
    }

    const first429 = results.indexOf(429) + 1; // 1-indexed
    const total429 = results.filter((s) => s === 429).length;

    emit({ type: 'RESULT', msg: `\nRate limit audit result:` });
    emit({ type: 'RESULT', msg: `- First block detected at attempt: ${first429 > 0 ? first429 : 'NEVER'}` });
    emit({ type: 'RESULT', msg: `- Total requests rejected by firewall: ${total429}` });

    const rateLimitHit = first429 > 0 && first429 <= 11;
    emit({ type: 'CHECK',  msg: `Firewall triggered correctly (<= 11 requests): ${rateLimitHit ? '✅ YES' : '❌ NO — RATE LIMITING FAILURE'}` });

    emit({ type: 'EXPLAIN', msg: 'The backend uses an Express rate-limiter with a sliding window.' });
    emit({ type: 'EXPLAIN', msg: 'This prevents brute-force attempts from overloading the expensive ZKP validation logic.' });

    const passed = rateLimitHit;
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? `✅ PASS — Rate limit triggered at request ${first429}. Denial of Service (DoS) mitigated.`
        : '❌ FAIL — Backend accepted the entire flood! Server is vulnerable to DoS.',
    });

    return { passed };
  },
};
