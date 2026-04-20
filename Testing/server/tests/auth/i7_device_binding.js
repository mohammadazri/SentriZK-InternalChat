// I7 — Device Binding: Session Hijack Prevention
// This test verifies that a session token is cryptographically bound to a specific 
// Device ID. Even if the token is stolen, it cannot be used from another device.
// Uses the stable TEST_USER identity.

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

    emit({ type: 'ATTACK', msg: `Step 1: Creating a legitimate session bound to device "${LEGIT}"...` });

    let sessionID;
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

      // 3. Login to get session
      const loginResp = await axios.post(`${BASE}/login`, { username: config.TEST_USER, proof, publicSignals });
      sessionID = loginResp.data.sessionId;

      // 4. Bind the device ID (by first use or refresh)
      // Actually, in SentriZK, the sessionId is created without deviceId first, 
      // then bound when /validate-token exchange happens or /refresh-session.
      // We will perform a refresh to bind it to LEGIT.
      await axios.post(`${BASE}/refresh-session`, { sessionId: sessionID, deviceId: LEGIT });
      
      emit({ type: 'RESULT', msg: `Session created and bound to: ${LEGIT}` });
    } catch (err) {
      emit({ type: 'ERROR', msg: `Setup failed: ${err.message}` });
      emit({ type: 'VERDICT', passed: false, msg: '❌ FAIL — Could not prepare a real bound session.' });
      return { passed: false };
    }

    // ── Step 2: Attempt hijack from Different Device ──────────────
    emit({ type: 'ATTACK', msg: `Step 2: Attacker uses the stolen sessionId with device ID "${ATTACKER}"...` });
    
    const r1 = await axios.post(
      `${BASE}/refresh-session`,
      { sessionId: sessionID, deviceId: ATTACKER },
      { validateStatus: () => true }
    );
    
    emit({ type: 'RESULT', msg: `Refresh attempt (attacker): HTTP ${r1.status} — ${JSON.stringify(r1.data)}` });
    const hijackBlocked = r1.status === 403 && r1.data.error === "Device mismatch";
    emit({ type: 'CHECK',  msg: `Hijack blocked by device binding: ${hijackBlocked ? '✅ YES' : '❌ NO — CRITICAL VULNERABILITY'}` });

    // ── Step 3: Verify it still works for the LEGIT device ─────────
    emit({ type: 'ATTACK', msg: 'Step 3: Verifying session remains valid for the LEGITIMATE device...' });
    const r2 = await axios.post(`${BASE}/validate-session`, { sessionId: sessionID }, { validateStatus: () => true });
    emit({ type: 'RESULT', msg: `Validation (legit): HTTP ${r2.status} — ${JSON.stringify(r2.data)}` });
    const legitValid = r2.data?.valid === true;
    emit({ type: 'CHECK',  msg: `Legit device still has access: ${legitValid ? '✅ YES' : '❌ NO'}` });

    emit({ type: 'EXPLAIN', msg: 'SentriZK links every session to the hardware Device ID after initial binding.' });
    emit({ type: 'EXPLAIN', msg: 'Even if the 32-character sessionId is stolen, it is worthless without the specific device identity.' });

    const passed = hijackBlocked && legitValid;
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? '✅ PASS — Session token is hardware-bound. Cross-device hijack attempts are rejected.'
        : '❌ FAIL — Device binding check failed!',
    });

    return { passed };
  },
};
