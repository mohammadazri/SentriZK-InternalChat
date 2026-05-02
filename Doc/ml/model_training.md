# 🤖 SentriZK ML Training & Mobile Deployment Guide

> Dual-model training pipeline for on-device insider threat detection.  
> Produces a Bi-LSTM (research) and Conv1D (production) model from a single dataset.

---

## 1. Dataset Preparation

The model is trained on `DataSet/train_ready.csv`, a pre-processed dataset containing text messages and binary labels:

| Label | Meaning | Example |
|-------|---------|---------|
| `0` | Safe | "Good morning, how are you?" |
| `1` | Threat | "Click this link to verify your account password" |

The dataset is split **80/20** into training and validation sets using `train_test_split` with `random_state=42`.

---

## 2. Text Preprocessing and Tokenization

| Parameter | Value | Purpose |
|-----------|-------|---------|
| **Vocab Size** | 10,000 words | Top 10K most frequent words |
| **OOV Token** | `<OOV>` (index 1) | Replaces unseen words |
| **Max Length** | 120 tokens | Fixed input shape for TFLite |
| **Padding** | `post` | Zeros appended at the end |
| **Truncation** | `post` | Excess tokens trimmed from end |

**Process**:
1. Text lowercased, punctuation stripped
2. Tokenizer fitted on training set only (prevents data leakage)
3. Words mapped to integer indices
4. Sequences padded/truncated to exactly 120 tokens

**Exports**:
- `sentrizk_tokenizer.pickle` — Full Python tokenizer
- `vocab.json` — Word→index dictionary for Flutter/mobile

---

## 3. Class Imbalance Handling

Threat messages are rare compared to safe messages. To prevent the model from favoring the "Safe" class:

```python
weights = class_weight.compute_class_weight('balanced', classes=np.unique(train_labels), y=train_labels)
class_weights_dict = {0: weights[0], 1: weights[1] * 1.5}  # Extra 1.5× penalty for missing threats
```

The **1.5× multiplier** on the threat class forces the optimizer to prioritize learning threat patterns, reducing **False Negatives** (missed threats) at the cost of slightly more False Positives.

---

## 4. Architecture 1: PC Research Model (Bi-LSTM)

For maximum context awareness. Not deployable to mobile (requires Flex delegate).

```python
pc_model = tf.keras.Sequential([
    tf.keras.layers.Embedding(10000, 64, input_length=120),
    tf.keras.layers.Bidirectional(tf.keras.layers.LSTM(32, return_sequences=True)),
    tf.keras.layers.GlobalMaxPooling1D(),
    tf.keras.layers.Dense(32, activation='relu'),
    tf.keras.layers.Dropout(0.5),
    tf.keras.layers.Dense(1, activation='sigmoid')
])
```

| Layer | Output Shape | Parameters |
|-------|-------------|------------|
| Embedding(10000, 64) | (None, 120, 64) | 640,000 |
| Bidirectional(LSTM(32)) | (None, 120, 64) | ~25,000 |
| GlobalMaxPooling1D | (None, 64) | 0 |
| Dense(32, relu) | (None, 32) | 2,080 |
| Dropout(0.5) | (None, 32) | 0 |
| Dense(1, sigmoid) | (None, 1) | 33 |

**Training**:
- Optimizer: Adam
- Loss: Binary Crossentropy
- Epochs: Up to 20 with **EarlyStopping** (patience=3, restores best weights)
- Class weights applied
- Batch size: 32

**Why not mobile?** LSTMs use `FlexTensorListReserve` internally — requires the massive `tensorflow-lite-select-tf-ops` Flex Delegate library which is unstable on `tflite_flutter` v0.12+.

---

## 5. Architecture 2: Mobile Production Model (Conv1D)

**100% native TFLite compatible** — all operations are built-in ops.

```python
mobile_model = tf.keras.Sequential([
    tf.keras.layers.Embedding(10000, 64, input_length=120),
    tf.keras.layers.Conv1D(128, 5, activation='relu'),
    tf.keras.layers.GlobalMaxPooling1D(),
    tf.keras.layers.Dense(64, activation='relu'),
    tf.keras.layers.Dropout(0.4),
    tf.keras.layers.Dense(1, activation='sigmoid')
])
```

| Layer | Output Shape | Parameters | TFLite Op |
|-------|-------------|------------|-----------|
| Embedding(10000, 64) | (None, 120, 64) | 640,000 | GATHER |
| Conv1D(128, 5, relu) | (None, 116, 128) | 41,088 | CONV_1D |
| GlobalMaxPooling1D | (None, 128) | 0 | REDUCE_MAX |
| Dense(64, relu) | (None, 64) | 8,256 | FULLY_CONNECTED |
| Dropout(0.4) | (None, 64) | 0 | (removed in inference) |
| Dense(1, sigmoid) | (None, 1) | 65 | FULLY_CONNECTED |

