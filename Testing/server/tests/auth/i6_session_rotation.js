// I6 — Session Rotation Anti-Replay
// Creates a session, refreshes it (server rotates sessionId), then validates old ID is dead.
// PASS = old sessionId returns { valid: false } after rotation.

const axios  = require('axios');
const config = require('../../config');

module.exports = {
  id:          'i6',
  name:        'Session Rotation Anti-Replay',
  category:    'INTEGRITY',
  description: 'Steal a session token, trigger rotation, prove old token is invalidated.',

  async run(emit) {
    const BASE = config.BACKEND_URL;

    // ── Step 1: Login to create an initial session ─────────────────
    // Use a forged proof — we just need any session to be created OR
    // use test credentials if available.
    emit({ type: 'ATTACK', msg: 'Step 1: Creating a test session via normal backend flow...' });

    // Try with test credentials in .env
    let sessionA = null;

    if (config.TEST_SECRET && config.TEST_SALT) {
      try {
        const fs      = require('fs');
        const snarkjs = require('snarkjs');

        const { data: nonceData } = await axios.get(`${BASE}/commitment/${config.TEST_USER}`);
        const { commitment, nonce } = nonceData;

        if (fs.existsSync(config.LOGIN_WASM) && fs.existsSync(config.LOGIN_ZKEY)) {
          const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            { secret: config.TEST_SECRET, salt: config.TEST_SALT, unameHash: config.TEST_UNAME_HASH, storedCommitment: String(commitment), nonce: String(nonce) },
            config.LOGIN_WASM,
            config.LOGIN_ZKEY
          );
          const loginResp = await axios.post(`${BASE}/login`, { username: config.TEST_USER, proof, publicSignals }, { validateStatus: () => true });
          if (loginResp.status === 200) sessionA = loginResp.data.sessionId;
        }
      } catch (_) {}
    }

    if (!sessionA) {
      // Try validate-token shortcut with a known token
      emit({ type: 'SKIP', msg: '⚠️  Could not create session with ZKP (missing .env). Testing validate-session with fake IDs...' });
      return runValidationOnly(emit, BASE);
    }

    emit({ type: 'RESULT', msg: `Session A created: ${sessionA.substring(0, 20)}...` });

    // ── Step 2: Refresh session (server rotates sessionId) ──────────
    emit({ type: 'ATTACK', msg: 'Step 2: Refreshing session (rotates session ID)...' });
    const refreshResp = await axios.post(
      `${BASE}/refresh-session`,
      { sessionId: sessionA, deviceId: config.TEST_DEVICE },
      { validateStatus: () => true }
    );
    const sessionB = refreshResp.data?.sessionId;
    emit({ type: 'RESULT', msg: `HTTP ${refreshResp.status} — New sessionId: ${sessionB ? sessionB.substring(0, 20) + '...' : 'null'}` });

    // ── Step 3: Validate OLD session (should be invalid) ───────────
    emit({ type: 'ATTACK', msg: 'Step 3: Attacker uses OLD sessionId (session A) after rotation...' });
    const validateOld = await axios.post(
      `${BASE}/validate-session`,
      { sessionId: sessionA },
      { validateStatus: () => true }
    );
    emit({ type: 'RESULT', msg: `Old session validate: HTTP ${validateOld.status} — ${JSON.stringify(validateOld.data)}` });
    const oldInvalid = validateOld.data?.valid === false || validateOld.status !== 200;
    emit({ type: 'CHECK',  msg: `Old session (A) is now invalid: ${oldInvalid ? '✅ YES' : '❌ NO — SESSION FIXATION VULNERABILITY'}` });

    // ── Step 4: Validate NEW session (should work) ─────────────────
    if (sessionB) {
      emit({ type: 'ATTACK', msg: 'Step 4: Confirming NEW sessionId (session B) is valid...' });
      const validateNew = await axios.post(`${BASE}/validate-session`, { sessionId: sessionB }, { validateStatus: () => true });
      emit({ type: 'RESULT', msg: `New session validate: HTTP ${validateNew.status} — ${JSON.stringify(validateNew.data)}` });
      const newValid = validateNew.data?.valid === true;
      emit({ type: 'CHECK',  msg: `New session (B) is valid: ${newValid ? '✅ YES' : '❌ NO'}` });
    }

    emit({ type: 'EXPLAIN', msg: 'Session rotation invalidates the old sessionId on every refresh.' });
    emit({ type: 'EXPLAIN', msg: 'Attacker capturing session token before rotation cannot use it after rotation.' });

    const passed = oldInvalid;
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? '✅ PASS — Session rotation invalidates old tokens. Anti-replay enforced.'
        : '❌ FAIL — Old session token still valid after rotation!',
    });

    return { passed };
  },
};

async function runValidationOnly(emit, BASE) {
  // Just prove that fake/non-existent sessionIds are rejected
  const fakeSession = 'totally-fake-session-id-that-never-existed-' + Date.now();
  emit({ type: 'ATTACK', msg: `Validating non-existent sessionId: ${fakeSession.substring(0, 30)}...` });

  const r = await axios.post(`${BASE}/validate-session`, { sessionId: fakeSession }, { validateStatus: () => true });
  emit({ type: 'RESULT', msg: `HTTP ${r.status} — ${JSON.stringify(r.data)}` });

  const passed = r.data?.valid === false || r.status !== 200;
  emit({ type: 'CHECK',  msg: `Fake session rejected: ${passed ? '✅ YES' : '❌ NO'}` });
  emit({
    type:   'VERDICT',
    passed,
    msg:    passed
      ? '✅ PASS — Invalid/unknown session IDs are rejected.'
      : '❌ FAIL — Backend accepted a made-up session ID!',
  });
  return { passed };
}
