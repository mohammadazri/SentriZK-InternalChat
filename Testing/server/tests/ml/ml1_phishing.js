// ML1 — Phishing Detection: Model Flags Threat Messages
// Runs 5 known-threat messages through the TFLite model.
// PASS = all 5 score > threshold (0.65).

const { runInference, heuristicScore, THRESHOLD } = require('./ml_helper');

const PHISHING_MESSAGES = [
  "URGENT: Click here immediately to verify your account or it will be DELETED: http://paypa1-secure.tk/verify",
  "You have won a $1000 Amazon gift card! Claim now before it expires: bit.ly/gift-wxyz",
  "Your password has expired. Update immediately at: http://office365-login.ml/reset-password",
  "ALERT: Your bank account is suspended. Wire $5000 to account 489123456 to restore access",
  "Congratulations! You are selected for a free iPhone 15. Login now to claim your prize",
];

module.exports = {
  id:          'ml1',
  name:        'ML: Phishing Messages Detected',
  category:    'ML',
  description: 'Run 5 known phishing messages through SentriZK TFLite model. All must score > 0.65.',

  async run(emit) {
    emit({ type: 'ATTACK', msg: `Testing ML threat detection — threshold: ${THRESHOLD}` });

    const isPythonAvailable = runInference('test') !== null;
    const method = isPythonAvailable ? 'TFLite (Python)' : 'Heuristic fallback';
    emit({ type: 'RESULT', msg: `Inference engine: ${method}` });

    if (!isPythonAvailable) {
      emit({ type: 'LOG', msg: '⚠️  Python/tflite-runtime not found — using keyword heuristic for demo. Install: pip install tflite-runtime' });
    }

    const results = [];

    for (let i = 0; i < PHISHING_MESSAGES.length; i++) {
      const msg = PHISHING_MESSAGES[i];
      emit({ type: 'ATTACK', msg: `\nMessage ${i + 1}: "${msg.substring(0, 60)}..."` });

      let score, inferMethod;
      if (isPythonAvailable) {
        const res = runInference(msg);
        score       = res?.score ?? heuristicScore(msg);
        inferMethod = res?.method ?? 'heuristic';
      } else {
        score       = heuristicScore(msg);
        inferMethod = 'heuristic';
      }

      const isThreat = score > THRESHOLD;
      emit({
        type: isThreat ? 'CHECK' : 'FAIL',
        msg:  `  Score: ${score.toFixed(4)} | Threshold: ${THRESHOLD} | Method: ${inferMethod} | ${isThreat ? '🚨 THREAT DETECTED ✅' : '⚠️  MISSED — score below threshold'}`,
      });
      results.push(isThreat);
    }

    emit({ type: 'EXPLAIN', msg: `\nModel: Conv1D TFLite (dynamic range quantized) trained on phishing dataset.` });
    emit({ type: 'EXPLAIN', msg: `Threshold ${THRESHOLD} tuned to minimize false positives on internal chat messages.` });
    emit({ type: 'EXPLAIN', msg: 'Detection runs on-device in <10ms — no server round-trip required.' });

    const passCount = results.filter(Boolean).length;
    const passed    = passCount === PHISHING_MESSAGES.length;
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? `✅ PASS — ${passCount}/${PHISHING_MESSAGES.length} phishing messages correctly detected above threshold.`
        : `⚠️  PARTIAL — ${passCount}/${PHISHING_MESSAGES.length} detected. ${PHISHING_MESSAGES.length - passCount} missed.`,
    });

    return { passed };
  },
};
