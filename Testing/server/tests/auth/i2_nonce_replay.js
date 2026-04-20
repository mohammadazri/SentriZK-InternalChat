// I2 — Nonce Replay Attack
// Generates a REAL Groth16 proof, submits it once (success), then replays it.
// TRACE: High-fidelity HTTP trace + simulated commands.

const config = require('../../config');
const { createTracer } = require('../../utils/tracer');

module.exports = {
  id:          'i2',
  name:        'Nonce Replay Attack',
  category:    'INTEGRITY',
  description: 'Capture a real ZKP login proof, replay it — nonce must be burned on first use.',

  async run(emit) {
    const BASE    = config.BACKEND_URL;
    const snarkjs = require('snarkjs');
    const trace   = createTracer(emit);

    emit({ type: 'ATTACK', msg: `Step 1: Fetching fresh nonce for target: ${config.TEST_USER}` });
    const nRes = await trace({ method: 'get', url: `${BASE}/commitment/${config.TEST_USER}` });
    if (nRes.status !== 200) throw new Error("Could not fetch nonce");
    const { commitment, nonce } = nRes.data;

    emit({ type: 'ATTACK', msg: 'Step 2: Generating REAL Groth16 proof with snarkjs...' });
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      { secret: config.TEST_SECRET, salt: config.TEST_SALT, unameHash: config.TEST_UNAME_HASH, storedCommitment: String(commitment), nonce: String(nonce) },
      config.LOGIN_WASM, config.LOGIN_ZKEY
    );

    // ── First use (legitimate login) ──────────────────────────────
    emit({ type: 'ATTACK', msg: 'Step 3: Submitting proof — FIRST use (legitimate login)...' });
    emit({ type: 'TRACE', msg: `>> COMMAND: curl -X POST ${BASE}/login -d '{"username":"${config.TEST_USER}","proof":{...}}'` });
    const r1 = await trace({
      method: 'post',
      url: `${BASE}/login`,
      data: { username: config.TEST_USER, proof, publicSignals }
    });
    const firstOk = r1.status === 200;
    emit({ type: 'CHECK',  msg: `First login succeeded (200 OK): ${firstOk ? '✅ YES' : '❌ NO'}` });

    // ── Replay the EXACT same proof ───────────────────────────────
    emit({ type: 'ATTACK', msg: 'Step 4: REPLAYING the identical proof (Attacker captured the request)...' });
    emit({ type: 'TRACE', msg: `>> COMMAND: curl -X POST ${BASE}/login -d '{"username":"${config.TEST_USER}","proof":{...}}' # REPLAY ATTACK` });
    const r2 = await trace({
      method: 'post',
      url: `${BASE}/login`,
      data: { username: config.TEST_USER, proof, publicSignals }
    });
    const replayBlocked = r2.status !== 200;
    emit({ type: 'CHECK',  msg: `Replay rejected by nonce-burn logic: ${replayBlocked ? '✅ YES' : '❌ NO — VULNERABLE'}` });

    emit({ type: 'EXPLAIN', msg: 'The backend burns the nonce immediately after one implementation check.' });
    emit({ type: 'EXPLAIN', msg: 'Intercepting a valid proof is useless because it cannot be re-used even a second later.' });

    const passed = firstOk && replayBlocked;
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? '✅ PASS — Nonce replay protection verified with raw telemetry.'
        : '❌ FAIL — Nonce replay attack succeeded!',
    });

    return { passed };
  },
};
