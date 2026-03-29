import os
import pickle
import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.sequence import pad_sequences
from rich.console import Console
from rich.table import Table
from rich.prompt import Prompt

console = Console()

def run_audit():
    # --- 0. SELECT TARGET ---
    console.clear()
    console.print(Panel.fit(
        "[bold cyan]SentriZK Supervised Audit System[/bold cyan]\n"
        "[1] Research Engine (Bi-LSTM)\n"
        "[2] Production Engine (Conv1D)",
        title="Audit Target Selector"
    ))
    choice = Prompt.ask("Choose engine to audit", choices=["1", "2"], default="2")

    if choice == "1":
        model_name = 'sentrizk_research_model.keras'
        audit_title = "SentriZK Research Audit (Bi-LSTM)"
        model_label = "RESEARCH (Bi-LSTM)"
    else:
        model_name = 'sentrizk_production_model.keras'
        audit_title = "SentriZK Production Audit (Conv1D)"
        model_label = "PRODUCTION (Conv1D)"

    # --- 1. SETUP PATHS ---
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_PATH = os.path.join(BASE_DIR, "../../DataSet", "train_ready.csv")
    MODELS_DIR = os.path.join(BASE_DIR, "../../models/production")
    
    # 2. LOAD ARTIFACTS
    try:
        with console.status(f"[bold white]Loading {model_label} Artifacts..."):
            # Load Tokenizer
            token_path = os.path.join(MODELS_DIR, 'sentrizk_tokenizer.pickle')
            if not os.path.exists(token_path):
                 raise FileNotFoundError(f"Tokenizer not found at {token_path}")
            with open(token_path, 'rb') as handle:
                tokenizer = pickle.load(handle)
            
            # Load Keras Model 
            model_path = os.path.join(MODELS_DIR, model_name)
            if not os.path.exists(model_path):
                 raise FileNotFoundError(f"Model not found at {model_path}")
            model = tf.keras.models.load_model(model_path)
        
        console.print(f"[green]✔ {model_label} Loaded Successfully.[/green]")
        
    except Exception as e:
        console.print(f"[bold red]Error loading models:[/bold red] {e}")
        return

    # 2. SELECT TEST CASES
    test_cases = []

    # A. From CSV (Real Data)
    if os.path.exists(DATA_PATH):
        df = pd.read_csv(DATA_PATH)
        # Get 3 Random Safe
        safe_samples = df[df['label'] == 0].sample(3, random_state=42)
        for text in safe_samples['text']:
            test_cases.append((text, 0, "Real Data (Safe)"))
            
        # Get 3 Random Threats
        threat_samples = df[df['label'] == 1].sample(3, random_state=42)
        for text in threat_samples['text']:
            test_cases.append((text, 1, "Real Data (Threat)"))
    else:
        console.print("[yellow]Warning: train_ready.csv not found. Skipping CSV tests.[/yellow]")

    # B. Custom Tricky Cases (Logic Check)
    custom_cases = [
        ("Hey bro, lunch at 1pm?", 0, "Custom (Casual)"),
        ("Please send the monthly report by 5pm.", 0, "Custom (Work)"),
        ("URGENT: Payroll suspended. Login to verify: bit.ly/fake", 1, "Custom (Phishing)"),
        ("Your account password expires today. Click here to reset.", 1, "Custom (Social Eng)"),
        ("I'm on leave tomorrow, please contact Sarah.", 0, "Custom (OOO)"),
        ("Can you send me the CEO's private mobile number? It's an emergency.", 1, "Custom (Insider)"),
        ("Hey IT, I forgot my admin password, can you bypass the system for me?", 1, "Custom (Bypass)")
    ]
    test_cases.extend(custom_cases)

    # 3. RUN AUDIT
    table = Table(title="SentriZK Bi-LSTM Native Audit")
    table.add_column("Message snippet", style="dim", width=40)
    table.add_column("Type", style="cyan", width=15)
    table.add_column("Threat Score", justify="right")
    table.add_column("Prediction", justify="center")
    table.add_column("Status", justify="center")

    correct_count = 0
    total_count = len(test_cases)
    
    # Threshold: Above 0.5 (50%) = Threat
    THRESHOLD = 0.5

    console.print("\n[bold yellow]Running Bi-LSTM Inference...[/bold yellow]")

    for text, expected_label, source in test_cases:
        # Preprocess
        seq = tokenizer.texts_to_sequences([str(text)])
        
        # Keep maxlen at 120
        padded = pad_sequences(seq, maxlen=120, padding='post', truncating='post')

        # Inference (Using standard model.predict instead of interpreter)
        score = model.predict(padded, verbose=0)[0][0]
        prediction_label = 1 if score > THRESHOLD else 0
        
        # UI Logic
        is_threat = prediction_label == 1
        pred_text = "[bold red]⚠️ THREAT[/bold red]" if is_threat else "[green]✅ SAFE[/green]"
        
        # Check correctness
        if prediction_label == expected_label:
            status = "[bold green]✔ PASS[/bold green]"
            correct_count += 1
        else:
            status = "[bold red]✘ FAIL[/bold red]"

        # Truncate text for display
        display_text = (text[:37] + '...') if len(str(text)) > 37 else str(text)

        table.add_row(display_text, source, f"{score:.4f}", pred_text, status)

    console.print(table)
    
    # 4. FINAL SCORE
    accuracy = (correct_count / total_count) * 100
    color = "green" if accuracy > 85 else "red"
    console.print(Panel(f"[bold {color}]Audit Accuracy: {accuracy:.2f}% ({correct_count}/{total_count})[/bold {color}]", border_style=color))

if __name__ == "__main__":
    run_audit()