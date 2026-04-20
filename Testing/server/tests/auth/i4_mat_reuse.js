// I4 — Redirect Token Single-Use Enforcement
// This test verifies that the one-time token issued after a successful ZKP login 
// is invalidated immediately after its first use.
// TRACE: High-fidelity HTTP logging enabled.

const path    = require('path');
const config  = require('../../config');
const { createTracer } = require('../../utils/tracer');

module.exports = {
  id:          'i4',
  name:        'Redirect Token Single-Use',
  category:    'INTEGRITY',
  description: 'Steal and replay a Login Redirect Token. Must be burned on first use.',

  async run(emit) {
    const BASE    = config.BACKEND_URL;
    const snarkjs = require('snarkjs');
    const trace   = createTracer(emit);

    emit({ type: 'ATTACK', msg: `Step 1: Logging in as "${config.TEST_USER}" to get a real Redirect Token...` });

    let redirectToken;
    try {
      // 1. Fetch Nonce
      emit({ type: 'TRACE', msg: `>> COMMAND: curl -X GET ${BASE}/commitment/${config.TEST_USER}` });
      const nRes = await trace({ method: 'get', url: `${BASE}/commitment/${config.TEST_USER}` });
      if (nRes.status !== 200) throw new Error(`Could not fetch nonce: HTTP ${nRes.status}`);
      const { commitment, nonce } = nRes.data;

      // 2. Generate Login Proof (Real ZKP)
      emit({ type: 'LOG', msg: 'Generating Groth16 proof (this may take 1-2 seconds local CPU time)...' });
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        { 
          secret: config.TEST_SECRET, 
          salt: config.TEST_SALT, 
          unameHash: config.TEST_UNAME_HASH,
          storedCommitment: String(commitment),
          nonce: String(nonce)
        },
        config.LOGIN_WASM,
        config.LOGIN_ZKEY
      );

      // 3. Submit Login
      emit({ type: 'TRACE', msg: `>> COMMAND: curl -X POST ${BASE}/login -d '{"username":"${config.TEST_USER}","proof":{...}}'` });
      const loginRes = await trace({
        method: 'post',
        url: `${BASE}/login`,
        data: { username: config.TEST_USER, proof, publicSignals }
      });

      if (loginRes.status !== 200) throw new Error(`Login rejected: HTTP ${loginRes.status}`);
      redirectToken = loginRes.data.token;
      
      emit({ type: 'RESULT', msg: `Login Success. Redirect Token secured: ${redirectToken.substring(0, 12)}...` });
    } catch (err) {
      emit({ type: 'ERROR', msg: `Attack setup failed: ${err.message}` });
      emit({ type: 'VERDICT', passed: false, msg: '❌ FAIL — Could not perform ZKP login.' });
      return { passed: false };
    }

    // ── Simulate deep-link usage (First Use) ─────────────────────
    emit({ type: 'ATTACK', msg: `Step 2: Simulating legitimate mobile app landing (First Use)...` });
    emit({ type: 'TRACE', msg: `>> COMMAND: curl ${BASE}/validate-token?token=${redirectToken}&device=${config.TEST_DEVICE}` });
    const r1 = await trace({ 
      method: 'get', 
      url: `${BASE}/validate-token?token=${redirectToken}&device=${config.TEST_DEVICE}` 
    });
    
    const firstOk = r1.status === 200 && r1.data.valid === true;
    emit({ type: 'CHECK', msg: `First validation succeeded (Burned): ${firstOk ? '✅ YES' : '❌ NO'}` });

    // ── Replay Attempt (Second Use) ──────────────────────────────
    emit({ type: 'ATTACK', msg: `Step 3: Attacker REPLAYS the stolen token...` });
    emit({ type: 'TRACE', msg: `>> COMMAND: curl ${BASE}/validate-token?token=${redirectToken}&device=hijacker_device_007 # REPLAY ATTACK` });
    const r2 = await trace({ 
      method: 'get', 
      url: `${BASE}/validate-token?token=${redirectToken}&device=hijacker_device_007` 
    });
    
    const replayBlocked = r2.status === 400 && r2.data.error === "Invalid token";
    emit({ type: 'CHECK', msg: `Replay blocked (Access Denied): ${replayBlocked ? '✅ YES' : '❌ NO — SECURITY FAILURE'}` });

    emit({ type: 'EXPLAIN', msg: 'The backend consumes (deletes) the redirect token from the database immediately after first success.' });
    emit({ type: 'EXPLAIN', msg: 'Intercepting a deep-link URL is useless because it becomes "Invalid" the moment the legitimate app clicks it.' });

    const passed = firstOk && replayBlocked;
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? '✅ PASS — Login redirect tokens are single-use. Replay attack defeated.'
        : '❌ FAIL — Token reuse vulnerability! The token was not invalidated after first use.',
    });

    return { passed };
  },
};
