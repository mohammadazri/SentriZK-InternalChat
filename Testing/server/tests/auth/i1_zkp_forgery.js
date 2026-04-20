// I1 — ZKP Proof Forgery
// Crafts two types of fake Groth16 proofs and submits them to /login.
// TRACE: High-fidelity HTTP trace + simulated commands.

const config = require('../../config');
const { createTracer } = require('../../utils/tracer');

module.exports = {
  id:          'i1',
  name:        'ZKP Proof Forgery',
  category:    'INTEGRITY',
  description: 'Attempt to authenticate with a crafted Groth16 proof that was never computed.',

  async run(emit) {
    const BASE  = config.BACKEND_URL;
    const trace = createTracer(emit);

    // ── Step 1: Get a real nonce ──────────────────────────────────
    emit({ type: 'ATTACK', msg: `Step 1: Fetching fresh nonce for target identity: ${config.TEST_USER}` });
    const nRes = await trace({ method: 'get', url: `${BASE}/commitment/${config.TEST_USER}` });
    
    if (nRes.status !== 200) {
      emit({ type: 'ERROR', msg: 'Failed to fetch prerequisite cryptographic nonce.' });
      return { passed: false };
    }
    const { commitment, nonce } = nRes.data;

    const results = [];

    // ── Attack 1: Random field elements (not on BN128 curve) ──────
    emit({ type: 'ATTACK', msg: 'Attack #1 — Submitting random non-curve field elements...' });
    const fakeProof1 = {
      pi_a: ['12345678901234567890987654321098', '98765432109876543210123456789012', '1'],
      pi_b: [['111222333444555666', '777888999000111222'], ['333444555666777888', '999000111222333444'], ['1', '0']],
      pi_c: ['555666777888999000111222333444555', '111222333444555666777888999000111', '1'],
      protocol: 'groth16',
      curve:    'bn128',
    };
    const ps1 = [String(commitment), String(nonce), '0', String(nonce)];

    emit({ type: 'TRACE', msg: `>> COMMAND: curl -X POST ${BASE}/login -d '{"username":"${config.TEST_USER}","proof":{...}}'` });
    const r1 = await trace({
      method: 'post',
      url: `${BASE}/login`,
      data: { username: config.TEST_USER, proof: fakeProof1, publicSignals: ps1 }
    });
    
    const ok1 = r1.status === 400;
    emit({ type: 'CHECK',  msg: `Random forgery rejected: ${ok1 ? '✅ YES' : '❌ NO — SECURITY FAILURE'}` });
    results.push(ok1);

    // ── Attack 2: Real Proof structure but with 1 bit flipped ─────
    emit({ type: 'ATTACK', msg: 'Attack #2 — Submitting valid proof structure with 1-bit tamper...' });
    const tamperedPiA0 = String(commitment).slice(0, -1) + (String(commitment).slice(-1) === '0' ? '1' : '0');

    const fakeProof2 = {
      pi_a: [tamperedPiA0, String(commitment), '1'],
      pi_b: [['21888242871839275222246405745257275088696311157297823662689037894645226208561', '11559732032986387107991004021392285783925812861821192530917403151452391805634'], ['10857046999023057135944570762232829481370756359578518086990519993285655852781', '4082367875863433681332203403145435568316851327593401208105741076214120093531'], ['1', '0']],
      pi_c: [String(nonce), String(commitment), '1'],
      protocol: 'groth16',
      curve:    'bn128',
    };

    emit({ type: 'TRACE', msg: `>> COMMAND: curl -X POST ${BASE}/login -d '{"username":"${config.TEST_USER}","proof":{...}}'` });
    const r2 = await trace({
      method: 'post',
      url: `${BASE}/login`,
      data: { username: config.TEST_USER, proof: fakeProof2, publicSignals: ps1 }
    });
    
    const ok2 = r2.status === 400;
    emit({ type: 'CHECK',  msg: `Tampered proof rejected: ${ok2 ? '✅ YES' : '❌ NO — SECURITY FAILURE'}` });
    results.push(ok2);

    emit({ type: 'EXPLAIN', msg: 'Groth16 ZKPs are mathematically rigid. A single bit flip changes the pairing result, making verification fail.' });

    const passed = results.every(Boolean);
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? '✅ PASS — All forgery attempts blocked. Proof verification is cryptographically sound.'
        : '❌ FAIL — Backend accepted a forged ZKP proof!',
    });

    return { passed };
  },
};
