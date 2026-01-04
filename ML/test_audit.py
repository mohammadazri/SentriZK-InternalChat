import os
import torch
import joblib
import numpy as np
from rich.console import Console
from rich.table import Table
from training import SentriZKAutoencoder 

console = Console()

def run_calibration_audit():
    # 1. SETUP PATHS
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    MODELS_DIR = os.path.join(BASE_DIR, "models")
    
    vectorizer_path = os.path.join(MODELS_DIR, 'sentrizk_vectorizer.joblib')
    model_path = os.path.join(MODELS_DIR, 'sentrizk_model.pth')

    # 2. LOAD AI COMPONENTS
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    vectorizer = joblib.load(vectorizer_path)
    
    model = SentriZKAutoencoder(input_dim=700).to(device) # Matches your 700 features
    model.load_state_dict(torch.load(model_path))
    model.eval()

    # 3. DEFINE BENCHMARK MESSAGES
    safe_benchmarks = [
        "Please send the report by EOD.",
        "Meeting moved to Room 4B.",
        "Thanks for the update on the project.",
        "Can we discuss the budget tomorrow morning?",
        "Lunch at 1pm?"
    ]
    
    threat_benchmarks = [
        "URGENT: Your password expires in 2 hours. Reset here: http://bit.ly/secure-login",
        "Final Warning: Account suspension. Login to verify identity.",
        "You won a gift card! Claim it at lucky-draw-site.com",
        "Hey, check out this attachment for the invoice: malware.zip.exe"
    ]

    # 4. CALIBRATION PHASE (Find the Dynamic Threshold)
    console.print("[bold yellow]Step 1: Calibrating System Baseline...[/bold yellow]")
    safe_scores = []
    with torch.no_grad():
        for msg in safe_benchmarks:
            vec = vectorizer.transform([msg]).toarray().astype('float32')
            vec_t = torch.from_numpy(vec).to(device)
            recon = model(vec_t)
            mse = torch.mean((vec_t - recon)**2).item()
            safe_scores.append(mse)
    
    # We set the threshold at the 95th percentile of safe traffic
    # This minimizes False Positives
    DYNAMIC_THRESHOLD = np.percentile(safe_scores, 95)
    console.print(f"[*] Computed Dynamic Threshold: [bold green]{DYNAMIC_THRESHOLD:.6f}[/bold green]\n")

    # 5. AUDIT PHASE
    table = Table(title="SentriZK Final Security Audit")
    table.add_column("Message Content", style="dim", width=55)
    table.add_column("Threat Score", justify="right")
    table.add_column("Detection", justify="center")

    all_test = [(m, "SAFE") for m in safe_benchmarks] + [(m, "THREAT") for m in threat_benchmarks]
    
    with torch.no_grad():
        for msg, expected in all_test:
            vec = vectorizer.transform([msg]).toarray().astype('float32')
            vec_t = torch.from_numpy(vec).to(device)
            recon = model(vec_t)
            mse = torch.mean((vec_t - recon)**2).item()
            
            is_anomaly = mse > DYNAMIC_THRESHOLD
            status = "[bold red]⚠️ THREAT[/bold red]" if is_anomaly else "[bold green]✅ SAFE[/bold green]"
            
            table.add_row(msg[:53], f"{mse:.6f}", status)

    console.print(table)

if __name__ == "__main__":
    run_calibration_audit()