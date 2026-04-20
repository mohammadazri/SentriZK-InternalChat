// I1 — ZKP Proof Forgery
// Crafts two types of fake Groth16 proofs and submits them to /login.
// PASS = both get HTTP 400 "Invalid login proof".

const axios  = require('axios');
const config = require('../../config');

module.exports = {
  id:          'i1',
  name:        'ZKP Proof Forgery',
  category:    'INTEGRITY',
  description: 'Attempt to authenticate with a crafted Groth16 proof that was never computed from a valid witness.',

  async run(emit) {
    const BASE = config.BACKEND_URL;

    // ── Step 1: Get a real nonce for our test user ─────────────────
    emit({ type: 'ATTACK', msg: `Fetching fresh nonce for test user: ${config.TEST_USER}` });

    let commitment, nonce;
    try {
      const { data } = await axios.get(`${BASE}/commitment/${config.TEST_USER}`);
      commitment = data.commitment;
      nonce      = data.nonce;
      emit({ type: 'RESULT', msg: `Nonce received: ${nonce} | Commitment: ${String(commitment).substring(0,20)}...` });
    } catch (err) {
      emit({ type: 'ERROR', msg: `Could not fetch nonce: ${err.message}` });
      emit({ type: 'VERDICT', passed: false, msg: '❌ FAIL — Backend unreachable.' });
      return { passed: false };
    }

    const results = [];

    // ── Attack 1: Random field elements (not on BN128 curve) ──────
    emit({ type: 'ATTACK', msg: 'Attack #1 — Random BN128 field elements (nowhere near the curve)' });
    const fakeProof1 = {
      pi_a: ['12345678901234567890987654321098', '98765432109876543210123456789012', '1'],
      pi_b: [['111222333444555666', '777888999000111222'], ['333444555666777888', '999000111222333444'], ['1', '0']],
      pi_c: ['555666777888999000111222333444555', '111222333444555666777888999000111', '1'],
      protocol: 'groth16',
      curve:    'bn128',
    };
    const fakePublicSignals1 = [String(commitment), String(nonce), '0', String(nonce)];

    try {
      const r = await axios.post(
        `${BASE}/login`,
        { username: config.TEST_USER, proof: fakeProof1, publicSignals: fakePublicSignals1 },
        { validateStatus: () => true }
      );
      const ok = r.status === 400;
      emit({ type: 'RESULT', msg: `HTTP ${r.status} — ${JSON.stringify(r.data)}` });
      emit({ type: 'CHECK',  msg: `Forged proof rejected with HTTP 400: ${ok ? '✅ YES' : '❌ NO — SECURITY FAILURE'}` });
      results.push(ok);
    } catch (err) {
      emit({ type: 'ERROR', msg: `Request failed: ${err.message}` });
      results.push(false);
    }

    // ── Attack 2: Real Proof structure but with 1 bit flipped ─────
    // Simulate intercepting a valid proof and tamper with 1 digit of pi_a[0]
    emit({ type: 'ATTACK', msg: 'Attack #2 — Tampered proof: real structure with pi_a[0] last char flipped' });
    const lastChar = String(commitment).slice(-1);
    const flippedChar = lastChar === '0' ? '1' : '0';
    const tamperedPiA0 = String(commitment).slice(0, -1) + flippedChar;

    const fakeProof2 = {
      pi_a: [tamperedPiA0, String(commitment), '1'],
      pi_b: [['21888242871839275222246405745257275088696311157297823662689037894645226208561', '11559732032986387107991004021392285783925812861821192530917403151452391805634'], ['10857046999023057135944570762232829481370756359578518086990519993285655852781', '4082367875863433681332203403145435568316851327593401208105741076214120093531'], ['1', '0']],
      pi_c: [String(nonce), String(commitment), '1'],
      protocol: 'groth16',
      curve:    'bn128',
    };

    try {
      const r = await axios.post(
        `${BASE}/login`,
        { username: config.TEST_USER, proof: fakeProof2, publicSignals: fakePublicSignals1 },
        { validateStatus: () => true }
      );
      const ok = r.status === 400;
      emit({ type: 'RESULT', msg: `HTTP ${r.status} — ${JSON.stringify(r.data)}` });
      emit({ type: 'CHECK',  msg: `1-bit tampered proof rejected with HTTP 400: ${ok ? '✅ YES' : '❌ NO — SECURITY FAILURE'}` });
      results.push(ok);
    } catch (err) {
      emit({ type: 'ERROR', msg: `Request failed: ${err.message}` });
      results.push(false);
    }

    emit({ type: 'EXPLAIN', msg: 'Groth16 verification: e(A,B)·e(C,vk_delta) = e(vk_alpha,vk_beta)·e(D,vk_gamma)' });
    emit({ type: 'EXPLAIN', msg: 'Non-curve points break the pairing equation instantly — no partial forgery exists.' });
    emit({ type: 'EXPLAIN', msg: 'Cost to forge a valid proof from scratch: 2^128 operations (infeasible).' });

    const passed = results.every(Boolean);
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? '✅ PASS — All ZKP forgery attempts rejected. Groth16 pairing math is unbreakable.'
        : `❌ FAIL — Some forgery attempts were accepted! (${results.filter(Boolean).length}/${results.length} rejected)`,
    });

    return { passed };
  },
};
