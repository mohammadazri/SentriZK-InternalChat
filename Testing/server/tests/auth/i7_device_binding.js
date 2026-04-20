// I7 — Device Binding: Session Hijack Prevention
// This test verifies that a session token is cryptographically bound to a specific 
// Device ID. Even if the token is stolen, it cannot be used from another device.
// Logic:
// 1. Initial Login (Unbound Session A)
// 2. Refresh with Device A -> Returns rotated Session B (Now bound to Device A)
// 3. Attacker tries to use Session B with Device B -> Blocked (403 Device mismatch)
// 4. Legit user uses Session B with Device A -> Success

const axios  = require('axios');
const config = require('../../config');

module.exports = {
  id:          'i7',
  name:        'Device Binding: Session Hijack',
  category:    'INTEGRITY',
  description: 'Steal a session token and try to use it on a different device. Must be rejected.',

  async run(emit) {
    const BASE      = config.BACKEND_URL;
    const LEGIT     = config.TEST_DEVICE;
    const ATTACKER  = 'evil_attacker_hardware_id_' + Date.now();
    const snarkjs   = require('snarkjs');

    emit({ type: 'ATTACK', msg: `Step 1: Creating a legitimate session for "${config.TEST_USER}"...` });

    let sessionIdA;
    try {
      // 1. Fetch Nonce
      const { data: nData } = await axios.get(`${BASE}/commitment/${config.TEST_USER}`);
      const { commitment, nonce } = nData;

      // 2. Generate Login Proof
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

      // 3. Login to get initial session
      const loginResp = await axios.post(`${BASE}/login`, { username: config.TEST_USER, proof, publicSignals });
      sessionIdA = loginResp.data.sessionId;
      emit({ type: 'RESULT', msg: `Initial session created: ${sessionIdA.substring(0, 10)}...` });
    } catch (err) {
      emit({ type: 'ERROR', msg: `Setup failed: ${err.message}` });
      return { passed: false };
    }

    // ── Step 2: Bind to LEGIT device via refresh ─────────────────
    emit({ type: 'ATTACK', msg: `Step 2: Binding session to device "${LEGIT}" via first refresh...` });
    const rBind = await axios.post(`${BASE}/refresh-session`, { sessionId: sessionIdA, deviceId: LEGIT });
    const sessionIdB = rBind.data.sessionId; // Session is rotated during refresh
    emit({ type: 'RESULT', msg: `New rotated session obtained: ${sessionIdB.substring(0, 10)}...` });

    // ── Step 3: Attempt hijack from Different Device ──────────────
    emit({ type: 'ATTACK', msg: `Step 3: Attacker uses the rotated sessionId with device ID "${ATTACKER}"...` });
    
    const r1 = await axios.post(
      `${BASE}/refresh-session`,
      { sessionId: sessionIdB, deviceId: ATTACKER },
      { validateStatus: () => true }
    );
    
    emit({ type: 'RESULT', msg: `Refresh attempt (attacker): HTTP ${r1.status} — ${JSON.stringify(r1.data)}` });
    const hijackBlocked = r1.status === 403 && r1.data.error === "Device mismatch";
    emit({ type: 'CHECK',  msg: `Hijack blocked by device binding (403): ${hijackBlocked ? '✅ YES' : '❌ NO'}` });

    // ── Step 4: Verify it still works for the LEGIT device ─────────
    emit({ type: 'ATTACK', msg: 'Step 4: Confirming session remains valid for the LEGITIMATE device...' });
    const r2 = await axios.post(`${BASE}/validate-session`, { sessionId: sessionIdB }, { validateStatus: () => true });
    emit({ type: 'RESULT', msg: `Validation (legit): HTTP ${r2.status} — ${JSON.stringify(r2.data).substring(0, 80)}` });
    const legitValid = r2.data?.valid === true;
    emit({ type: 'CHECK',  msg: `Legit device still has access: ${legitValid ? '✅ YES' : '❌ NO'}` });

    emit({ type: 'EXPLAIN', msg: 'SentriZK links every session to the hardware Device ID after initial binding.' });
    emit({ type: 'EXPLAIN', msg: 'Even if the 32-character sessionId is stolen, it is worthless without matching the specific device identity.' });

    const passed = hijackBlocked && legitValid;
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? '✅ PASS — Session token is hardware-bound. Hijack attempts from unknown devices are blocked.'
        : '❌ FAIL — Device binding check failed! Either hijack succeeded or legit use blocked.',
    });

    return { passed };
  },
};
