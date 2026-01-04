import os
import joblib
import torch
import torch.nn as nn
import torch.optim as optim
import pandas as pd
import numpy as np
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.live import Live
from sklearn.feature_extraction.text import TfidfVectorizer

console = Console()

# 1. HIGH-SENSITIVITY ARCHITECTURE
class SentriZKAutoencoder(nn.Module):
    def __init__(self, input_dim):
        super(SentriZKAutoencoder, self).__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 4),  # ULTRA-TIGHT BOTTLENECK for anomaly detection
            nn.ReLU()
        )
        self.decoder = nn.Sequential(
            nn.Linear(4, 128),
            nn.ReLU(),
            nn.Linear(128, input_dim),
            nn.Sigmoid()
        )

    def forward(self, x):
        return self.decoder(self.encoder(x))

def run_advanced_gui_training():
    # --- PATHS ---
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_PATH = os.path.join(BASE_DIR, "DataSet", "train_ready.csv")
    MODELS_DIR = os.path.join(BASE_DIR, "models")
    os.makedirs(MODELS_DIR, exist_ok=True)

    console.print(Panel("[bold cyan]SentriZK Deep Learning Dashboard v3.0[/bold cyan]\n[dim]GPU: RTX 1660 Ti | Mode: High-Sensitivity Anomaly Detection[/dim]"))

    # --- 1. DATA LOADING ---
    with console.status("[bold blue]Loading Harmonized Dataset..."):
        df = pd.read_csv(DATA_PATH)
        safe_texts = df[df['label'] == 0]['text'].values.astype(str)
        threat_texts = df[df['label'] == 1]['text'].values.astype(str)

    # --- 2. VECTORIZATION ---
    with console.status("[bold magenta]Vectorizing (700 Features)..."):
        # We increase features to 700 to capture complex phishing patterns
        vectorizer = TfidfVectorizer(max_features=700, stop_words='english', ngram_range=(1,2))
        X_safe = vectorizer.fit_transform(safe_texts).toarray().astype('float32')
        X_threat = vectorizer.transform(threat_texts).toarray().astype('float32')
        joblib.dump(vectorizer, os.path.join(MODELS_DIR, 'sentrizk_vectorizer.joblib'))

    # --- 3. GPU SETUP ---
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    X_safe_tensor = torch.from_numpy(X_safe).to(device)
    X_threat_tensor = torch.from_numpy(X_threat).to(device)
    
    model = SentriZKAutoencoder(700).to(device)
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    criterion = nn.MSELoss()

    # --- 4. TRAINING LOOP WITH LIVE UI ---
    epochs = 40
    batch_size = 512
    
    console.print(f"\n[bold yellow]🚀 Training on {len(safe_texts)} Safe Samples...[/bold yellow]")
    
    with Live(console=console, refresh_per_second=4) as live:
        for epoch in range(epochs):
            model.train()
            permutation = torch.randperm(X_safe_tensor.size()[0])
            
            for i in range(0, X_safe_tensor.size()[0], batch_size):
                indices = permutation[i:i+batch_size]
                batch_x = X_safe_tensor[indices]

                optimizer.zero_grad()
                outputs = model(batch_x)
                loss = criterion(outputs, batch_x)
                loss.backward()
                optimizer.step()

            # --- VALIDATION: CHECK THREAT DETECTION CAPABILITY ---
            model.eval()
            with torch.no_grad():
                threat_recon = model(X_threat_tensor[:100])
                threat_loss = criterion(threat_recon, X_threat_tensor[:100])

            # Update Live Table
            table = Table(title=f"Epoch {epoch+1}/{epochs} Status")
            table.add_column("Metric", style="cyan")
            table.add_column("Value", style="green")
            table.add_row("Safe Reconstruction Loss (MSE)", f"{loss.item():.8f}")
            table.add_row("Threat Separation (MSE)", f"{threat_loss.item():.8f}")
            live.update(table)

    # --- 5. SAVE & EXPORT ---
    torch.save(model.state_dict(), os.path.join(MODELS_DIR, "sentrizk_model.pth"))
    
    final_panel = Panel(f"[bold green]✔ Training Complete![/bold green]\nModel and Vectorizer saved in [bold]/models/[/bold]", border_style="green")
    console.print(final_panel)

if __name__ == "__main__":
    run_advanced_gui_training()