**Training**:
- Optimizer: Adam
- Loss: Binary Crossentropy
- Epochs: 15 (fixed — CNNs need more epochs to extract features)
- Class weights applied
- Batch size: 32

**How Conv1D works for text**: The kernel (`size=5`) slides over 5 consecutive word embeddings at a time, learning to detect threatening n-gram patterns. `GlobalMaxPooling1D` extracts only the strongest activation — the most threatening sub-sequence.

---

## 6. TFLite Export Pipeline

```python
converter = tf.lite.TFLiteConverter.from_keras_model(mobile_model)

# CRITICAL: Restrict to native Built-in Ops only (no Flex delegate)
converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS]

# Dynamic range quantization (reduces model size)
converter.optimizations = [tf.lite.Optimize.DEFAULT]

tflite_model = converter.convert()
# Result: ~300 KB .tflite file
```

**Artifacts exported to `models/production/`**:
- `sentrizk_model.tflite` — Quantized Conv1D model (~300 KB)
- `vocab.json` — Word→index mapping (10,000 entries)
- `sentrizk_tokenizer.pickle` — Python tokenizer
- `sentrizk_research_model.keras` — Bi-LSTM (PC only)
- `sentrizk_production_model.keras` — Conv1D (unquantized)

---

## 7. Flutter Mobile Integration

### Loading the Model

```dart
// MessageScanService (singleton, initialized at app startup)
final options = InterpreterOptions()..addDelegate(GpuDelegateV2());
options.useNnApiForAndroid = true;
_interpreter = await Interpreter.fromAsset('assets/ml/sentrizk_model.tflite', options: options);
```

### Tokenization (Dart)

```dart
List<double> _tokenize(String text) {
  final words = text.toLowerCase().replaceAll(RegExp(r'[^\w\s]'), '').split(RegExp(r'\s+'));
  final indices = words.map((word) => (_vocab?[word] ?? 1).toDouble()).toList();  // 1 = OOV
  // Pad to 120 or truncate
  if (indices.length >= 120) return indices.sublist(0, 120);
  return [...indices, ...List.filled(120 - indices.length, 0.0)];
}
```

### Inference

```dart
Future<double> scanMessage(String text) async {
  // Skip short messages (< 4 words) — prevents OOV noise
  final words = text.trim().split(RegExp(r'\s+'));
  if (words.length < 4) return 0.0;

  final input = [_tokenize(text)];     // shape: [1, 120]
  final output = [[0.0]];              // shape: [1, 1]
  _interpreter!.run(input, output);
  return output[0][0];                 // 0.0 (safe) to 1.0 (threat)
}
```

### Threat Threshold

| Parameter | Value | Configured In |
|-----------|-------|---------------|
| **Threat Threshold** | `0.65` | `AppConfig.mlThreatThreshold` |
| **Min Word Count** | `4` | `AppConfig.mlMinWordCount` |
| **Max Sequence Length** | `120` | `AppConfig.mlMaxLen` |
| **OOV Index** | `1` | `AppConfig.mlOovIndex` |

### Message Flow

```
User types message
  → words < 4? → skip (score = 0.0)
  → tokenize → pad to 120 → TFLite inference
  → score > 0.65?
    → YES: Report to POST /threat-log + show ⚠️ indicator in UI
    → NO: Display normally
  → Signal Protocol encrypt → send to Firestore
```

**Privacy**: ML scanning happens **before** encryption. The server never sees the plaintext — only the threat score and message content are reported for flagged messages.

---

## 8. Model Evaluation

Both models generate full precision/recall/F1 classification reports via `sklearn.metrics.classification_report`.

| Metric | PC (Bi-LSTM) | Mobile (Conv1D) |
|--------|-------------|-----------------|
| Best Val Accuracy | ~98–99% | ~97–99% |
| Early Stopping | Yes (patience=3) | No (fixed 15 epochs) |
| Native TFLite | No (requires Flex) | **Yes** (Built-in only) |
| Model Size | ~2 MB (.keras) | ~300 KB (.tflite) |
| Inference Time | N/A | < 100 ms on modern phones |

---

## 9. Retraining

```bash
cd ML
pip install tensorflow pandas scikit-learn rich
python sentrizk_master_trainer.py
```

After training, copy the production artifacts to Flutter:
```bash
cp models/production/sentrizk_model.tflite ../Frontend/mobile/assets/ml/
cp models/production/vocab.json ../Frontend/mobile/assets/ml/
```
