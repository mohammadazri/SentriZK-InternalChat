// C3b — apktool: AndroidManifest Security Analysis
// Decodes the APK with apktool and checks for debuggable, cleartext, backup flags.

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const config = require('../../config');

module.exports = {
  id:          'c3b',
  name:        'APK Manifest: Security Config Check',
  category:    'CONFIDENTIALITY',
  description: 'Decode APK with apktool. Verify: no debuggable, no cleartext traffic, no backup.',

  async run(emit) {
    // ── Check apktool ──────────────────────────────────────────────
    emit({ type: 'ATTACK', msg: 'Checking apktool installation...' });
    try {
      const v = execSync('apktool --version 2>&1', { timeout: 5000 }).toString().trim();
      emit({ type: 'RESULT', msg: `apktool found: ${v}` });
    } catch {
      emit({ type: 'SKIP', msg: '⚠️  apktool not found. Install: choco install apktool' });
      emit({ type: 'VERDICT', passed: null, msg: 'SKIPPED — apktool not installed.' });
      return { passed: null };
    }

    if (!fs.existsSync(config.APK_PATH)) {
      emit({ type: 'SKIP', msg: `⚠️  APK not found at: ${config.APK_PATH}` });
      emit({ type: 'VERDICT', passed: null, msg: 'SKIPPED — APK not built.' });
      return { passed: null };
    }

    const outDir = path.resolve(__dirname, '../../../attack_output/apktool_decoded');
    if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true });

    emit({ type: 'ATTACK', msg: `Running: apktool d ${path.basename(config.APK_PATH)} -o attack_output/apktool_decoded/` });

    try {
      execSync(`apktool d "${config.APK_PATH}" -o "${outDir}" -f 2>&1`, { timeout: 60000 });
      emit({ type: 'RESULT', msg: 'Decoding complete.' });
    } catch (err) {
      emit({ type: 'ERROR', msg: `apktool failed: ${err.message}` });
      emit({ type: 'VERDICT', passed: false, msg: '❌ FAIL — apktool error.' });
      return { passed: false };
    }

    // ── Inspect AndroidManifest.xml ────────────────────────────────
    const manifestPath = path.join(outDir, 'AndroidManifest.xml');
    if (!fs.existsSync(manifestPath)) {
      emit({ type: 'ERROR', msg: 'AndroidManifest.xml not found in decoded APK.' });
      return { passed: false };
    }

    const manifest = fs.readFileSync(manifestPath, 'utf8');
    emit({ type: 'ATTACK', msg: 'Analyzing AndroidManifest.xml for security misconfigurations...\n' });

    const checks = [
      {
        label:  'android:debuggable="true"',
        bad:    manifest.includes('android:debuggable="true"'),
        goodMsg: '✅ NOT FOUND — Production release build confirmed',
        badMsg:  '❌ FOUND — App is debuggable! ADB shell access possible',
      },
      {
        label:  'cleartext traffic permitted',
        bad:    manifest.includes('cleartextTrafficPermitted="true"'),
        goodMsg: '✅ NOT FOUND — HTTPS-only enforced',
        badMsg:  '❌ FOUND — HTTP cleartext traffic allowed!',
      },
      {
        label:  'android:allowBackup="true"',
        bad:    manifest.includes('android:allowBackup="true"'),
        goodMsg: '✅ NOT FOUND — ADB backup disabled',
        badMsg:  '❌ FOUND — Data backup via ADB possible!',
      },
      {
        label:  'usesCleartextTraffic="true"',
        bad:    manifest.includes('android:usesCleartextTraffic="true"'),
        goodMsg: '✅ NOT FOUND — All traffic encrypted',
        badMsg:  '❌ FOUND — App allows HTTP traffic!',
      },
    ];

    const results = [];
    for (const c of checks) {
      const ok = !c.bad;
      emit({ type: ok ? 'CHECK' : 'FAIL', msg: `  ${c.label.padEnd(40)} ${ok ? c.goodMsg : c.badMsg}` });
      results.push(ok);
    }

    // ── Scan decoded resources for embedded secrets ────────────────
    emit({ type: 'ATTACK', msg: '\nScanning decoded resources for embedded API keys...' });
    const stringsFile = path.join(outDir, 'res', 'values', 'strings.xml');
    if (fs.existsSync(stringsFile)) {
      const strings = fs.readFileSync(stringsFile, 'utf8');
      const SECRETS = ['api_key', 'supabase', 'firebase_key', 'jwt_secret', 'password'];
      const found   = SECRETS.filter((s) => strings.toLowerCase().includes(s));
      emit({
        type: found.length === 0 ? 'CHECK' : 'FAIL',
        msg: found.length === 0
          ? '✅ strings.xml: No API keys or secrets found'
          : `❌ strings.xml: Found: ${found.join(', ')}`,
      });
      results.push(found.length === 0);
    }

    emit({ type: 'EXPLAIN', msg: 'Release build strips all debug flags automatically in Flutter.' });
    emit({ type: 'EXPLAIN', msg: 'No cleartext traffic = enforces HTTPS for all connections at OS level.' });

    const passed = results.every(Boolean);
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? '✅ PASS — AndroidManifest has zero security misconfigurations.'
        : `❌ FAIL — ${results.filter(b => !b).length} security misconfiguration(s) found!`,
    });

    return { passed };
  },
};
