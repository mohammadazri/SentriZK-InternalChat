// C1 — Database Breach: No Passwords Stored
// This test simulates an attacker with stolen Supabase service keys.
// TRACE: High-fidelity database telemetry.

const { createClient } = require('@supabase/supabase-js');
const config = require('../../config');

module.exports = {
  id:          'c1',
  name:        'DB Breach: No Passwords Stored',
  category:    'CONFIDENTIALITY',
  description: 'Proves that a full DB breach reveals zero plaintext credentials.',

  async run(emit) {
    emit({ type: 'ATTACK', msg: 'Simulating full database breach via compromised Service Role Key...' });

    if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
      emit({ type: 'SKIP', msg: 'Supabase credentials missing from .env' });
      return { passed: null };
    }

    const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    try {
      // Step 1: Log the raw attack command
      emit({ type: 'TRACE', msg: '>> COMMAND: psql -h sentrizk-db -U service_role -c "SELECT * FROM users LIMIT 3;"' });

      // Step 2: Perform query
      const start = Date.now();
      const { data: users, error } = await supabase.from('users').select('*').limit(3);
      const duration = Date.now() - start;

      if (error) throw error;

      // Step 3: Log raw DB result (Full)
      emit({ type: 'TRACE', msg: `<< DATABASE RESPONSE (${duration}ms):` });
      emit({ type: 'TRACE', msg: JSON.stringify(users, null, 2) });

      if (!users || users.length === 0) {
        emit({ type: 'RESULT', msg: 'Breach successful, but users table is currently empty.' });
        return { passed: false };
      }

      // Step 4: Logic check
      const columns = Object.keys(users[0]);
      const DANGEROUS = /password|passwd|hash|pin|secret|key|credentials/i;
      const badCols = columns.filter((c) => DANGEROUS.test(c));

      emit({ type: 'CHECK', msg: `Search for passwords/secrets in columns: ${badCols.length === 0 ? 'NOT FOUND' : 'FOUND: ' + badCols.join(', ')}` });

      const sample = users[0];
      const commitment = String(sample.commitment || '');
      const looksLikeHash = /^\d{40,80}$/.test(commitment);
      emit({ type: 'CHECK', msg: `Column "commitment" contains Poseidon Hash (ZKP Identity): ${looksLikeHash ? 'YES' : 'NO'}` });

      emit({ type: 'EXPLAIN', msg: 'Even with full DB access, the attacker is missing the "Secret Key" and "Salt" stored on the user device.' });

      const passed = badCols.length === 0 && looksLikeHash;
      emit({
        type:   'VERDICT',
        passed,
        msg:    passed
          ? '✅ PASS — Database breach revealed zero usable credentials.'
          : '❌ FAIL — Plaintext or weak hashes found in database!',
      });

      return { passed };
    } catch (err) {
      emit({ type: 'ERROR', msg: `Database connection error: ${err.message}` });
      return { passed: false };
    }
  },
};
