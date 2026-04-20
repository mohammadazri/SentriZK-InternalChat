// C1 — Database Breach: No Passwords Stored
// Simulates an attacker with full Supabase read access.
// PASS = no password/hash/secret column found in the users table.

const { createClient } = require('@supabase/supabase-js');
const config = require('../../config');

module.exports = {
  id:          'c1',
  name:        'DB Breach: No Passwords Stored',
  category:    'CONFIDENTIALITY',
  description: 'Simulate database breach and verify no plaintext credentials exist.',

  async run(emit) {
    emit({ type: 'ATTACK', msg: '🗄️  Simulating full Supabase database breach (service role key)...' });

    if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
      emit({ type: 'SKIP', msg: '⚠️  SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in .env — skipping C1' });
      emit({ type: 'VERDICT', passed: null, msg: 'SKIPPED — Configure Supabase credentials in .env' });
      return { passed: null };
    }

    const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    try {
      // Step 1: Read full users table (attacker perspective)
      emit({ type: 'ATTACK', msg: 'Running: SELECT * FROM users LIMIT 3' });
      const { data: users, error } = await supabase.from('users').select('*').limit(3);

      if (error) throw new Error(`Supabase error: ${error.message}`);
      if (!users || users.length === 0) {
        emit({ type: 'RESULT', msg: 'No users found — is the test account registered?' });
        return { passed: false };
      }

      // Step 2: Inspect columns from the response
      const columns = Object.keys(users[0]);
      emit({ type: 'RESULT', msg: `Columns found in users table: ${columns.join(', ')}` });

      // Step 3: Check for dangerous columns
      const DANGEROUS = /password|passwd|hash|pin|secret|key|credentials/i;
      const badCols = columns.filter((c) => DANGEROUS.test(c));

      emit({ type: 'CHECK', msg: `Dangerous columns (password/hash/secret): ${badCols.length === 0 ? '❌ NONE FOUND' : '🚨 FOUND: ' + badCols.join(', ')}` });

      // Step 4: Show a sample user row (redact partial commitment for readability)
      const sample = users[0];
      const commitment = String(sample.commitment || '');
      const commitmentPreview = commitment.length > 20
        ? `${commitment.substring(0, 20)}... (${commitment.length} chars)`
        : commitment || '(empty)';

      emit({ type: 'RESULT', msg: `Sample row → username: ${sample.username} | commitment: ${commitmentPreview}` });
      emit({ type: 'RESULT', msg: `            status: ${sample.status} | nonce: ${sample.nonce ?? 'null'} | lastLogin: ${sample.lastLogin ?? 'null'}` });

      // Step 5: Validate commitment looks like a Poseidon hash (large numeric string)
      const looksLikeHash = /^\d{40,80}$/.test(commitment);
      emit({ type: 'CHECK', msg: `Commitment is a large numeric field (Poseidon hash): ${looksLikeHash ? '✅ YES' : '❌ NO — unexpected format'}` });

      // Step 6: Attempt to "crack" commitment (demonstrate impossibility)
      emit({ type: 'EXPLAIN', msg: 'Commitment = Poseidon(secret, salt, usernameHash) on BN128 curve.' });
      emit({ type: 'EXPLAIN', msg: 'Reversing Poseidon requires solving the discrete log on BN128 → 2^128 operations.' });
      emit({ type: 'EXPLAIN', msg: 'Even with the commitment, login requires a valid Groth16 ZK proof — not just the committed value.' });

      const passed = badCols.length === 0 && looksLikeHash;
      emit({
        type:   'VERDICT',
        passed,
        msg:    passed
          ? '✅ PASS — Database breach reveals ZERO usable credentials. Only Poseidon commitments stored.'
          : `❌ FAIL — Unexpected columns detected: ${badCols.join(', ')}`,
      });

      return { passed };
    } catch (err) {
      emit({ type: 'ERROR', msg: `C1 error: ${err.message}` });
      emit({ type: 'VERDICT', passed: false, msg: '❌ FAIL — Test encountered an error.' });
      return { passed: false };
    }
  },
};
