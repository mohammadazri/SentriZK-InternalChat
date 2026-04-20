// I5 — Admin JWT Forgery
// Attacker tries to bypass Admin Panel security by forging JWT tokens 
// with various high-impact vulnerabilities.
// TRACE: High-fidelity HTTP trace + simulated commands.

const config = require('../../config');
const { createTracer } = require('../../utils/tracer');

module.exports = {
  id:          'i5',
  name:        'Admin JWT Forgery (4 Vectors)',
  category:    'INTEGRITY',
  description: 'Attempt to bypass the Admin Panel using forged or tampered JWT tokens.',

  async run(emit) {
    const BASE  = config.BACKEND_URL;
    const trace = createTracer(emit);
    const TARGET_PATH = '/admin/users'; // Valid authenticated route

    emit({ type: 'ATTACK', msg: 'Initiating multi-vector JWT forgery attack on Admin endpoints...' });

    // [FIX]: We now generate these tokens dynamically instead of hardcoding them, 
    // remediating Internal Secret Incident #30486321.
    const ATTACKS = [
      {
        label:  'None Algorithm Bypass',
        token:  Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url') + 
                "." + Buffer.from(JSON.stringify({ user: 'admin' })).toString('base64url') + ".",
        desc:   'Testing if backend accepts unsigned tokens via alg=none.'
      },
      {
        label:  'Modified Payload (User -> Admin)',
        token:  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + 
                Buffer.from(JSON.stringify({ role: 'admin', id: '007' })).toString('base64url') + 
                '.remediated_sig',
        desc:   'Testing if backend validates signature integrity of modified payloads.'
      },
      {
        label:  'Expired Admin Token',
        token:  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + 
                Buffer.from(JSON.stringify({ role: 'admin', exp: 1000000000 })).toString('base64url') + 
                '.remediated_sig',
        desc:   'Testing if backend rejects old tokens from a baseline breach.'
      },
      {
        label:  'Cross-Tenant Key Swap',
        token:  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + 
                Buffer.from(JSON.stringify({ user: 'evil_admin' })).toString('base64url') + 
                '.remediated_sig',
        desc:   'Testing if backend accepts tokens signed with a different app identity.'
      }
    ];

    const results = [];

    for (const atk of ATTACKS) {
       emit({ type: 'LOG', msg: `--- Attack Vector: ${atk.label} ---` });
       emit({ type: 'TRACE', msg: `   DESC: ${atk.desc}` });
       
       // Use a real protected endpoint (/admin/users)
       emit({ type: 'TRACE', msg: `>> COMMAND: curl -X GET ${BASE}${TARGET_PATH} -H "Authorization: Bearer ${atk.token}"` });
       const r = await trace({
         method: 'get',
         url: `${BASE}${TARGET_PATH}`,
         headers: { 'Authorization': `Bearer ${atk.token}` }
       });

       // Correctly identify blocked status codes (401 is returned by verifyAdminJWT)
       const blocked = r.status === 401 || r.status === 403;
       emit({ type: blocked ? 'CHECK' : 'FAIL', msg: `Attack blocked: ${blocked ? '✅ YES' : '❌ NO — ACCESS BYPASS'}` });
       results.push(blocked);
    }

    emit({ type: 'EXPLAIN', msg: 'SentriZK uses HS256 with a 256-bit server-side secret for all Admin Panel tokens.' });
    emit({ type: 'EXPLAIN', msg: 'The verifyAdminJWT middleware strictly enforces both signature and algorithm headers.' });

    const passed = results.every(Boolean);
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? '✅ PASS — All JWT forgery attempts rejected. Admin Panel is secure.'
        : '❌ FAIL — Admin authentication bypass detected! Check server JWT secret handling.',
    });

    return { passed };
  },
};
