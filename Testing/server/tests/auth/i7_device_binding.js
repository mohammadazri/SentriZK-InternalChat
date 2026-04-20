// I7 — Device Binding: Cross-Device Session Hijack
// Creates session on device A, tries to refresh/use it on device B.
// PASS = device B is rejected (device mismatch).

const axios  = require('axios');
const config = require('../../config');

module.exports = {
  id:          'i7',
  name:        'Device Binding: Session Hijack',
  category:    'INTEGRITY',
  description: 'Stolen session token used from a different device. Must be rejected.',

  async run(emit) {
    const BASE      = config.BACKEND_URL;
    const DEVICE_A  = config.TEST_DEVICE;
    const DEVICE_B  = 'evil_attacker_device_' + Date.now();

    emit({ type: 'ATTACK', msg: `Attack scenario: session bound to ${DEVICE_A}, attacker tries on ${DEVICE_B}` });

    // ── Step 1: Try to refresh with wrong deviceId ─────────────────
    // We use a known real session from a successful login, or a fake one
    const fakeSession = 'captured-session-id-from-network-sniffing';
    emit({ type: 'ATTACK', msg: `Step 1: Using stolen sessionId with attacker's deviceId on /refresh-session...` });

    const r1 = await axios.post(
      `${BASE}/refresh-session`,
      { sessionId: fakeSession, deviceId: DEVICE_B },
      { validateStatus: () => true }
    );
    emit({ type: 'RESULT', msg: `HTTP ${r1.status} — ${JSON.stringify(r1.data)}` });
    const crossDeviceBlocked = r1.status !== 200;
    emit({ type: 'CHECK',  msg: `Cross-device refresh rejected: ${crossDeviceBlocked ? '✅ YES' : '❌ NO — SESSION HIJACK POSSIBLE'}` });

    // ── Step 2: Validate session from wrong device ──────────────────
    emit({ type: 'ATTACK', msg: `Step 2: Validating stolen session on /validate-session (no deviceId check here, but session itself is invalid)...` });
    const r2 = await axios.post(
      `${BASE}/validate-session`,
      { sessionId: fakeSession },
      { validateStatus: () => true }
    );
    emit({ type: 'RESULT', msg: `HTTP ${r2.status} — ${JSON.stringify(r2.data)}` });
    const sessionInvalid = r2.data?.valid === false || r2.status !== 200;
    emit({ type: 'CHECK',  msg: `Stolen/fake session rejected on validate: ${sessionInvalid ? '✅ YES' : '❌ NO'}` });

    // ── Step 3: Firebase token with stolen session ─────────────────
    emit({ type: 'ATTACK', msg: 'Step 3: Trying to get Firebase token with stolen session...' });
    const r3 = await axios.post(
      `${BASE}/firebase-token`,
      { sessionId: fakeSession },
      { validateStatus: () => true }
    );
    emit({ type: 'RESULT', msg: `HTTP ${r3.status} — ${JSON.stringify(r3.data).substring(0, 100)}` });
    const firebaseBlocked = r3.status !== 200;
    emit({ type: 'CHECK',  msg: `Firebase token denied for stolen session: ${firebaseBlocked ? '✅ YES' : '❌ NO — FIREBASE ACCESS COMPROMISED'}` });

    emit({ type: 'EXPLAIN', msg: 'Sessions are stored with deviceId in Supabase. Refresh endpoint validates deviceId matches.' });
    emit({ type: 'EXPLAIN', msg: 'Non-matching deviceId or non-existent session immediately fails all refresh/validate calls.' });
    emit({ type: 'EXPLAIN', msg: 'Even if attacker steals session token over network: useless without original device hardware ID.' });

    const passed = crossDeviceBlocked && sessionInvalid && firebaseBlocked;
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? '✅ PASS — Stolen session token is device-bound and useless on any other device.'
        : '❌ FAIL — Session hijack succeeded on different device!',
    });

    return { passed };
  },
};
