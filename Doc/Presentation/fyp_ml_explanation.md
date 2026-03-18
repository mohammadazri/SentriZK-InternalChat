# SentriZK Machine Learning Pipeline: Technical Defense

This document details the end-to-end Machine Learning architecture implemented in the SentriZK project for internal threat detection. The pipeline is divided into four distinct phases: Dataset Construction, Model Training, Format Conversion, and Mobile Edge Implementation.

---

## Phase 1: Dataset Construction & Preprocessing
**Location:** `ML/DataSet/` and `ML/retrain_mobile.py`

### 1.1 Sourcing and Aggregation
To train a robust anomaly detection model, a composite dataset was constructed by aggregating multiple distinct communication corpora:
*   **Enron Corpus:** Real-world corporate email communications representing standard baseline business language ("Safe").
*   **ExAIS (SMS/Spam/Safe):** Short-form messaging datasets to mirror the cadence of instant messaging platforms.
*   **Toxic Comment Multilingual:** Used to teach the model aggressive/insulting linguistic patterns.
*   **Synthetic Threats:** Custom-generated rows specifically targeting corporate insider threats, sabotage, and data exfiltration.

These sources were merged into a single, structured file: `train_ready.csv` (5,742 rows), containing two columns: `text` and `label` (0 = Safe, 1 = Threat).

### 1.2 Text Vectorization
Neural networks require fixed-size numerical matrices as input. The raw text was preprocessed using a Keras `Tokenizer`:
1.  **Vocabulary Definition:** The model memorizes the `10,000` most common words (`VOCAB_SIZE = 10000`). Rare words are mapped to a specific Out-of-Vocabulary (`<OOV>`) index.
2.  **Sequencing & Padding:** Every message string is converted into an array of its corresponding vocabulary integer IDs. 
3.  **Dimensional Enforcement:** A strict `MAX_LEN = 120` was enforced. Sequences shorter than 120 words were padded with zeros; sequences longer than 120 words were truncated. This guarantees the static input shape required by the TensorFlow Lite interpreter.

---

## Phase 2: Model Architecture & Training
**Location:** `ML/retrain_mobile.py`

### 2.1 Architecture Selection (Mobile Optimization)
Traditional NLP models (like LSTMs, GRUs, or Transformers) are computationally heavy. For SentriZK, a bespoke architecture was designed specifically for **Mobile Edge Computing**, utilizing native operations:
*   **Embedding Layer:** Maps the 10,000 discrete vocabulary integers into dense, 64-dimensional semantic space.
*   **1D Convolutional Layer (`Conv1D`):** 128 filters with a kernel size of 5. Originally designed for image processing, `Conv1D` acts as an extremely efficient n-gram feature extractor across text sequences. Crucially, convolution operations are 100% supported by smartphone hardware accelerators.
*   **Global Max Pooling:** Condenses the feature maps, isolating the strongest threat signals regardless of their spatial location in the 120-word phrase.
*   **Dense Layer & Dropout:** A 64-neuron Dense layer with a `0.4` Dropout rate to penalize overfitting.
*   **Output Layer:** A single neuron with a `sigmoid` activation function, outputting a continuous probability score between 0.0 and 1.0.

### 2.2 Training Execution
*   The data was partitioned using an 80/20 train/test split.
*   The model compiled using the `Adam` optimizer and `binary_crossentropy` loss.
*   **Class Imbalance:** Due to the inherent scarcity of real "threat" data compared to "safe" data, `class_weight='balanced'` was applied to heavily penalize misclassifications on the minority (Threat) class.
*   Training executed for 15 Epochs, resulting in a compiled `sentrizk_model.keras` binary.

---

## Phase 3: TFLite Format Conversion
**Location:** `ML/reconvert_tflite.py` and `ML/retrain_mobile.py`

The massive Keras object cannot run on a smartphone natively. It must be compressed into LiteRT (TensorFlow Lite) format. This is the critical bridge between desktop python and the mobile app.

### 3.1 Strict Built-in Ops Enforcement
The conversion process was explicitly constrained using the TensorFlow Lite Converter:
```python
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS]
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_model = converter.convert()
```
*Why this matters:* By forcing `TFLITE_BUILTINS`, the script guarantees the resulting `sentrizk_model.tflite` file utilizes *only* basic computational mathematics. If complex custom operations (Select TF Ops) were allowed, the Flutter application would crash entirely on devices lacking full TensorFlow C++ binaries.

### 3.2 Dictionary Extraction
The Keras Tokenizer state is exported as a lightweight dictionary map (`vocab.json`). This ensures the mobile Dart code translates raw user text into the exact same integer mappings the model expects based on its training.

---

## Phase 4: Mobile Implementation (Flutter/Dart)
**Location:** `Frontend/mobile/lib/services/message_scan_service.dart`

To preserve 100% data privacy and reduce network latency, inference occurs entirely offline on the user's device (Edge AI).

### 4.1 Asset Bundling & Initialization
*   `sentrizk_model.tflite` and `vocab.json` are bundled natively into the Flutter APK structure.
*   Upon app launch, `MessageScanService` initializes a `tflite_flutter` Interpreter.
*   **Hardware Acceleration:** The interpreter is injected with `GpuDelegateV2()` and `useNnApiForAndroid = true`. This delegates the matrix multiplications to the smartphone's dedicated Neural Processing Unit (NPU) or GPU, preventing UI thread freezing.

### 4.2 Local Preprocessing (`_tokenize()`)
When a user attempts to send a message, the Dart local service exactly perfectly replicates the Python pipeline offline:
1.  Converts the string to lowercase and strips regex-defined punctuation.
2.  Splits whitespace into a List of words.
3.  Looks up each word in the parsed `vocab.json` Map. Unknown words are assigned `mlOovIndex` (1).
4.  Pads or truncates the final List to strictly `AppConfig.mlMaxLen` (120 elements).

### 4.3 Inference & Intervention
*   Messages shorter than `mlMinWordCount` (4 words) are bypassed to avoid short-string noise.
*   The `[1, 120]` shaped array parameter is fed into the local interpreter.
*   The model returns a `[1, 1]` probability float (e.g., `0.85`).
*   If the returned float exceeds `AppConfig.mlThreatThreshold` (0.65), the `isThreat()` boolean triggers. The application halts transmission to the central database, logging the message as an internal threat intercept locally.
