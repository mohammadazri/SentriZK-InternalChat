import os
import pickle
import json
import pandas as pd
import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.utils import class_weight
from sklearn.metrics import classification_report
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.callbacks import EarlyStopping
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()

def run_master_training():
    # --- 1. SETUP & PATHS ---
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_PATH = os.path.join(BASE_DIR, "DataSet", "train_ready.csv") 
    MODELS_DIR = os.path.join(BASE_DIR, "models", "production")
    os.makedirs(MODELS_DIR, exist_ok=True)

    console.print(Panel.fit("[bold magenta]🛡️ SentriZK Master Trainer v1.0[/bold magenta]\n[dim]Generating Hybrid AI Ecosystem (PC + Mobile)[/dim]", border_style="magenta"))

    # FIX 1: Removed duplicate fallback path that assigned the same value
    if not os.path.exists(DATA_PATH):
        console.print(f"[bold red]Error:[/bold red] Could not find {DATA_PATH}. Please ensure your dataset is ready.")
        return

    # --- 2. DATA LOADING & PREPROCESSING ---
    df = pd.read_csv(DATA_PATH)
    texts = df['text'].fillna("").astype(str).values
    labels = df['label'].values

    train_texts, val_texts, train_labels, val_labels = train_test_split(texts, labels, test_size=0.2, random_state=42)
    console.print(f"[green]✔ Loaded Data:[/green] {len(train_texts)} Training samples.")

    VOCAB_SIZE = 10000  
    MAX_LEN = 120      
    OOV_TOK = "<OOV>" 

    tokenizer = Tokenizer(num_words=VOCAB_SIZE, oov_token=OOV_TOK)
    tokenizer.fit_on_texts(train_texts)
    
    # Save Master Tokenizer
    tokenizer_path = os.path.join(MODELS_DIR, 'sentrizk_tokenizer.pickle')
    with open(tokenizer_path, 'wb') as handle:
        pickle.dump(tokenizer, handle, protocol=pickle.HIGHEST_PROTOCOL)

    train_seq = tokenizer.texts_to_sequences(train_texts)
    val_seq = tokenizer.texts_to_sequences(val_texts)
    
    train_padded = pad_sequences(train_seq, maxlen=MAX_LEN, padding='post', truncating='post')
    val_padded = pad_sequences(val_seq, maxlen=MAX_LEN, padding='post', truncating='post')

    # Calculate Balanced Class Weights
    weights = class_weight.compute_class_weight(
        class_weight='balanced',
        classes=np.unique(train_labels),
        y=train_labels
    )
    class_weights_dict = {0: weights[0], 1: weights[1] * 1.5} # Extra penalty for threats

    # --- 3. ARCHITECTURE 1: PC RESEARCH MODEL (Bi-LSTM) ---
    console.print(Panel("[bold yellow]Phase 1: Training PC Research Model (Bi-LSTM)[/bold yellow]\n[dim]Focus: Maximum Context Awareness[/dim]", border_style="yellow"))
    
    pc_model = tf.keras.Sequential([
        tf.keras.layers.Embedding(VOCAB_SIZE, 64, input_length=MAX_LEN),
        tf.keras.layers.Bidirectional(tf.keras.layers.LSTM(32, return_sequences=True)),
        tf.keras.layers.GlobalMaxPooling1D(),
        tf.keras.layers.Dense(32, activation='relu'),
        tf.keras.layers.Dropout(0.5),
        tf.keras.layers.Dense(1, activation='sigmoid')
    ])

    pc_model.compile(loss='binary_crossentropy', optimizer='adam', metrics=['accuracy'])

    # FIX 2: Added EarlyStopping to PC model — stops when val_loss stops improving
    early_stop = EarlyStopping(monitor='val_loss', patience=3, restore_best_weights=True)

    pc_history = pc_model.fit(
        train_padded, train_labels, 
        epochs=20, # Increased ceiling — early stopping will find the best point
        validation_data=(val_padded, val_labels),
        class_weight=class_weights_dict,
        batch_size=32,
        callbacks=[early_stop],
        verbose=1
    )
    pc_model.save(os.path.join(MODELS_DIR, 'sentrizk_research_model.keras'))
    console.print("[green]✔ PC Research Model Saved.[/green]")

    # --- 4. ARCHITECTURE 2: MOBILE PRODUCTION MODEL (Conv1D) ---
    console.print(Panel("[bold cyan]Phase 2: Training Mobile Production Model (Conv1D)[/bold cyan]\n[dim]Focus: Native Hardware Efficiency[/dim]", border_style="cyan"))
    
    mobile_model = tf.keras.Sequential([
        tf.keras.layers.Embedding(VOCAB_SIZE, 64, input_length=MAX_LEN),
        tf.keras.layers.Conv1D(128, 5, activation='relu'),
        tf.keras.layers.GlobalMaxPooling1D(),
        tf.keras.layers.Dense(64, activation='relu'),
        tf.keras.layers.Dropout(0.4),
        tf.keras.layers.Dense(1, activation='sigmoid')
    ])

    mobile_model.compile(loss='binary_crossentropy', optimizer='adam', metrics=['accuracy'])
    mobile_history = mobile_model.fit(
        train_padded, train_labels, 
        epochs=15, # CNNs need more epochs to extract features
        validation_data=(val_padded, val_labels),
        class_weight=class_weights_dict,
        batch_size=32,
        verbose=1
    )
    mobile_model.save(os.path.join(MODELS_DIR, 'sentrizk_production_model.keras'))
    console.print("[green]✔ Mobile Production Model Saved (Keras).[/green]")

    # --- 5. EXPORT & OPTIMIZATION PIPELINE ---
    console.print(Panel("[bold green]Phase 3: Optimization & Export Pipeline[/bold green]", border_style="green"))

    # A. Generate TFLite for Flutter
    converter = tf.lite.TFLiteConverter.from_keras_model(mobile_model)
    converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS]
    converter.optimizations = [tf.lite.Optimize.DEFAULT] # Dynamic Range Quantization
    
    tflite_model = converter.convert()
    tflite_path = os.path.join(MODELS_DIR, 'sentrizk_model.tflite')
    with open(tflite_path, 'wb') as f:
        f.write(tflite_model)
    console.print(f"[green]✔ Exported TFLite Model:[/green] {os.path.getsize(tflite_path)/1024:.1f} KB")

    # B. Generate vocab.json for Flutter Bridge
    word_index = tokenizer.word_index
    vocab_export = {word: idx for word, idx in word_index.items() if idx < VOCAB_SIZE}
    vocab_path = os.path.join(MODELS_DIR, 'vocab.json')
    with open(vocab_path, 'w') as f:
        json.dump(vocab_export, f)
    console.print(f"[green]✔ Exported vocab.json ({len(vocab_export)} words)[/green]")

    # --- 5b. CLASSIFICATION REPORTS ---
    # FIX 4: Full precision/recall/F1 breakdown for both models
    console.print(Panel("[bold white]Phase 3b: Evaluation Reports[/bold white]", border_style="white"))

    pc_preds = (pc_model.predict(val_padded) > 0.5).astype(int)
    console.print("[bold yellow]PC (Bi-LSTM) Classification Report:[/bold yellow]")
    console.print(classification_report(val_labels, pc_preds, target_names=["Safe", "Threat"]))

    mobile_preds = (mobile_model.predict(val_padded) > 0.5).astype(int)
    console.print("[bold cyan]Mobile (Conv1D) Classification Report:[/bold cyan]")
    console.print(classification_report(val_labels, mobile_preds, target_names=["Safe", "Threat"]))

    # --- 6. FINAL BUILD SUMMARY ---
    # FIX 3: Use max() to get best val_accuracy, not just the last epoch
    pc_best_acc = max(pc_history.history['val_accuracy']) * 100
    mobile_best_acc = max(mobile_history.history['val_accuracy']) * 100

    summary_table = Table(title="SentriZK Final Ecosystem Build Metrics")
    summary_table.add_column("Metric", style="cyan")
    summary_table.add_column("PC (Research)", style="yellow")
    summary_table.add_column("Mobile (Production)", style="green")

    summary_table.add_row("Architecture", "Bi-LSTM", "Conv1D")
    summary_table.add_row("Best Val Accuracy", f"{pc_best_acc:.2f}%", f"{mobile_best_acc:.2f}%")
    summary_table.add_row("Early Stopping", "Yes (patience=3)", "No (fixed 15 epochs)")
    summary_table.add_row("Native TFLite", "No (Requires Flex)", "Yes (Built-in Only)")

    console.print("\n", summary_table)
    console.print("[bold green]✔ Done! AI Ecosystem fully generated.[/bold green]")

if __name__ == "__main__":
    run_master_training()