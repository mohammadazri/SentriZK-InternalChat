// I6 — Session Rotation Anti-Replay
// This test verifies that the server rotates the sessionId upon refresh 
// and immediately invalidates the old sessionId to prevent replay attacks.
// TRACE: High-fidelity HTTP trace + simulated commands.

const config = require('../../config');
const { createTracer } = require('../../utils/tracer');

module.exports = {
  id:          'i6',
  name:        'Session Rotation Anti-Replay',
  category:    'INTEGRITY',
  description: 'Proves that old session tokens are invalidated after a rotation/refresh.',

  async run(emit) {
    const BASE    = config.BACKEND_URL;
    const snarkjs = require('snarkjs');
    const trace   = createTracer(emit);

    emit({ type: 'ATTACK', msg: `Step 1: Creating a real session for "${config.TEST_USER}" via ZKP...` });

    let sessionA;
    try {
      // 1. Fetch Nonce
      emit({ type: 'TRACE', msg: `>> COMMAND: curl -X GET ${BASE}/commitment/${config.TEST_USER}` });
      const nRes = await trace({ method: 'get', url: `${BASE}/commitment/${config.TEST_USER}` });
      if (nRes.status !== 200) throw new Error("Could not fetch nonce");
      const { commitment, nonce } = nRes.data;

      // 2. Generate Login Proof
      emit({ type: 'LOG', msg: 'Computing ZKP witness (stable identity)...' });
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

      // 3. Login
      emit({ type: 'TRACE', msg: `>> COMMAND: curl -X POST ${BASE}/login -d '{"username":"${config.TEST_USER}","proof":{...}}'` });
      const lRes = await trace({
        method: 'post',
        url: `${BASE}/login`,
        data: { username: config.TEST_USER, proof, publicSignals }
      });
      if (lRes.status !== 200) throw new Error("Login failed");
      sessionA = lRes.data.sessionId;

      emit({ type: 'RESULT', msg: `Session A active: ${sessionA.substring(0, 15)}...` });
    } catch (err) {
      emit({ type: 'ERROR', msg: `Setup failed: ${err.message}` });
      emit({ type: 'VERDICT', passed: false, msg: '❌ FAIL — Could not prepare session for rotation test.' });
      return { passed: false };
    }

    // ── Step 2: Refresh session (server rotates sessionId) ──────────
    emit({ type: 'ATTACK', msg: 'Step 2: Refreshing session (Triggering ID Rotation)...' });
    emit({ type: 'TRACE', msg: `>> COMMAND: curl -X POST ${BASE}/refresh-session -d '{"sessionId":"${sessionA}","deviceId":"${config.TEST_DEVICE}"}'` });
    const rRes = await trace({
      method: 'post',
      url: `${BASE}/refresh-session`,
      data: { sessionId: sessionA, deviceId: config.TEST_DEVICE }
    });
    
    const sessionB = rRes.data?.sessionId;
    emit({ type: 'RESULT', msg: `New sessionId (B) issued: ${sessionB ? sessionB.substring(0, 15) + '...' : 'NONE'}` });

    // ── Step 3: Validate OLD session (should be invalid) ───────────
    emit({ type: 'ATTACK', msg: 'Step 3: Attacker REPLAYS Session A after rotation...' });
    emit({ type: 'TRACE', msg: `>> COMMAND: curl -X POST ${BASE}/validate-session -d '{"sessionId":"${sessionA}"}' # REPLAY ATTACK` });
    const vOld = await trace({
      method: 'post',
      url: `${BASE}/validate-session`,
      data: { sessionId: sessionA }
    });
    
    const oldInvalid = vOld.data?.valid === false || vOld.status !== 200;
    emit({ type: 'CHECK',  msg: `Old token (A) rejected by backend: ${oldInvalid ? '✅ YES' : '❌ NO — CRITICAL'}` });

    // ── Step 4: Validate NEW session (should work) ─────────────────
    let newValid = false;
    if (sessionB) {
      emit({ type: 'ATTACK', msg: 'Step 4: Confirming Session B remains valid for use...' });
      emit({ type: 'TRACE', msg: `>> COMMAND: curl -X POST ${BASE}/validate-session -d '{"sessionId":"${sessionB}"}'` });
      const vNew = await trace({
        method: 'post',
        url: `${BASE}/validate-session`,
        data: { sessionId: sessionB }
      });
      newValid = vNew.data?.valid === true;
      emit({ type: 'CHECK',  msg: `New token (B) is valid: ${newValid ? '✅ YES' : '❌ NO'}` });
    }

    emit({ type: 'EXPLAIN', msg: 'SentriZK rotates session IDs on every refresh to mitigate stolen token risk.' });
    emit({ type: 'EXPLAIN', msg: 'The "Delete-on-Rotate" strategy ensures intercepted sessions are short-lived.' });

    const passed = oldInvalid && newValid;
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? '✅ PASS — Session rotation verified with raw HTTP telemetry.'
        : '❌ FAIL — Session rotation logic mismatch detected.',
    });

    return { passed };
  },
};
