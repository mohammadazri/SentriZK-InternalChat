// I6 — Session Rotation Anti-Replay
// This test verifies that the server rotates the sessionId upon refresh 
// and immediately invalidates the old sessionId to prevent replay attacks.
// Uses the stable TEST_USER identity.

const axios  = require('axios');
const path   = require('path');
const config = require('../../config');

module.exports = {
  id:          'i6',
  name:        'Session Rotation Anti-Replay',
  category:    'INTEGRITY',
  description: 'Proves that old session tokens are invalidated after a rotation/refresh.',

  async run(emit) {
    const BASE = config.BACKEND_URL;
    const snarkjs = require('snarkjs');

    emit({ type: 'ATTACK', msg: `Step 1: Creating a real session for "${config.TEST_USER}"...` });

    let sessionA;
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

      // 3. Login
      const loginResp = await axios.post(`${BASE}/login`, { username: config.TEST_USER, proof, publicSignals });
      sessionA = loginResp.data.sessionId;
      if (!sessionA) throw new Error("No sessionId in response");
      emit({ type: 'RESULT', msg: `Session A created: ${sessionA.substring(0, 20)}...` });
    } catch (err) {
      emit({ type: 'ERROR', msg: `Setup failed: ${err.message}` });
      emit({ type: 'VERDICT', passed: false, msg: '❌ FAIL — Could not create a real session for rotation test.' });
      return { passed: false };
    }

    // ── Step 2: Refresh session (server rotates sessionId) ──────────
    emit({ type: 'ATTACK', msg: 'Step 2: Refreshing session (triggering rotation)...' });
    const refreshResp = await axios.post(
      `${BASE}/refresh-session`,
      { sessionId: sessionA, deviceId: config.TEST_DEVICE },
      { validateStatus: () => true }
    );
    const sessionB = refreshResp.data?.sessionId;
    emit({ type: 'RESULT', msg: `HTTP ${refreshResp.status} — New sessionId (B): ${sessionB ? sessionB.substring(0, 20) + '...' : 'null'}` });

    // ── Step 3: Validate OLD session (should be invalid) ───────────
    emit({ type: 'ATTACK', msg: 'Step 3: Attacker attempts to use OLD sessionId (Session A) after rotation...' });
    const validateOld = await axios.post(
      `${BASE}/validate-session`,
      { sessionId: sessionA },
      { validateStatus: () => true }
    );
    emit({ type: 'RESULT', msg: `Old session validate: HTTP ${validateOld.status} — ${JSON.stringify(validateOld.data)}` });
    const oldInvalid = validateOld.data?.valid === false || validateOld.status !== 200;
    emit({ type: 'CHECK',  msg: `Old session (A) is now invalid: ${oldInvalid ? '✅ YES' : '❌ NO — SECURITY FAILURE'}` });

    // ── Step 4: Validate NEW session (should work) ─────────────────
    let newValid = false;
    if (sessionB) {
      emit({ type: 'ATTACK', msg: 'Step 4: Confirming NEW sessionId (Session B) is still valid...' });
      const validateNew = await axios.post(`${BASE}/validate-session`, { sessionId: sessionB }, { validateStatus: () => true });
      emit({ type: 'RESULT', msg: `New session validate: HTTP ${validateNew.status} — ${JSON.stringify(validateNew.data)}` });
      newValid = validateNew.data?.valid === true;
      emit({ type: 'CHECK',  msg: `New session (B) is valid: ${newValid ? '✅ YES' : '❌ NO'}` });
    }

    emit({ type: 'EXPLAIN', msg: 'The server enforces a "Delete-on-Rotate" policy for session IDs in the database.' });
    emit({ type: 'EXPLAIN', msg: 'This neutralizes stolen tokens because they become useless the moment the real user refreshes their session.' });

    const passed = oldInvalid && newValid;
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? '✅ PASS — Session rotation verified. Replay of old tokens successfully blocked.'
        : '❌ FAIL — Session rotation logic is broken.',
    });

    return { passed };
  },
};
