// I7 — Device Binding: Session Hijack Prevention
// This test verifies that a session token is hardware-bound.
// Even if the token is stolen, it cannot be used from another device ID.
// TRACE: High-fidelity HTTP logging enabled.

const config = require('../../config');
const { createTracer } = require('../../utils/tracer');

module.exports = {
  id:          'i7',
  name:        'Device Binding: Session Hijack',
  category:    'INTEGRITY',
  description: 'Steal a session token and try to use it on a different device. Must be rejected.',

  async run(emit) {
    const BASE      = config.BACKEND_URL;
    const LEGIT     = config.TEST_DEVICE;
    const ATTACKER  = 'evil_hardware_identity_hijacker_' + Date.now();
    const snarkjs   = require('snarkjs');
    const trace     = createTracer(emit);

    emit({ type: 'ATTACK', msg: `Step 1: Creating a legitimate session on Device "${LEGIT}"...` });

    let sessIdB;
    try {
      // 1. Fetch Nonce
      const nRes = await trace({ method: 'get', url: `${BASE}/commitment/${config.TEST_USER}` });
      if (nRes.status !== 200) throw new Error("Nonce fetch failed");
      const { commitment, nonce } = nRes.data;

      // 2. Proof
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
      const lRes = await trace({
        method: 'post',
        url: `${BASE}/login`,
        data: { username: config.TEST_USER, proof, publicSignals }
      });
      const sessIdA = lRes.data.sessionId;

      // 4. Initial Bind 
      emit({ type: 'LOG', msg: `Binding session to Device ID: ${LEGIT}` });
      const bRes = await trace({
        method: 'post',
        url: `${BASE}/refresh-session`,
        data: { sessionId: sessIdA, deviceId: LEGIT }
      });
      sessIdB = bRes.data.sessionId;
      
      emit({ type: 'RESULT', msg: `Session secured and hardware-locked correctly.` });
    } catch (err) {
      emit({ type: 'ERROR', msg: `Setup failed: ${err.message}` });
      emit({ type: 'VERDICT', passed: false, msg: '❌ FAIL — Could not prepare bound session.' });
      return { passed: false };
    }

    // ── Step 2: Attempt hijack from Different Device ──────────────
    emit({ type: 'ATTACK', msg: `Step 2: Attacker attempts to REFRESH stolen session on Device "${ATTACKER}"...` });
    const r1 = await trace({
      method: 'post',
      url: `${BASE}/refresh-session`,
      data: { sessionId: sessIdB, deviceId: ATTACKER }
    });
    
    const hijackBlocked = r1.status === 403 && r1.data.error === "Device mismatch";
    emit({ type: 'CHECK',  msg: `Hijack blocked by Hardware Binding (403): ${hijackBlocked ? '✅ YES' : '❌ NO — VULNERABLE'}` });

    // ── Step 3: Verify it still works for the LEGIT device ─────────
    emit({ type: 'ATTACK', msg: 'Step 3: Confirming access remains for the original legitimate device...' });
    const r2 = await trace({
      method: 'post',
      url: `${BASE}/validate-session`,
      data: { sessionId: sessIdB }
    });
    const legitValid = r2.data?.valid === true;
    emit({ type: 'CHECK',  msg: `Legit user access preserved: ${legitValid ? '✅ YES' : '❌ NO'}` });

    emit({ type: 'EXPLAIN', msg: 'SentriZK pairs every session ID to a cryptographic fingerprint of the user hardware.' });
    emit({ type: 'EXPLAIN', msg: 'The backend validates this binding on every sensitive operation, stopping cross-device hijacking.' });

    const passed = hijackBlocked && legitValid;
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? '✅ PASS — Session hardware binding verified with real network telemetry.'
        : '❌ FAIL — Device binding logic failure.',
    });

    return { passed };
  },
};
