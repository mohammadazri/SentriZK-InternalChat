import os
import json
import pandas as pd
import numpy as np
import tensorflow as tf
import joblib
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from sklearn.model_selection import train_test_split
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences

console = Console()

def run_pro_training():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    MODELS_DIR = os.path.join(BASE_DIR, "models")
    os.makedirs(MODELS_DIR, exist_ok=True)
    
    console.print(Panel("[bold cyan]SentriZK Supervised Engine (TensorFlow)[/bold cyan]\n[dim]Strategy: Semantic Embeddings + Binary Classification[/dim]"))

    # --- 1. DATA PREPARATION (The "Clean & Merge") ---
    with console.status("[bold blue]Loading and balancing datasets..."):
        # Load Enron (Safe)
        enron_path = os.path.join(BASE_DIR, "DataSet", "Enron", "cleaned_enron_emails.json")
        with open(enron_path, 'r', encoding='utf-8') as f:
            enron_data = json.load(f)
        df_safe = pd.DataFrame(enron_data).sample(n=15000, random_state=42)
        df_safe = df_safe[['Body']].rename(columns={'Body': 'text'})
        df_safe['label'] = 0 # SAFE
        
        # Load Spam (Threat)
        spam_path = os.path.join(BASE_DIR, "DataSet", "spam.csv")
        df_spam = pd.read_csv(spam_path, encoding='latin-1')[['v2', 'v1']]
        df_spam.columns = ['text', 'label_str']
        df_spam['label'] = df_spam['label_str'].apply(lambda x: 1 if x == 'spam' else 0)
        df_threat = df_spam[df_spam['label'] == 1] # Get only the threats
        
        # Combine (We keep some Spam-Ham as "Safe" to teach casual chat style)
        df_casual = df_spam[df_spam['label'] == 0]
        
        df_final = pd.concat([df_safe, df_threat, df_casual]).sample(frac=1).reset_index(drop=True)
        
        texts = df_final['text'].astype(str).values
        labels = df_final['label'].values

    # --- 2. TOKENIZATION (Replacing TF-IDF) ---
    # This turns "Lunch" into [45] and "Payroll" into [2391]
    with console.status("[bold magenta]Tokenizing Vocabulary..."):
        VOCAB_SIZE = 5000 # Learn top 5000 words
        MAX_LEN = 100     # Look at first 100 words of message
        
        tokenizer = Tokenizer(num_words=VOCAB_SIZE, oov_token="<OOV>")
        tokenizer.fit_on_texts(texts)
        sequences = tokenizer.texts_to_sequences(texts)
        padded_seq = pad_sequences(sequences, maxlen=MAX_LEN, padding='post', truncating='post')
        
        # Save Tokenizer for the App/Test
        import pickle
        with open(os.path.join(MODELS_DIR, 'sentrizk_tokenizer.pickle'), 'wb') as handle:
            pickle.dump(tokenizer, handle, protocol=pickle.HIGHEST_PROTOCOL)

    # --- 3. MODEL ARCHITECTURE (The "Mobile Best Practice") ---
    # Embedding Layer: Learns the meaning of words
    # GlobalAvgPool: Averages meanings to understand sentence intent
    # Dense: Makes the final decision
    model = tf.keras.Sequential([
        tf.keras.layers.Embedding(VOCAB_SIZE, 16, input_length=MAX_LEN),
        tf.keras.layers.GlobalAveragePooling1D(),
        tf.keras.layers.Dense(24, activation='relu'),
        tf.keras.layers.Dropout(0.3), # Prevents overfitting
        tf.keras.layers.Dense(1, activation='sigmoid') # Output 0.0 to 1.0
    ])

    model.compile(loss='binary_crossentropy', optimizer='adam', metrics=['accuracy'])

    # --- 4. TRAINING ---
    console.print(f"[yellow]🚀 Training on {len(texts)} messages...[/yellow]")
    history = model.fit(padded_seq, labels, epochs=15, batch_size=32, validation_split=0.2, verbose=1)

    # --- 5. EXPORT TO TFLITE ---
    console.print("[blue]Converting to LiteRT (.tflite)...[/blue]")
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    tflite_model = converter.convert()
    
    tflite_path = os.path.join(MODELS_DIR, 'sentrizk_model.tflite')
    with open(tflite_path, 'wb') as f:
        f.write(tflite_model)

    console.print(Panel(f"[bold green]✔ Success![/bold green]\nModel Accuracy: {history.history['accuracy'][-1]*100:.2f}%\nSaved to /models/", border_style="green"))

if __name__ == "__main__":
    run_pro_training()