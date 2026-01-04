import os
import pickle
import pandas as pd
import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()

def run_final_training():
    # --- SETUP PATHS ---
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    # Adjust this to where your train_ready.csv actually lives based on your previous output
    # It seems to be in the parent DataSet folder
    DATA_PATH = os.path.join(BASE_DIR, "../../DataSet", "train_ready.csv") 
    MODELS_DIR = os.path.join(BASE_DIR, "../../models")
    os.makedirs(MODELS_DIR, exist_ok=True)

    console.print(Panel("[bold cyan]SentriZK Supervised Training Engine[/bold cyan]\n[dim]Architecture: Embedding -> Pooling -> Dense (MobileNet Style)[/dim]"))

    # --- 1. DATA LOADING ---
    if not os.path.exists(DATA_PATH):
        # Fallback search if script is in a subfolder
        DATA_PATH = os.path.join(BASE_DIR, "..", "DataSet", "train_ready.csv")
    
    if not os.path.exists(DATA_PATH):
        console.print(f"[bold red]Error:[/bold red] Could not find train_ready.csv at {DATA_PATH}")
        return

    df = pd.read_csv(DATA_PATH)
    texts = df['text'].astype(str).values
    labels = df['label'].values

    # Split: 80% Training, 20% Validation (Testing)
    train_texts, val_texts, train_labels, val_labels = train_test_split(texts, labels, test_size=0.2, random_state=42)

    console.print(f"[green]✔ Loaded Data:[/green] {len(train_texts)} Training samples, {len(val_texts)} Validation samples.")

    # --- 2. TOKENIZATION ---
    # Convert words to numbers (e.g., "Urgent" -> 45)
    VOCAB_SIZE = 5000  # Learn top 5000 words
    MAX_LEN = 100      # Check first 100 words of message
    OOV_TOK = "<OOV>"  # Handle unknown words

    tokenizer = Tokenizer(num_words=VOCAB_SIZE, oov_token=OOV_TOK)
    tokenizer.fit_on_texts(train_texts)
    
    # Convert text to sequences
    train_seq = tokenizer.texts_to_sequences(train_texts)
    val_seq = tokenizer.texts_to_sequences(val_texts)
    
    # Pad to ensure same length
    train_padded = pad_sequences(train_seq, maxlen=MAX_LEN, padding='post', truncating='post')
    val_padded = pad_sequences(val_seq, maxlen=MAX_LEN, padding='post', truncating='post')

    # Save Tokenizer (Crucial for the App/Test script)
    with open(os.path.join(MODELS_DIR, 'sentrizk_tokenizer.pickle'), 'wb') as handle:
        pickle.dump(tokenizer, handle, protocol=pickle.HIGHEST_PROTOCOL)

    # --- 3. MODEL ARCHITECTURE ---
    # This is Google's recommended architecture for text on mobile
    model = tf.keras.Sequential([
        tf.keras.layers.Embedding(VOCAB_SIZE, 16, input_length=MAX_LEN),
        tf.keras.layers.GlobalAveragePooling1D(), # Flattens the vector efficiently
        tf.keras.layers.Dense(24, activation='relu'),
        tf.keras.layers.Dropout(0.3), # Prevents memorization
        tf.keras.layers.Dense(1, activation='sigmoid') # Binary output (0=Safe, 1=Threat)
    ])

    model.compile(loss='binary_crossentropy', optimizer='adam', metrics=['accuracy'])

    # --- 4. TRAINING ---
    EPOCHS = 20
    console.print(f"\n[bold yellow]🚀 Training for {EPOCHS} Epochs...[/bold yellow]")
    
    history = model.fit(
        train_padded, train_labels, 
        epochs=EPOCHS, 
        validation_data=(val_padded, val_labels),
        verbose=1
    )

    # --- 5. EXPORT TO TFLITE ---
    console.print("\n[blue]Converting to LiteRT (.tflite)...[/blue]")
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    tflite_model = converter.convert()
    
    tflite_path = os.path.join(MODELS_DIR, 'sentrizk_model.tflite')
    with open(tflite_path, 'wb') as f:
        f.write(tflite_model)

    # --- 6. SUMMARY ---
    final_acc = history.history['val_accuracy'][-1] * 100
    
    table = Table(title="SentriZK Training Results")
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="green")
    
    table.add_row("Final Accuracy", f"{final_acc:.2f}%")
    table.add_row("Model Size", f"{len(tflite_model)/1024:.2f} KB")
    table.add_row("Format", ".tflite (Mobile Ready)")
    
    console.print(table)
    console.print(f"[bold green]✔ Done![/bold green] Files saved in {MODELS_DIR}")

if __name__ == "__main__":
    run_final_training()