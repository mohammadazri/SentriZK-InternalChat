# SentriZK: Machine Learning & Edge Anomaly Detection
## Deep-Dive Technical Reference Document

**Purpose**: This document provides an exhaustive, highly technical breakdown of the Machine Learning pipeline implemented in SentriZK. It is designed to give you a complete understanding of every underlying detail, formula, architecture choice, and system integration workflow for your defense or presentation.

---

## 1. The Core Concept: Solving the E2EE "Blind Spot"
In traditional End-to-End Encrypted (E2EE) applications (like WhatsApp or Signal), the server only routes encrypted ciphertext. While this guarantees privacy, it completely blinds enterprise administrators to internal threats (e.g., a compromised employee account spreading phishing links or exfiltrating data). 

**SentriZK's Solution**: We shift the anomaly detection from the centralized server to the **Edge** (the user's mobile device). By running a lightweight Neural Network on the device, we scan the message in plaintext *before* it is encrypted. 
- If the message is safe, it is encrypted and sent. 
- If the AI mathematically determines it is a threat, it logs the anomaly to the admin server, *then* encrypts and sends the message.

---

## 2. Dataset & Data Engineering
To train the AI to recognize "Safe" vs "Threat" messages, we aggregated a custom dataset.

**Dataset Composition (`train_ready.csv`):**
- **Total Samples**: 5,740 
- **Class 0 (Safe)**: 2,890 samples (Normal corporate chat, general conversation)
- **Class 1 (Threat)**: 2,850 samples (Phishing links, malicious commands, spam, toxic content)
- **Sources**: Enron email subset, SMS Spam Collection, Phishing NLP datasets, and synthetic generated insider threats.

**Data Preprocessing Pipeline:**
Before text enters a Neural Network, it must become numbers. This is handled by our Tokenizer (`vocab.json`).
1. **Vocabulary Size (`VOCAB_SIZE`)**: The model only learns the top `10,000` most frequent words.
2. **Out-of-Vocabulary (`OOV_TOK`)**: Any word not in those 10,000 is assigned the integer `1`. This is critical for security: attackers trying to use weird characters or obfuscated words will generate high density of `1`s, which the model actually learns as a feature of spam.
3. **Sequence Length (`MAX_LEN`)**: Every message is forced to exactly `120` integers. 
   - If shorter: Padded with `0`s at the end (Post-padding).
   - If longer: Truncated at 120 words.
4. **Class Weighting**: During training, the "Threat" class was given a `1.5x` mathematical penalty weight. This biases the model to prioritize identifying threats (higher recall) even at the cost of a few false positives.

---

## 3. Neural Network Architectures
We developed two separate architectures to compare theoretical accuracy vs. mobile practicality.

### A. The PC Research Model (Bi-LSTM)
*Purpose: Establish a baseline of maximum contextual understanding.*
- **Architecture**: Bidirectional Long Short-Term Memory (Bi-LSTM).
- **How it works**: LSTMs have "memory cells" that remember past words in a sentence. "Bidirectional" means it reads the sentence forwards and backwards simultaneously before making a decision.
- **Layers**: `Embedding (64) -> Bi-LSTM (32) -> GlobalMaxPooling1D -> Dense (32, ReLU) -> Dropout (0.5) -> Dense (1, Sigmoid)`
- **Drawback**: LSTMs process sequences sequentially, meaning they cannot be highly parallelized. This drains battery and causes high latency on mobile CPUs.

### B. The Mobile Production Model (Conv1D)
*Purpose: Deployed in the actual SentriZK Flutter App.*
- **Architecture**: 1-Dimensional Convolutional Neural Network (Conv1D).
- **How it works**: Instead of reading word-by-word, a Conv1D slides a "filter" (kernel) across groups of words (e.g., 5 words at a time) to detect specific malicious phrasing patterns (n-grams) instantly.
- **Layers**: `Embedding (64) -> Conv1D (128 filters, kernel=5, ReLU) -> GlobalMaxPooling1D -> Dense (64, ReLU) -> Dropout (0.4) -> Dense (1, Sigmoid)`
- **Advantage**: Convolutions consist of simple matrix multiplications. This allows us to use the **Android NNAPI (Neural Networks API)** to hardware-accelerate the inference directly on the phone's GPU/NPU, resulting in inference times under 50ms and very low battery drain.
- **Optimization**: Exported to `.tflite` using **Dynamic Range Quantization** (`tf.lite.Optimize.DEFAULT`), which shrinks the model weights from 32-bit floats to 8-bit integers, reducing the file size to just **~680 KB**.

