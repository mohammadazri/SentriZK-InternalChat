import os
import pickle
import pandas as pd
import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.utils import class_weight
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()

def run_final_training():
    # --- SETUP PATHS ---
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    # Adjust this to where your train_ready.csv actually lives
    DATA_PATH = os.path.join(BASE_DIR, "../../DataSet", "train_ready.csv") 
    MODELS_DIR = os.path.join(BASE_DIR, "../../models")
    os.makedirs(MODELS_DIR, exist_ok=True)

    console.print(Panel("[bold cyan]SentriZK Bi-LSTM Engine (Advanced)[/bold cyan]\n[dim]Architecture: Bi-LSTM + Context Awareness + Cost-Sensitive Learning[/dim]"))

    # --- 1. DATA LOADING ---
    if not os.path.exists(DATA_PATH):
        DATA_PATH = os.path.join(BASE_DIR, "..", "DataSet", "train_ready.csv")
    
    if not os.path.exists(DATA_PATH):
        console.print(f"[bold red]Error:[/bold red] Could not find train_ready.csv at {DATA_PATH}")
        return

    df = pd.read_csv(DATA_PATH)
    texts = df['text'].astype(str).values
    labels = df['label'].values

    # Split: 80% Training, 20% Validation
    train_texts, val_texts, train_labels, val_labels = train_test_split(texts, labels, test_size=0.2, random_state=42)

    console.print(f"[green]✔ Loaded Data:[/green] {len(train_texts)} Training samples.")

    # --- 2. TOKENIZATION ---
    # Increased Vocabulary and Length for better context capture
    VOCAB_SIZE = 7500  
    MAX_LEN = 120      
    OOV_TOK = "<OOV>" 

    tokenizer = Tokenizer(num_words=VOCAB_SIZE, oov_token=OOV_TOK)
    tokenizer.fit_on_texts(train_texts)
    
    # Save Tokenizer
    with open(os.path.join(MODELS_DIR, 'sentrizk_tokenizer.pickle'), 'wb') as handle:
        pickle.dump(tokenizer, handle, protocol=pickle.HIGHEST_PROTOCOL)

    # Convert and Pad
    train_seq = tokenizer.texts_to_sequences(train_texts)
    val_seq = tokenizer.texts_to_sequences(val_texts)
    
    train_padded = pad_sequences(train_seq, maxlen=MAX_LEN, padding='post', truncating='post')
    val_padded = pad_sequences(val_seq, maxlen=MAX_LEN, padding='post', truncating='post')

    # --- 3. CLASS WEIGHTING (The "Knowledge" Fix) ---
    # Automatically calculate how much more important 'Threats' are than 'Safe' msgs
    weights = class_weight.compute_class_weight(
        class_weight='balanced',
        classes=np.unique(train_labels),
        y=train_labels
    )
    # We boost the threat weight slightly more (1.5x) to be safe
    class_weights_dict = {0: weights[0], 1: weights[1] * 1.5}
    console.print(f"[yellow]⚠ Class Weights Applied:[/yellow] Safe={weights[0]:.2f}, Threat={(weights[1]*1.5):.2f}")

    # --- 4. MODEL ARCHITECTURE (Bi-LSTM) ---
    # Using Bidirectional LSTM to understand context (e.g. "URGENT" + "LOGIN")
    model = tf.keras.Sequential([
        tf.keras.layers.Embedding(VOCAB_SIZE, 32), # Removed input_length for compatibility
        tf.keras.layers.Bidirectional(tf.keras.layers.LSTM(32, return_sequences=True)),
        tf.keras.layers.GlobalMaxPooling1D(),
        tf.keras.layers.Dense(32, activation='relu'),
        tf.keras.layers.Dropout(0.5), # High dropout for robustness
        tf.keras.layers.Dense(1, activation='sigmoid')
    ])

    model.compile(loss='binary_crossentropy', optimizer='adam', metrics=['accuracy'])

    # --- 5. TRAINING ---
    EPOCHS = 5 # Reduced Epochs as LSTM learns faster
    console.print(f"\n[bold yellow]🚀 Training Bi-LSTM for {EPOCHS} Epochs...[/bold yellow]")
    
    history = model.fit(
        train_padded, train_labels, 
        epochs=EPOCHS, 
        validation_data=(val_padded, val_labels),
        class_weight=class_weights_dict, # Applying the weights
        batch_size=32,
        verbose=1
    )

    # --- 6. EXPORT STRATEGY ---
    
    # A. SAVE NATIVE KERAS (For Windows Local Audit)
    # This file is what your test_audit script will read to avoid "Flex Delegate" errors
    console.print("\n[blue]Saving Native Keras Model (For Local Audit)...[/blue]")
    model.save(os.path.join(MODELS_DIR, 'sentrizk_model.keras'))

    # B. SAVE TFLITE (For Mobile App)
    console.print("[blue]Converting to LiteRT (.tflite) with Select TF Ops...[/blue]")
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    
    # Enable Select TF Ops for LSTM support on Mobile
    converter.target_spec.supported_ops = [
        tf.lite.OpsSet.TFLITE_BUILTINS,
        tf.lite.OpsSet.SELECT_TF_OPS
    ]
    converter._experimental_lower_tensor_list_ops = False
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    
    tflite_model = converter.convert()
    
    tflite_path = os.path.join(MODELS_DIR, 'sentrizk_model.tflite')
    with open(tflite_path, 'wb') as f:
        f.write(tflite_model)

    # --- 7. SUMMARY ---
    final_acc = history.history['val_accuracy'][-1] * 100
    
    table = Table(title="SentriZK Final Build Results")
    table.add_column("Artifact", style="cyan")
    table.add_column("Location", style="green")
    
    table.add_row("Tokenizer", "/models/sentrizk_tokenizer.pickle")
    table.add_row("Audit Model", "/models/sentrizk_model.keras")
    table.add_row("Mobile Model", "/models/sentrizk_model.tflite")
    
    console.print(table)
    console.print(f"[bold green]✔ Done! Final Accuracy: {final_acc:.2f}%[/bold green]")

if __name__ == "__main__":
    run_final_training()