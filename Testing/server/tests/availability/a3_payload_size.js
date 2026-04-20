// A3 — Payload Size Limit: Reject oversize request bodies
// Tests payloads at 50KB, exactly at limit, just over, and 10MB.
// PASS = bodies above 100KB return 413 Payload Too Large.

const axios  = require('axios');
const config = require('../../config');

module.exports = {
  id:          'a3',
  name:        'Payload Flood: Body Size Limit (100KB)',
  category:    'AVAILABILITY',
  description: 'Send oversized request bodies. Must receive 413 for anything above 100KB.',

  async run(emit) {
    const BASE = config.BACKEND_URL;

    const SIZES = [
      { label: '10 KB   (valid — under limit)',  kb: 10,    expectPass: true  },
      { label: '50 KB   (valid — under limit)',  kb: 50,    expectPass: true  },
      { label: '99 KB   (just under limit)',     kb: 99,    expectPass: true  },
      { label: '110 KB  (over limit → 413)',     kb: 110,   expectPass: false },
      { label: '1 MB    (way over → 413)',       kb: 1024,  expectPass: false },
      { label: '10 MB   (DoS attempt → 413)',    kb: 10240, expectPass: false },
    ];

    const results = [];

    emit({ type: 'ATTACK', msg: 'Sending payloads of increasing size to POST /login...\n' });

    for (const { label, kb, expectPass } of SIZES) {
      const body = JSON.stringify({
        username:     config.TEST_USER,
        proof:        { pi_a: ['1', '2', '1'], pi_b: [['1','2'],['3','4'],['1','0']], pi_c: ['5','6','1'], protocol:'groth16', curve:'bn128' },
        publicSignals: ['0', '0', '0', '0'],
        padding:      'A'.repeat(kb * 1024), // inflate body
      });

      const r = await axios.post(`${BASE}/login`, body, {
        headers:        { 'Content-Type': 'application/json' },
        maxBodyLength:  Infinity,
        maxContentLength: Infinity,
        validateStatus: () => true,
      });

      const got413   = r.status === 413;
      const got400   = r.status === 400 || r.status === 422;
      const isOk     = expectPass ? (got400 || got413 === false) : got413;
      const icon     = r.status === 413 ? '🚫 413' : `  ${r.status}`;

      emit({
        type: isOk ? 'CHECK' : 'FAIL',
        msg:  `  ${label.padEnd(38)} → HTTP ${icon}  ${isOk ? '✅' : `❌ Expected: ${expectPass ? '4xx' : '413'}`}`,
      });
      results.push(isOk);
    }

    emit({ type: 'EXPLAIN', msg: 'bodyParser limit is set in Express middleware (100KB cap).' });
    emit({ type: 'EXPLAIN', msg: 'Without size limits: an attacker can exhaust server memory with a single request.' });
    emit({ type: 'EXPLAIN', msg: 'Returning 413 immediately drops the connection — minimal resource consumption on server.' });

    const passed = results.every(Boolean);
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? '✅ PASS — Payload size limits enforced. 10 MB DoS request rejected with 413.'
        : `❌ FAIL — ${results.filter(b => !b).length} size test(s) returned unexpected responses!`,
    });

    return { passed };
  },
};
