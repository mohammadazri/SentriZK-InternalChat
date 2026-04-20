// I4 — MAT Single-Use Enforcement (Refactored to Redirect Token Flow)
// This test simulates the security of the deep-link redirect mechanism.
// 1. Registers a new temporary test user to get a real Redirect Token.
// 2. Uses the token once (Success - legitimate app usage).
// 3. Replays the token (Blocked - simulating an attacker interception).
// PASS = second use returns HTTP 400 "Invalid token" because it was consumed/deleted.

const axios   = require('axios');
const path    = require('path');
const config  = require('../../config');

module.exports = {
  id:          'i4',
  name:        'MAT Single-Use Enforcement',
  category:    'INTEGRITY',
  description: 'Steal and replay a Redirect Token (deep-link token). Must be burned on first use.',

  async run(emit) {
    const BASE = config.BACKEND_URL;
    const snarkjs = require('snarkjs');

    const REG_WASM = path.resolve(__dirname, '../../../../Backend/circuits/registration/registration_js/registration.wasm');
    const REG_ZKEY = path.resolve(__dirname, '../../../../Backend/circuits/key_generation/registration_final.zkey');

    const tempUser   = `mat_test_${Math.floor(Math.random() * 1000000)}`;
    const testSecret = "1234567890123456789012345678901234567890";
    const testSalt   = "111111222222333333444444";
    const unameHash  = "999999888888777777";

    emit({ type: 'ATTACK', msg: `Step 1: Registering temporary user "${tempUser}" to get a real Redirect Token...` });

    let redirectToken;
    try {
      // 1. Generate Registration Proof (Real ZKP)
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        { secret: testSecret, salt: testSalt, unameHash: unameHash },
        REG_WASM,
        REG_ZKEY
      );

      // 2. Submit Registration
      const regRes = await axios.post(`${BASE}/register`, {
        username: tempUser,
        proof,
        publicSignals
      });

      redirectToken = regRes.data.token;
      if (!redirectToken) throw new Error("No token returned in registration response");
      emit({ type: 'RESULT', msg: `Success: Registration complete. Redirect Token: ${redirectToken.substring(0, 10)}...` });
    } catch (err) {
      emit({ type: 'ERROR', msg: `Registration failed: ${err.message}` });
      emit({ type: 'VERDICT', passed: false, msg: '❌ FAIL — Could not prepare test account (Backend error or ZKP failure).' });
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
    emit({ type: 'EXPLAIN', msg: 'Intercepting a deep-link URL is useless because it becomes "Invalid" the moment the legitimate app clicks it.' });

    const passed = firstOk && replayBlocked;
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? '✅ PASS — Deep-link tokens are single-use. Replay attack defeated.'
        : '❌ FAIL — Token reuse vulnerability! The token was not invalidated after first use.',
    });

    return { passed };
  },
};
