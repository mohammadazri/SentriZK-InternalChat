// I4 — Redirect Token Single-Use Enforcement
// This test verifies that the one-time token issued after a successful ZKP login 
// is invalidated immediately after its first use, preventing deep-link interception attacks.
// Uses the stable TEST_USER from the environment.

const axios   = require('axios');
const path    = require('path');
const config  = require('../../config');

module.exports = {
  id:          'i4',
  name:        'Redirect Token Single-Use',
  category:    'INTEGRITY',
  description: 'Steal and replay a Login Redirect Token. Must be burned on first use.',

  async run(emit) {
    const BASE = config.BACKEND_URL;
    const snarkjs = require('snarkjs');

    emit({ type: 'ATTACK', msg: `Step 1: Logging in as "${config.TEST_USER}" to get a real Redirect Token...` });

    let redirectToken;
    try {
      // 1. Fetch Nonce
      const { data: nonceData } = await axios.get(`${BASE}/commitment/${config.TEST_USER}`);
      const { commitment, nonce } = nonceData;

      // 2. Generate Login Proof (Real ZKP)
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
      const loginRes = await axios.post(`${BASE}/login`, {
        username: config.TEST_USER,
        proof,
        publicSignals
      });

      redirectToken = loginRes.data.token;
      if (!redirectToken) throw new Error("No token returned in login response");
      emit({ type: 'RESULT', msg: `Success: Login complete. Redirect Token: ${redirectToken.substring(0, 10)}...` });
    } catch (err) {
      const is404 = err.response && err.response.status === 404;
      emit({ type: 'ERROR', msg: `Login flow failed: ${err.message}` });
      if (is404) {
         emit({ type: 'VERDICT', passed: false, msg: `❌ FAIL — Test user "${config.TEST_USER}" not found. Restart runner to auto-register.` });
      } else {
         emit({ type: 'VERDICT', passed: false, msg: '❌ FAIL — Could not perform ZKP login.' });
      }
      return { passed: false };
    }

    // ── Simulate deep-link usage (First Use) ─────────────────────
    emit({ type: 'ATTACK', msg: `Step 2: Using the token for the first time (simulating mobile app landing)...` });
    const r1 = await axios.get(`${BASE}/validate-token?token=${redirectToken}&device=legit_device`, { validateStatus: () => true });
    
    emit({ type: 'RESULT', msg: `First use  → HTTP ${r1.status}  ${JSON.stringify(r1.data).substring(0, 80)}` });
    const firstOk = r1.status === 200 && r1.data.valid === true;
    emit({ type: 'CHECK', msg: `First validation succeeded: ${firstOk ? '✅ YES' : '❌ NO'}` });

    // ── Replay Attempt (Second Use) ──────────────────────────────
    emit({ type: 'ATTACK', msg: `Step 3: REPLAYING the same token (attacker tries to intercept the session)...` });
    const r2 = await axios.get(`${BASE}/validate-token?token=${redirectToken}&device=attacker_device`, { validateStatus: () => true });
    
    emit({ type: 'RESULT', msg: `Second use → HTTP ${r2.status}  ${JSON.stringify(r2.data)}` });
    const replayBlocked = r2.status === 400 && r2.data.error === "Invalid token";
    emit({ type: 'CHECK', msg: `Replay blocked (token burned): ${replayBlocked ? '✅ YES' : '❌ NO — SECURITY FAILURE'}` });

    emit({ type: 'EXPLAIN', msg: 'The backend consumes (deletes) the redirect token from the database immediately after success.' });
    emit({ type: 'EXPLAIN', msg: 'This protects against "Deep Link Interception" where a malicious app tries to use a stolen URL.' });

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
