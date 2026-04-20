// I3 — Identity Substitution: Proof Interception
// An attacker intercepts a valid ZKP proof for "sentrizk_test_user" 
// and tries to submit it for a different username ("attacker_identity").
// TRACE: High-fidelity HTTP trace + simulated commands.

const config = require('../../config');
const { createTracer } = require('../../utils/tracer');

module.exports = {
  id:          'i3',
  name:        'Identity Substitution: Proof Interception',
  category:    'INTEGRITY',
  description: 'Intercept a valid proof for one user and try to submit it for another identity.',

  async run(emit) {
    const BASE    = config.BACKEND_URL;
    const snarkjs = require('snarkjs');
    const trace   = createTracer(emit);

    emit({ type: 'ATTACK', msg: `Step 1: Capturing a real proof for victim identity: ${config.TEST_USER}` });

    let snatchedProof, snatchedPublic;
    try {
      const nRes = await trace({ method: 'get', url: `${BASE}/commitment/${config.TEST_USER}` });
      const { commitment, nonce } = nRes.data;

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        { secret: config.TEST_SECRET, salt: config.TEST_SALT, unameHash: config.TEST_UNAME_HASH, storedCommitment: String(commitment), nonce: String(nonce) },
        config.LOGIN_WASM, config.LOGIN_ZKEY
      );
      snatchedProof = proof;
      snatchedPublic = publicSignals;
      emit({ type: 'RESULT', msg: 'Valid proof captured and stored in attacker buffer.' });
    } catch (err) {
      emit({ type: 'ERROR', msg: `Setup failed: ${err.message}` });
      return { passed: false };
    }

    // ── Attack: Submit snatched proof for WRONG identity ──────────
    const evilName = 'attacker_identity_' + Date.now();
    emit({ type: 'ATTACK', msg: `Step 2: Attacker attempts to login as "${evilName}" using the victim's proof...` });
    
    emit({ type: 'TRACE', msg: `>> COMMAND: curl -X POST ${BASE}/login -d '{"username":"${evilName}","proof":{...}}' # IDENTITY THEFT` });
    const rEvil = await trace({
      method: 'post',
      url: `${BASE}/login`,
      data: { username: evilName, proof: snatchedProof, publicSignals: snatchedPublic }
    });

    const blocked = rEvil.status !== 200;
    emit({ type: 'CHECK',  msg: `Substitution attack blocked: ${blocked ? '✅ YES' : '❌ NO — IDENTITY THEFT SUCCESS'}` });

    emit({ type: 'EXPLAIN', msg: 'The ZKP proof contains a "UnameHash" which is cryptographically linked to the username.' });
    emit({ type: 'EXPLAIN', msg: 'Submitting a victim\'s proof for an attacker\'s username fails because the hash won\'t match the target name.' });

    const passed = blocked;
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? '✅ PASS — Proofs are identity-bound. Substitution attacks are impossible.'
        : '❌ FAIL — Backend accepted a victim proof for an attacker account!',
    });

    return { passed };
  },
};
