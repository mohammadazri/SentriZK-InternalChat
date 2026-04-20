// C3a — jadx APK Decompilation
// Runs jadx CLI on the release APK and checks decompiled output for Dart logic/secrets.
// PASS = 0 Dart source recovered, 0 secret matches in decompiled Java.

const { spawn, execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const config = require('../../config');

module.exports = {
  id:          'c3a',
  name:        'APK Decompile: jadx (No Dart Logic)',
  category:    'CONFIDENTIALITY',
  description: 'Decompile the release APK with jadx. Dart code must NOT be visible.',

  async run(emit) {
    // ── Check jadx installed ───────────────────────────────────────
    emit({ type: 'ATTACK', msg: 'Checking jadx installation...' });
    const jadxJar = path.resolve(__dirname, '../../../../Testing/script/jadx-1.5.3-all.jar');
    
    if (!fs.existsSync(jadxJar)) {
      emit({ type: 'SKIP', msg: `⚠️  jadx jar not found at ${jadxJar}` });
      emit({ type: 'SKIP', msg: 'Add jadx/bin/ to your system PATH and restart the server.' });
      emit({ type: 'VERDICT', passed: null, msg: 'SKIPPED — jadx not installed.' });
      return { passed: null };
    }

    // ── Check APK exists ───────────────────────────────────────────
    emit({ type: 'ATTACK', msg: `Checking APK at: ${config.APK_PATH}` });
    if (!fs.existsSync(config.APK_PATH)) {
      emit({ type: 'SKIP', msg: `⚠️  APK not found. Build it first: flutter build apk --release` });
      emit({ type: 'SKIP', msg: `Expected at: ${config.APK_PATH}` });
      emit({ type: 'VERDICT', passed: null, msg: 'SKIPPED — APK not built yet.' });
      return { passed: null };
    }
    const size = (fs.statSync(config.APK_PATH).size / 1024 / 1024).toFixed(1);
    emit({ type: 'RESULT', msg: `APK found: ${path.basename(config.APK_PATH)} (${size} MB)` });

    // ── Run jadx ──────────────────────────────────────────────────
    const outDir = path.resolve(__dirname, '../../../attack_output/jadx_decompiled');
    if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true });

    emit({ type: 'ATTACK', msg: `Running: java -cp jadx-1.5.3-all.jar jadx.cli.JadxCLI -d attack_output/jadx_decompiled/ ${path.basename(config.APK_PATH)}` });
    emit({ type: 'LOG',    msg: 'This may take 30–60 seconds...' });

    await new Promise((resolve, reject) => {
      const proc = spawn('java', ['-cp', jadxJar, 'jadx.cli.JadxCLI', '-d', outDir, '--show-bad-code', config.APK_PATH], { timeout: 120000 });
      proc.stdout.on('data', (d) => emit({ type: 'LOG', msg: d.toString().trim() }));
      proc.stderr.on('data', (d) => emit({ type: 'LOG', msg: d.toString().trim() }));
      proc.on('close', resolve);
      proc.on('error', reject);
    });

    // ── Analyse decompiled output ──────────────────────────────────
    emit({ type: 'ATTACK', msg: 'Analysing decompiled output...' });

    function walkDir(dir) {
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir, { recursive: true })
        .map((f) => path.join(dir, f))
        .filter((f) => fs.statSync(f).isFile());
    }

    const allFiles  = walkDir(outDir);
    const javaFiles = allFiles.filter((f) => f.endsWith('.java'));
    emit({ type: 'RESULT', msg: `Total decompiled Java files: ${javaFiles.length}` });

    // Dart files — should be ZERO
    const dartFiles = javaFiles.filter((f) => f.toLowerCase().includes('dart') || f.includes('AppBundle') || f.includes('flutter_engine'));
    emit({ type: 'CHECK',  msg: `Dart source files recovered: ${dartFiles.length === 0 ? '✅ 0 (Dart is AOT ARM64 — not decompilable)' : `❌ ${dartFiles.length}`}` });

    // Check for recognisable Flutter shell classes
    const shellClasses = javaFiles.filter((f) =>
      f.includes('FlutterActivity') || f.includes('FlutterFragment') || f.includes('GeneratedPluginRegistrant')
    );
    emit({ type: 'RESULT', msg: `Flutter shell classes found: ${shellClasses.length} (expected — Java plugin stubs only)` });

    // Search for secrets (avoid strings like 'password' that hit Google GMS APIs)
    const SECRETS = ['supabase_key', 'JWT_SECRET', 'service_role', 'FIREBASE_API', 'encryptMessage', 'snarkjs', 'commitment'];
    let totalMatches = 0;
    const secretMatches = {};

    for (const jf of javaFiles) {
      const content = fs.readFileSync(jf, 'utf8').toLowerCase();
      for (const s of SECRETS) {
        if (content.includes(s.toLowerCase())) {
          secretMatches[s] = (secretMatches[s] || 0) + 1;
          totalMatches++;
        }
      }
    }

    if (totalMatches === 0) {
      emit({ type: 'CHECK', msg: '✅ Secret scan: 0 matches across all decompiled files' });
    } else {
      for (const [s, c] of Object.entries(secretMatches)) {
        emit({ type: 'FAIL', msg: `❌ "${s}" found ${c} time(s) in decompiled output!` });
      }
    }

    emit({ type: 'EXPLAIN', msg: 'Flutter compiles Dart → AOT native ARM64 machine code (libapp.so).' });
    emit({ type: 'EXPLAIN', msg: 'jadx is a Java decompiler — it cannot decompile native ARM64 binaries.' });
    emit({ type: 'EXPLAIN', msg: 'All business logic (auth, ZKP, E2EE) is inside libapp.so — invisible to jadx.' });

    const passed = dartFiles.length === 0 && totalMatches === 0;
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? '✅ PASS — jadx recovered ZERO Dart source code and ZERO secrets from the APK.'
        : `❌ FAIL — Secrets or Dart logic found in decompiled output! Matches: ${totalMatches}`,
    });

    return { passed };
  },
};
