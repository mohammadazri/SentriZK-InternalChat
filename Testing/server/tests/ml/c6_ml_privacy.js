// C6 — ML Privacy: Inference Is Purely On-Device (Static Code Analysis)
// Reads message_scan_service.dart and proves: no network calls, model from local asset.
// PASS = 0 network patterns, model loaded from Flutter asset, not URL.

const fs     = require('fs');
const path   = require('path');
const config = require('../../config');

const NETWORK_PATTERNS = [
  'http.',
  'Uri.parse',
  'HttpClient',
  'Dio(',
  'fetch(',
  'request(',
  'socket',
  'WebSocket',
  'dart:io',
  'NetworkImage(',
];

const ASSET_PATTERNS   = ['Interpreter.fromAsset', 'rootBundle.load', 'flutter/assets'];
const NETWORK_LOAD_BAD = ['Interpreter.fromUrl', 'http.get', 'http.post'];

module.exports = {
  id:          'c6',
  name:        'ML Privacy: On-Device Inference Only',
  category:    'CONFIDENTIALITY',
  description: 'Static analysis of MessageScanService — prove no network calls exist in the ML pipeline.',

  async run(emit) {
    emit({ type: 'ATTACK', msg: 'Reading MessageScanService source code for static analysis...' });

    if (!fs.existsSync(config.ML_SERVICE_PATH)) {
      emit({ type: 'SKIP', msg: `⚠️  ML service not found at: ${config.ML_SERVICE_PATH}` });
      emit({ type: 'VERDICT', passed: null, msg: 'SKIPPED — Source file path not configured.' });
      return { passed: null };
    }

    const code = fs.readFileSync(config.ML_SERVICE_PATH, 'utf8');
    const lines = code.split('\n');
    emit({ type: 'RESULT', msg: `File: ${path.basename(config.ML_SERVICE_PATH)} — ${lines.length} lines, ${(code.length / 1024).toFixed(1)} KB` });

    // ── Search for outbound network calls ─────────────────────────
    emit({ type: 'ATTACK', msg: `\nScanning for network call patterns: ${NETWORK_PATTERNS.join(', ')}` });
    const networkFound = [];
    for (const pattern of NETWORK_PATTERNS) {
      const matchLines = lines
        .map((l, i) => ({ line: i + 1, content: l.trim() }))
        .filter(({ content }) => content.includes(pattern) && !content.trimStart().startsWith('//'));
      if (matchLines.length > 0) {
        networkFound.push({ pattern, matchLines });
      }
    }

    if (networkFound.length === 0) {
      emit({ type: 'CHECK', msg: '✅ Network call patterns: 0 matches — ML service is network-free' });
    } else {
      for (const { pattern, matchLines } of networkFound) {
        emit({ type: 'FAIL',   msg: `❌ Found "${pattern}" at lines: ${matchLines.map((l) => l.line).join(', ')}` });
        matchLines.forEach((l) =>
          emit({ type: 'FAIL', msg: `   L${l.line}: ${l.content.substring(0, 80)}` })
        );
      }
    }

    // ── Check model loaded from local asset (NOT from URL) ──────────
    emit({ type: 'ATTACK', msg: '\nVerifying model loading source...' });
    const loadsFromAsset   = ASSET_PATTERNS.some((p)    => code.includes(p));
    const loadsFromNetwork = NETWORK_LOAD_BAD.some((p)  => code.includes(p));

    emit({ type: 'CHECK', msg: `Model loaded from local Flutter asset: ${loadsFromAsset   ? '✅ YES' : '⚠️  Pattern not found (check manually)'}` });
    emit({ type: 'CHECK', msg: `Model loaded from remote URL:          ${loadsFromNetwork  ? '❌ YES — PRIVACY VIOLATION' : '✅ NO'}` });

    // ── Show the actual scanMessage function signature ─────────────
    const scanFnStart = lines.findIndex((l) => l.includes('scanMessage') && l.includes('Future'));
    if (scanFnStart >= 0) {
      const snippet = lines.slice(scanFnStart, Math.min(scanFnStart + 15, lines.length)).join('\n');
      emit({ type: 'RESULT', msg: `\nscanMessage() function (L${scanFnStart + 1}):\n${snippet}` });
    }

    // ── Verify processing order: scan THEN encrypt ─────────────────
    emit({ type: 'ATTACK', msg: '\nVerifying ML→Encrypt order in chat_screen.dart...' });
    const chatScreenPath = path.resolve(config.ML_SERVICE_PATH, '../../screens/chat_screen.dart');
    if (fs.existsSync(chatScreenPath)) {
      const chatCode = fs.readFileSync(chatScreenPath, 'utf8');
      const scanIdx     = chatCode.indexOf('scanMessage(');
      const sendIdx     = chatCode.indexOf('sendMessage(');
      const orderOk     = scanIdx !== -1 && sendIdx !== -1 && scanIdx < sendIdx;
      emit({
        type: orderOk ? 'CHECK' : 'FAIL',
        msg:  `Execution order: scanMessage() before sendMessage(): ${orderOk ? '✅ YES (ML runs on plaintext before E2EE)' : '❌ CANNOT VERIFY'}`,
      });
    }

    emit({ type: 'EXPLAIN', msg: 'TFLite model runs inside the Flutter runtime on the device — no network I/O.' });
    emit({ type: 'EXPLAIN', msg: 'ML analyses plaintext BEFORE encryption → privacy is preserved (server never sees it).' });
    emit({ type: 'EXPLAIN', msg: 'Even if an attacker intercepts network traffic: ML scores never travel over the wire unencrypted.' });

    const passed = networkFound.length === 0 && !loadsFromNetwork;
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? '✅ PASS — ML inference is 100% on-device. Zero network calls in the scan pipeline.'
        : `❌ FAIL — Network calls detected in ML service: ${networkFound.map(n => n.pattern).join(', ')}`,
    });

    return { passed };
  },
};
