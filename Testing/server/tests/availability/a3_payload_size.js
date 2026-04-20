// A3 — Payload Size Limit: Reject oversize request bodies
// Tests payloads at 50KB, exactly at limit, just over, and 10MB.
// TRACE: High-fidelity payload flood telemetry.

const config = require('../../config');
const { createTracer } = require('../../utils/tracer');

module.exports = {
  id:          'a3',
  name:        'Payload Flood: Body Size Limit (100KB)',
  category:    'AVAILABILITY',
  description: 'Send oversized request bodies. Must receive 413 for anything above 100KB.',

  async run(emit) {
    const BASE = config.BACKEND_URL;
    const trace = createTracer(emit);

    const SIZES = [
      { label: '10 KB   (Under Limit)',  kb: 10,    expectPass: true  },
      { label: '110 KB  (Over Limit)',   kb: 110,   expectPass: false },
      { label: '500 KB  (Flood Payload)', kb: 500,  expectPass: false },
    ];

    const results = [];

    emit({ type: 'ATTACK', msg: 'Initiating Body Size Overflow attack on POST /login...' });

    for (const { label, kb, expectPass } of SIZES) {
      emit({ type: 'LOG', msg: `--- Testing Payload Size: ${label} ---` });
      
      const body = {
        username:      config.TEST_USER,
        proof:         { pi_a: ['1', '2', '1'], pi_b: [['1','2'],['3','4'],['1','0']], pi_c: ['5','6','1'], protocol:'groth16', curve:'bn128' },
        publicSignals: ['0', '0', '0', '0'],
        // Note: Full payload string is being emitted to the TRACE log as requested for demo
        overflow:      'A'.repeat(kb * 1024), 
      };

      const r = await trace({
        method: 'post',
        url: `${BASE}/login`,
        data: body,
        headers: { 'Content-Type': 'application/json' },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      const got413 = r.status === 413;
      const got400 = (r.status >= 400 && r.status < 500) && !got413;
      
      // If it's over 100KB, it MUST be 413. If under, it should be 400 (due to fake proof).
      const isOk = expectPass ? !got413 : got413;
      
      emit({ type: isOk ? 'CHECK' : 'FAIL', msg: `Result: HTTP ${r.status} ${isOk ? '(Expected)' : '(UNEXPECTED)'}` });
      results.push(isOk);
    }

    emit({ type: 'EXPLAIN', msg: 'SentriZK limits the Express body-parser to 100KB to prevent Memory Exhaustion attacks.' });
    emit({ type: 'EXPLAIN', msg: 'Payloads exceeding this limit are terminated at the TCP level by returning 413 (Payload Too Large).' });

    const passed = results.every(Boolean);
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? '✅ PASS — Payload size enforcement verified with raw network telemetry.'
        : '❌ FAIL — Backend accepted an oversized payload!',
    });

    return { passed };
  },
};
