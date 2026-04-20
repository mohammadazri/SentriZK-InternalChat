// Shared helper used by ml1, ml2, ml3
// Runs ml_inference.py via Python subprocess and parses the score.

const { execFileSync } = require('child_process');
const path = require('path');
const config = require('../../config');

const INFERENCE_SCRIPT = path.resolve(__dirname, '../../ml_inference.py');
const THRESHOLD = 0.65;

/**
 * Run the TFLite model on a message and return { score, method }.
 * Returns null if Python is not available.
 */
function runInference(message) {
  try {
    const out = execFileSync('python', [
      INFERENCE_SCRIPT,
      message,
      config.ML_MODEL_PATH,
      config.ML_VOCAB_PATH,
      '120',
    ], { timeout: 15000, encoding: 'utf8' }).trim();

    const [scoreStr, method] = out.split('|');
    const score = parseFloat(scoreStr);
    return { score, method: method || 'tflite' };
  } catch (err) {
    // python not found or error
    return null;
  }
}

/**
 * Heuristic fallback when Python/TFLite is not available.
 * Simple keyword-based score for demonstration.
 */
function heuristicScore(text) {
  const THREAT_WORDS = [
    'click', 'verify', 'urgent', 'account', 'suspended', 'password',
    'login', 'bank', 'wire', 'transfer', 'won', 'prize', 'gift', 'free',
    'claim', 'confirm', 'immediately', 'expire', 'locked', 'reset',
  ];
  const lower = text.toLowerCase();
  const hits  = THREAT_WORDS.reduce((acc, w) => acc + (lower.includes(w) ? 1 : 0), 0);
  return Math.min(hits / 4.5, 0.99);
}

module.exports = { runInference, heuristicScore, THRESHOLD };
