# SentriZK ML Training and Mobile Conversion Guide

This document details the process for training the SentriZK Machine Learning model for insider threat detection, and the specific architecture modifications required to export a highly-optimized, 100% native TensorFlow Lite model for deployment on Flutter (Android & iOS).

---

## 1. Dataset Preparation
The model is trained on `train_ready.csv`, a pre-processed dataset containing text messages and binary labels (`0` = Safe, `1` = Threat). 

The dataset is loaded and split into an 80% training set and a 20% validation set using `scikit-learn`.

---

## 2. Text Preprocessing and Tokenization
Before text can be fed to a neural network, it must be converted to numerical sequences.

1. **Vocabulary:** We initialize a `Tokenizer` with a vocab size of 7,500 words, converting unseen words to a special `<OOV>` (Out Of Vocabulary) token.
2. **Tokenization:** The text is converted to lowercase, stripped of punctuation, and mapped to the integer indices from the vocabulary.
3. **Padding:** All sequences are padded (or truncated) to a fixed maximum length of **120 tokens** (`padding='post'`). This ensures static input shapes, which is a strict requirement for mobile Edge AI execution.
4. **Export:** The resulting tokenizer is saved as `sentrizk_tokenizer.pickle`. For mobile use, the vocab dictionary is exported separately to `vocab.json`.

---

## 3. Class Imbalance Handling
Because "Threat" messages are exceedingly rare compared to "Safe" messages, the dataset is highly imbalanced.

To prevent the model from heavily favoring the "Safe" class, we compute dataset class weights using `class_weight.compute_class_weight('balanced', ...)`.
We apply an additional **1.5x multiplier** penalty for misclassifying threats. This forces the optimizer to prioritize learning threat patterns, reducing False Negatives.

---

## 4. The Mobile-Compatible Architecture (Pure TFLite)

### The Problem with Bi-LSTMs
The initial architecture utilized a **Bidirectional LSTM (Bi-LSTM)**. While powerful for sequence modeling, LSTMs rely on complex dynamic tensor operations internally (like `FlexTensorListReserve`).

Standard TensorFlow Lite (`tflite_flutter`) on mobile **only supports a core set of built-in Operations (Builtin Ops)**. To run an LSTM on mobile, the app would require compounding the massive `tensorflow-lite-select-tf-ops` (Flex Delegate) library. On modern versions of `tflite_flutter` (v0.12+), integrating this C++ bindings library is highly unstable and breaks Flutter builds.

### The Solution: 1D Convolutional Neural Networks (Conv1D)
To achieve pure mobile compatibility without compromising accuracy, we replaced the recurrent layer with a **1D Convolutional Neural Network**.

CNNs (historically used for images) are exceptionally fast and accurate for text classification when analyzing word combinations (n-grams). Crucially, **all operations in a Conv1D are 100% natively supported by Builtin TFLite Ops.**

### Final Keras Architecture:
```python
model = tf.keras.Sequential([
    # Inputs are mapped to dense 32-dimensional vectors.
    tf.keras.layers.Embedding(VOCAB_SIZE, 32, input_length=MAX_LEN),
    
    # Conv1D scans 5 words at a time (kernel_size=5), capturing local threat context
    tf.keras.layers.Conv1D(64, 5, activation='relu'),
    
    # Reduces sequence dimensions, extracting only the strongest signal
    tf.keras.layers.GlobalMaxPooling1D(),
    
    # Fully Connected layers
    tf.keras.layers.Dense(32, activation='relu'),
    tf.keras.layers.Dropout(0.5), # High dropout to prevent overfitting
    
    # Binary Classification Output (0.0 to 1.0)
    tf.keras.layers.Dense(1, activation='sigmoid')
])
```

---

## 5. Model Training
The model is compiled with the `adam` optimizer and `binary_crossentropy` loss. 
It trains for **5 Epochs** in Keras, applying the computed class weights.

*Validation Accuracy usually hits ~98-99%.*

The uncompressed Native Keras model is saved to `models/sentrizk_model.keras` (for local server/audit purposes).

---

## 6. Converting to Pure TFLite (Mobile Export)
The `TFLiteConverter` compresses and quantizes the Keras model into a lightweight `.tflite` format.

To guarantee zero dependencies on the Flex delegate on iOS/Android, we explicitly restrict the converter to use only **Built-in Ops**:

```python
converter = tf.lite.TFLiteConverter.from_keras_model(model)

# 🌟 CRITICAL: Restrict export strictly to native Builtin Ops
converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS]

# Allow standard size optimizations
converter.optimizations = [tf.lite.Optimize.DEFAULT]

tflite_model = converter.convert()
```

The resulting artifact `sentrizk_model.tflite` is highly compact (~300 KB) and is copied to the Flutter `assets/ml/` directory.

---

## 7. Flutter Mobile Integration

Because the model was exported cleanly, the Dart integration requires zero custom native configuration. 

It is loaded asynchronously at app startup using the standard `Interpreter`:

```dart
// Load Model seamlessly on Android/iOS CPU or GPU
_interpreter = await Interpreter.fromAsset('assets/ml/sentrizk_model.tflite');

// Tokenize user message
final input = [_tokenize("login to verify payroll")]; 

// Shape [1, 1] output container
final output = [[0.0]]; 

// Execute inference
_interpreter!.run(input, output);
double threatScore = output[0][0]; // ~ 0.95
```

If the threat score exceeds the threshold (`> 0.5`), the app flags the message.
