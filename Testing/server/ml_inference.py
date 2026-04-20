# ml_inference.py — Python helper for TFLite inference
# Because Node.js doesn't have great TFLite bindings, we spawn Python.
# Expects JSON array on stdin; output is a JSON array of predictions.
# Output: a single float (threat score 0.0–1.0)

import sys
import json
import os
import struct

def tokenize(text, vocab, max_len=120, oov_index=1):
    words  = text.lower().split()
    tokens = [vocab.get(w, oov_index) for w in words]
    # Pad or truncate to max_len
    if len(tokens) >= max_len:
        tokens = tokens[:max_len]
    else:
        tokens = tokens + [0] * (max_len - len(tokens))
    return tokens

def run_tflite(message, model_path, vocab_path, max_len=120):
    with open(vocab_path, 'r', encoding='utf-8') as f:
        vocab = json.load(f)

    tokens = tokenize(message, vocab, max_len)

    # Try tflite-runtime first, then fallback to tensorflow
    try:
        import tflite_runtime.interpreter as tflite
        interpreter = tflite.Interpreter(model_path=model_path)
    except ImportError:
        try:
            import tensorflow as tf
            interpreter = tf.lite.Interpreter(model_path=model_path)
        except ImportError:
            # Neither available — return a deterministic heuristic score
            # based on simple keyword matching (for demonstration only)
            keywords = ['click', 'verify', 'urgent', 'account', 'suspended',
                        'password', 'login', 'bank', 'wire', 'transfer',
                        'won', 'prize', 'gift', 'free', 'claim', 'amazon', 'update', 'immediately']
            lower = message.lower()
            hits  = sum(1 for k in keywords if k in lower)
            score = min((hits * 0.4) + 0.1, 0.99) if hits > 0 else 0.0
            print(f'{score:.4f}|heuristic', flush=True)
            return

    interpreter.allocate_tensors()
    inp = interpreter.get_input_details()
    out = interpreter.get_output_details()

    import numpy as np
    input_data = np.array([tokens], dtype=np.float32)
    interpreter.set_tensor(inp[0]['index'], input_data)
    interpreter.invoke()
    score = float(interpreter.get_tensor(out[0]['index'])[0][0])
    print(f'{score:.4f}|tflite', flush=True)

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print('Usage: python ml_inference.py <message> <model_path> <vocab_path> [max_len]')
        sys.exit(1)

    message    = sys.argv[1]
    model_path = sys.argv[2]
    vocab_path = sys.argv[3]
    max_len    = int(sys.argv[4]) if len(sys.argv) > 4 else 120

    try:
        run_tflite(message, model_path, vocab_path, max_len)
    except Exception as e:
        print(f'0.0000|error:{e}', flush=True)
