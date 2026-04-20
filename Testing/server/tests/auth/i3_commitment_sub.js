// I3 — Commitment Substitution Attack
// Attacker submits a proof valid for THEIR account but claims to be a different user.
// PASS = HTTP 400 "Commitment mismatch" or equivalent rejection.

const axios  = require('axios');
const config = require('../../config');

module.exports = {
  id:          'i3',
  name:        'Commitment Substitution Attack',
  category:    'INTEGRITY',
  description: "Forge identity: submit own valid proof but claim to be 'admin'. ZKP circuit must reject.",

  async run(emit) {
    const BASE      = config.BACKEND_URL;
    const ATTACKER  = config.TEST_USER;      // attacker's own account
    const VICTIM    = 'admin';               // username attacker tries to impersonate

    emit({ type: 'ATTACK', msg: `Attack scenario: ${ATTACKER} tries to login as '${VICTIM}'` });
    emit({ type: 'ATTACK', msg: "Step 1: Get attacker's own commitment + nonce (legitimate)..." });

    let commitment, nonce;
    try {
      const { data } = await axios.get(`${BASE}/commitment/${ATTACKER}`);
      commitment = data.commitment;
      nonce      = data.nonce;
      emit({ type: 'RESULT', msg: `Attacker commitment prefix: ${String(commitment).substring(0, 20)}...` });
    } catch (err) {
      emit({ type: 'ERROR', msg: `Failed to fetch attacker nonce: ${err.message}` });
      emit({ type: 'VERDICT', passed: false, msg: '❌ FAIL — Backend unreachable.' });
      return { passed: false };
    }

    // Craft a "proof" based on attacker's commitment but targeting victim username
    emit({ type: 'ATTACK', msg: `Step 2: Submitting proof with username='${VICTIM}' but attacker's publicSignals...` });

    // Build fake proof (attacker's commitment in publicSignals, victim's username in body)
    const fakeProof = {
      pi_a: ['99999999999999999999', '11111111111111111111', '1'],
      pi_b: [['2','3'], ['4','5'], ['1', '0']],
      pi_c: ['77777777777777777777', '88888888888888888888', '1'],
      protocol: 'groth16',
      curve:    'bn128',
    };
    // publicSignals[0] = attacker's commitment (not victim's!)
    const publicSignals = [String(commitment), String(nonce), '0', String(nonce)];

    const r = await axios.post(
      `${BASE}/login`,
      { username: VICTIM, proof: fakeProof, publicSignals },  // ← victim username!
      { validateStatus: () => true }
    );

    emit({ type: 'RESULT', msg: `HTTP ${r.status} — ${JSON.stringify(r.data)}` });

    const rejected = r.status !== 200;
    emit({ type: 'CHECK',  msg: `Impersonation rejected (non-200): ${rejected ? '✅ YES' : '❌ NO — CRITICAL FAILURE'}` });

    // Also try substituting the victim's commitment in publicSignals with a forged proof
    emit({ type: 'ATTACK', msg: `Step 3: Also try substituting '${VICTIM}' commitment in publicSignals...` });

    let victimCommitment = '99999999999999999999999999999999999999999999'; // dummy if victim doesn't exist
    try {
      const { data: vData } = await axios.get(`${BASE}/commitment/${VICTIM}`);
      victimCommitment = vData.commitment || victimCommitment;
    } catch (_) { /* victim may not exist — that's fine */ }

    const r2 = await axios.post(
      `${BASE}/login`,
      {
        username:     VICTIM,
        proof:        fakeProof,
        publicSignals: [String(victimCommitment), String(nonce), '0', String(nonce)],
      },
      { validateStatus: () => true }
    );
    emit({ type: 'RESULT', msg: `HTTP ${r2.status} — ${JSON.stringify(r2.data)}` });
    const rejected2 = r2.status !== 200;
    emit({ type: 'CHECK',  msg: `Commitment substitution rejected: ${rejected2 ? '✅ YES' : '❌ NO — CRITICAL FAILURE'}` });

    emit({ type: 'EXPLAIN', msg: "The ZK circuit enforces: Poseidon(attacker_secret, attacker_salt, attacker_uname) = attacker_commitment." });
    emit({ type: 'EXPLAIN', msg: "Setting username='admin' does NOT change the proof's internal computation." });
    emit({ type: 'EXPLAIN', msg: "Proof is cryptographically bound to unameHash — substituting a different username fails at both ZKP verify and server commitment check." });

    const passed = rejected && rejected2;
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? `✅ PASS — Identity substitution blocked. Cannot impersonate '${VICTIM}'.`
        : `❌ FAIL — Impersonation succeeded! Identity binding is broken.`,
    });

    return { passed };
  },
};
