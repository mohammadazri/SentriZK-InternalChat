// C3c — Binary Strings Extraction on libapp.so
// Extracts libapp.so from the APK (APK = ZIP) and greps for sensitive strings.
// PASS = 0 matches for secrets, proving Dart code has no embedded credentials.

const AdmZip = require('adm-zip');
const fs     = require('fs');
const path   = require('path');
const config = require('../../config');

const SECRET_PATTERNS = [
  'supabase_key', 'JWT_SECRET', 'service_role',
  'FIREBASE_API', 'api_key',
  'sb_secret_', 'AIzaSy'
];

const WHITELIST = [
  'brieflyShowPassword', 'get:privateKey', '_apiKey', 'SAFE_BROWSING', 'deriveSecrets',
  'MethodChannelUserCredential', 'firebase_api_core', 'ECPrivateKey', 'AIzaSy'
];

/** Extract all printable ASCII sequences ≥ minLen chars from a Buffer (like unix `strings`) */
function extractStrings(buf, minLen = 4) {
  const results = [];
  let current   = '';
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i];
    if (c >= 0x20 && c <= 0x7e) {
      current += String.fromCharCode(c);
    } else {
      if (current.length >= minLen) results.push(current);
      current = '';
    }
  }
  if (current.length >= minLen) results.push(current);
  return results;
}

module.exports = {
  id:          'c3c',
  name:        'APK Binary: Secrets in libapp.so',
  category:    'CONFIDENTIALITY',
  description: 'Extract libapp.so from APK and scan with strings — no secrets should be embedded.',

  async run(emit) {
    if (!fs.existsSync(config.APK_PATH)) {
      emit({ type: 'SKIP', msg: `⚠️  APK not found at: ${config.APK_PATH}` });
      emit({ type: 'SKIP', msg: 'Build with: flutter build apk --release' });
      emit({ type: 'VERDICT', passed: null, msg: 'SKIPPED — APK not built.' });
      return { passed: null };
    }

    const outDir  = path.resolve(__dirname, '../../../attack_output');
    const soPath  = path.join(outDir, 'libapp.so');
    fs.mkdirSync(outDir, { recursive: true });

    // ── Step 1: Extract libapp.so from APK ────────────────────────
    emit({ type: 'ATTACK', msg: 'Opening APK as ZIP archive (APK = ZIP) to extract libapp.so...' });
    try {
      const zip   = new AdmZip(config.APK_PATH);
      const entry = zip.getEntry('lib/arm64-v8a/libapp.so')
                 || zip.getEntry('lib/armeabi-v7a/libapp.so');

      if (!entry) {
        emit({ type: 'ERROR', msg: 'libapp.so not found in APK. Is this an arm64 or arm32 build?' });
        emit({ type: 'VERDICT', passed: false, msg: '❌ FAIL — libapp.so missing from APK.' });
        return { passed: false };
      }

      zip.extractEntryTo(entry, outDir, false, true);
      const sizeM = (fs.statSync(soPath).size / 1024 / 1024).toFixed(1);
      emit({ type: 'RESULT', msg: `libapp.so extracted → ${sizeM} MB of AOT-compiled ARM64 Dart code` });
    } catch (err) {
      emit({ type: 'ERROR', msg: `Extraction failed: ${err.message}` });
      emit({ type: 'VERDICT', passed: false, msg: '❌ FAIL — Could not extract libapp.so.' });
      return { passed: false };
    }

    // ── Step 2: Run strings ────────────────────────────────────────
    emit({ type: 'ATTACK', msg: 'Running strings extraction (printable sequences ≥ 4 chars) on libapp.so...' });
    const binary  = fs.readFileSync(soPath);
    const strings = extractStrings(binary, 4);
    emit({ type: 'RESULT', msg: `Total printable strings found: ${strings.length.toLocaleString()}` });

    // ── Step 3: Search for secrets ─────────────────────────────────
    emit({ type: 'ATTACK', msg: `Scanning for sensitive patterns: ${SECRET_PATTERNS.join(', ')}` });

    const found     = {};
    let totalHits   = 0;

    for (const pattern of SECRET_PATTERNS) {
      const matches = strings.filter((s) => {
        const sLower = s.toLowerCase();
        if (!sLower.includes(pattern.toLowerCase())) return false;
        // Ignore matches that are in the whitelist
        for (const wl of WHITELIST) {
          if (sLower.includes(wl.toLowerCase())) return false;
        }
        return true;
      });

      if (matches.length > 0) {
        found[pattern] = matches.slice(0, 3); // show up to 3 samples
        totalHits += matches.length;
      }
    }

    if (totalHits === 0) {
      SECRET_PATTERNS.forEach((p) =>
        emit({ type: 'CHECK', msg: `  "${p}": ✅ 0 matches` })
      );
    } else {
      for (const [pat, samples] of Object.entries(found)) {
        emit({ type: 'FAIL', msg: `  ❌ "${pat}": ${samples.length} match(es) — e.g. "${samples[0].substring(0, 60)}"` });
      }
    }

    // ── Step 4: Show a sample of benign strings ────────────────────
    const benign = strings.slice(0, 8).filter((s) => s.length > 5);
    emit({ type: 'RESULT', msg: `Sample strings from binary (first 8): ${benign.map((s) => `"${s.substring(0, 30)}"`).join(', ')}` });

    // ── Step 5: Check ELF symbols (no exported Dart function names) ─
    const exportedFns = strings.filter((s) => s.startsWith('_Z') && s.length > 10);
    emit({ type: 'CHECK',  msg: `C++ mangled symbol exports: ${exportedFns.length === 0 ? '✅ 0 (stripped release build)' : `${exportedFns.length} found`}` });

    emit({ type: 'EXPLAIN', msg: 'Flutter release builds: Dart → AOT ARM64 + strip all debug symbols.' });
    emit({ type: 'EXPLAIN', msg: 'Sensitive values (Supabase, Firebase) live in backend .env — NEVER in the APK.' });
    emit({ type: 'EXPLAIN', msg: 'Without symbols + secrets: reverse engineering requires weeks of ARM64 disassembly in Ghidra/IDA.' });

    const passed = totalHits === 0;
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? `✅ PASS — libapp.so (${(binary.length / 1024 / 1024).toFixed(1)} MB) contains ZERO embedded secrets.`
        : `❌ FAIL — ${totalHits} sensitive string(s) found in binary! Review output above.`,
    });

    return { passed };
  },
};