---

## 4. Mathematical Foundations
You must understand the two core mathematical formulas driving the ML engine.

### Formula 1: The Activation Function (Sigmoid)
The final layer of both models is a single neuron with a Sigmoid activation function. It takes the raw, unbounded output of the neural network ($x$) and squashes it into a neat probability score between $0.0$ and $1.0$.

$$ \sigma(x) = \frac{1}{1 + e^{-x}} $$

- As $x \to \infty$, $e^{-x}$ approaches 0, and the output becomes **1.0 (100% Threat)**.
- As $x \to -\infty$, $e^{-x}$ approaches huge numbers, and the output becomes **0.0 (100% Safe)**.

### Formula 2: The Loss Function (Binary Cross-Entropy)
During training, the model must calculate how "wrong" its predictions are so it can adjust its weights. Since we only have two classes (0 and 1), we use Binary Cross-Entropy (BCE).

$$ L = -\frac{1}{N} \sum_{i=1}^{N} \left[ y_i \log(\hat{y}_i) + (1 - y_i) \log(1 - \hat{y}_i) \right] $$

- $N$ = Batch size
- $y_i$ = The actual true label (0 or 1)
- $\hat{y}_i$ = The model's predicted probability (e.g., 0.85)
- **Why it works**: If the true label is 1 ($y_i=1$), the second half of the equation zeros out. The loss becomes just $-\log(\hat{y}_i)$. If the model confidently predicted 0.01 instead of 1, $-\log(0.01)$ yields a massive penalty, forcing the model to learn rapidly.

---

## 5. Flutter Integration & Threat Logic
How does the math translate to the actual Dart code in the mobile app?

### The `MessageScanService`
When the app launches, `MessageScanService.init()` loads the `sentrizk_model.tflite` into memory and binds it to the GPU via `GpuDelegateV2()`.

### The Threat Threshold (`0.65`)
The Sigmoid function outputs a float. We must draw a line in the sand to declare what constitutes a threat.
- In `config/app_config.dart`, we define: `static const double mlThreatThreshold = 0.65;`
- **Why 0.65?** Default ML models use 0.50. However, in corporate messaging, false positives (flagging a normal message as a threat) create massive "alert fatigue" for IT admins. By raising the threshold to 0.65, we demand higher mathematical confidence from the AI before sounding the alarm.

### Minimum Word Count Filtering
We implemented `static const int mlMinWordCount = 4`. 
If a user sends "ok" or "?", the sequence is 99% padding (`0`s). Neural networks hallucinate on mostly-empty matrices. Therefore, the Dart code bypasses the AI entirely for messages under 4 words, returning a safe score of `0.0`.

### The Security Execution Flow (`chat_screen.dart`)
This is the exact sequence of events when a user taps "Send":
1. **Pre-Processing**: The raw plaintext is captured.
2. **AI Inference**: The text is tokenized and passed to `MessageScanService.scanMessage()`. The model returns a float (e.g., `0.88`).
3. **Decision Fork**:
   - If `0.88 > 0.65` (Threat Detected): The app makes a silent HTTP POST request to `https://backend.sentrizk.me/threat-log`. It sends the plaintext, sender ID, and the `0.88` score to the Supabase database for the Admin to review.
   - If `0.20 < 0.65` (Safe): No logging occurs.
4. **E2EE Execution**: Regardless of the AI score, the plaintext is instantly handed to the Signal Protocol service, encrypted using the Double Ratchet algorithm, and the resulting ciphertext is pushed to Firebase Firestore.

**Conclusion**: The server *only* ever sees the plaintext of a message if the local AI mathematics prove it is highly likely to be a threat.

---

## 6. Final Evaluation Metrics
Based on the validation dataset (unseen during training), the Mobile Conv1D model achieved:
- **Accuracy**: 89.2%
- **AUC-ROC (Area Under Receiver Operating Characteristic Curve)**: 0.962. 
  *(An AUC of 1.0 is perfect; 0.5 is random guessing. 0.962 proves the model has excellent discriminatory power between safe and malicious text).*
- **Recall (Threats)**: 89.3% (Identified ~9 out of 10 actual threats successfully).
