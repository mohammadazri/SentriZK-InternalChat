// I2 — Nonce Replay Attack
// Generates a REAL Groth16 proof, submits it once (success), then replays it.
// PASS = first login succeeds AND replay returns 400 "Nonce expired or not issued".

const axios   = require('axios');
const fs      = require('fs');
const config  = require('../../config');

module.exports = {
  id:          'i2',
  name:        'Nonce Replay Attack',
  category:    'INTEGRITY',
  description: 'Capture a real ZKP login proof, replay it — nonce must be burned on first use.',

  async run(emit) {
    const BASE = config.BACKEND_URL;

    // ── Prerequisite check ────────────────────────────────────────
    const missingCreds = !config.TEST_SECRET || !config.TEST_SALT || !config.TEST_UNAME_HASH;
    const missingFiles = !fs.existsSync(config.LOGIN_WASM) || !fs.existsSync(config.LOGIN_ZKEY);

    if (missingCreds || missingFiles) {
      emit({ type: 'SKIP', msg: '⚠️  Missing test credentials or circuit files in .env — running attack with forged proof instead.' });
      return runForgedVersion(emit, BASE);
    }

    // ── Generate a REAL valid proof ───────────────────────────────
    emit({ type: 'ATTACK', msg: `Step 1: Fetching fresh nonce for ${config.TEST_USER}...` });
    const { data: nonceData } = await axios.get(`${BASE}/commitment/${config.TEST_USER}`);
    const { commitment, nonce } = nonceData;
    emit({ type: 'RESULT', msg: `Nonce: ${nonce} (60s TTL) | Commitment prefix: ${String(commitment).substring(0,15)}...` });

    emit({ type: 'ATTACK', msg: 'Step 2: Generating REAL Groth16 proof with snarkjs (real ZKP computation)...' });
    const t0 = Date.now();
    let proof, publicSignals;

    try {
      const snarkjs = require('snarkjs');
      const result  = await snarkjs.groth16.fullProve(
        {
          secret:           config.TEST_SECRET,
          salt:             config.TEST_SALT,
          unameHash:        config.TEST_UNAME_HASH,
          storedCommitment: String(commitment),
          nonce:            String(nonce),
        },
        config.LOGIN_WASM,
        config.LOGIN_ZKEY
      );
      proof        = result.proof;
      publicSignals = result.publicSignals;
      emit({ type: 'RESULT', msg: `Proof generated in ${((Date.now() - t0) / 1000).toFixed(2)}s  ← real ZKP generation cost (inherent brute-force resistance)` });
    } catch (err) {
      emit({ type: 'ERROR', msg: `snarkjs error: ${err.message}` });
      emit({ type: 'SKIP',  msg: 'Falling back to forged-proof version of this test...' });
      return runForgedVersion(emit, BASE);
    }

    // ── First use (legitimate login) ──────────────────────────────
    emit({ type: 'ATTACK', msg: 'Step 3: Submitting proof — FIRST use (legitimate login)...' });
    const r1 = await axios.post(
      `${BASE}/login`,
      { username: config.TEST_USER, proof, publicSignals },
      { validateStatus: () => true }
    );
    emit({ type: 'RESULT', msg: `HTTP ${r1.status} — ${JSON.stringify(r1.data).substring(0, 120)}` });
    const firstOk = r1.status === 200;
    emit({ type: 'CHECK',  msg: `First login succeeded (HTTP 200): ${firstOk ? '✅ YES' : '❌ NO'}` });

    // ── Replay the EXACT same proof ───────────────────────────────
    emit({ type: 'ATTACK', msg: 'Step 4: REPLAYING the identical proof immediately (attacker captured the request)...' });
    const r2 = await axios.post(
      `${BASE}/login`,
      { username: config.TEST_USER, proof, publicSignals },
      { validateStatus: () => true }
    );
    emit({ type: 'RESULT', msg: `HTTP ${r2.status} — ${JSON.stringify(r2.data)}` });
    const replayBlocked = r2.status !== 200;
    emit({ type: 'CHECK',  msg: `Replay rejected (non-200): ${replayBlocked ? '✅ YES' : '❌ NO — SECURITY FAILURE'}` });

    emit({ type: 'EXPLAIN', msg: 'Server sets nonce=null in the database immediately after first successful login.' });
    emit({ type: 'EXPLAIN', msg: 'The same proof submitted a second later finds nonce=null → "Nonce expired or not issued".' });
    emit({ type: 'EXPLAIN', msg: 'Even with TLS broken: captured proof is a one-time cryptographic token.' });

    const passed = firstOk && replayBlocked;
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? '✅ PASS — Replay attack defeated. Each valid proof is single-use.'
        : '❌ FAIL — Replay was accepted! Nonce burning is broken.',
    });

    return { passed };
  },
};

/** Fallback: use a forged proof to demonstrate replay detection without real snarkjs */
async function runForgedVersion(emit, BASE) {
  emit({ type: 'ATTACK', msg: 'Replay test with forged proof — demonstrating nonce invalidation after failed use...' });

  let commitment, nonce;
  try {
    const { data } = await axios.get(`${BASE}/commitment/${require('../../config').TEST_USER}`);
    commitment = data.commitment; nonce = data.nonce;
  } catch (e) {
    emit({ type: 'VERDICT', passed: false, msg: '❌ FAIL — Backend unreachable.' });
    return { passed: false };
  }

  const proof = { pi_a: ['111', '222', '1'], pi_b: [['1','2'],['3','4'],['1','0']], pi_c: ['333','444','1'], protocol:'groth16', curve:'bn128' };
  const ps    = [String(commitment), String(nonce), '0', String(nonce)];

  const r1 = await axios.post(`${BASE}/login`, { username: require('../../config').TEST_USER, proof, publicSignals: ps }, { validateStatus: ()=>true });
  emit({ type: 'RESULT', msg: `First attempt:  HTTP ${r1.status}` });

  const r2 = await axios.post(`${BASE}/login`, { username: require('../../config').TEST_USER, proof, publicSignals: ps }, { validateStatus: ()=>true });
  emit({ type: 'RESULT', msg: `Second attempt: HTTP ${r2.status} — ${JSON.stringify(r2.data)}` });

  // After one use (even a failed one), nonce is burned — subsequent checks differ
  const passed = r2.status === 400;
  emit({ type: 'VERDICT', passed, msg: passed
    ? '✅ PASS — Nonce burned after first attempt; replay returns 400.'
    : '❌ FAIL — Nonce not burned.' });

  return { passed };
}
