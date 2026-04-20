// ML2 — Safe Messages: Model Does NOT Flag Normal Chat
// PASS = all safe messages score <= threshold (0.65).

const { runInference, heuristicScore, THRESHOLD } = require('./ml_helper');

const SAFE_MESSAGES = [
  "Hey, are we meeting in the conference room at 3pm today?",
  "Can you review the Q2 report before the board meeting tomorrow?",
  "The server deployment went fine, no issues found during testing",
  "Happy birthday to the team! There is cake in the kitchen",
  "Please share the updated project timeline when you have a chance",
  "The firewall rules were updated successfully this morning",
];

module.exports = {
  id:          'ml2',
  name:        'ML: Safe Messages Pass Through',
  category:    'ML',
  description: 'Run 6 normal work messages through the model. All must score <= 0.65 (no false positives).',

  async run(emit) {
    emit({ type: 'ATTACK', msg: `Testing ML false-positive rate — safe messages must score ≤ ${THRESHOLD}` });

    const isPythonAvailable = runInference('test') !== null;
    emit({ type: 'RESULT', msg: `Inference engine: ${isPythonAvailable ? 'TFLite (Python)' : 'Heuristic fallback'}` });

    const results = [];

    for (let i = 0; i < SAFE_MESSAGES.length; i++) {
      const msg = SAFE_MESSAGES[i];
      emit({ type: 'ATTACK', msg: `\nMessage ${i + 1}: "${msg}"` });

      let score;
      if (isPythonAvailable) {
        const res = runInference(msg);
        score = res?.score ?? heuristicScore(msg);
      } else {
        score = heuristicScore(msg);
      }

      const isSafe = score <= THRESHOLD;
      emit({
        type: isSafe ? 'CHECK' : 'FAIL',
        msg:  `  Score: ${score.toFixed(4)} | Threshold: ${THRESHOLD} | ${isSafe ? '✅ SAFE — passed through correctly' : '❌ FALSE POSITIVE — normal message flagged as threat!'}`,
      });
      results.push(isSafe);
    }

    emit({ type: 'EXPLAIN', msg: 'Low false-positive rate is critical for a workplace chat app.' });
    emit({ type: 'EXPLAIN', msg: 'Model trained on contrast examples to distinguish phishing from normal corporate language.' });

    const passCount = results.filter(Boolean).length;
    const passed    = passCount === SAFE_MESSAGES.length;
    emit({
      type:   'VERDICT',
      passed,
      msg:    passed
        ? `✅ PASS — All ${SAFE_MESSAGES.length} safe messages correctly pass through (no false positives).`
        : `⚠️  ${SAFE_MESSAGES.length - passCount} false positive(s) detected. Model may need retraining.`,
    });

    return { passed };
  },
};
