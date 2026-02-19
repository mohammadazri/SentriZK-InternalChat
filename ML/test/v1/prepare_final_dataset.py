# inject_synthetic.py
import pandas as pd
import os
from rich.console import Console

console = Console()

def inject_data():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR = os.path.join(BASE_DIR, "../../DataSet")
    
    train_path = os.path.join(DATA_DIR, "train_ready.csv")
    synth_path = os.path.join(DATA_DIR, "synthetic_threats.csv")
    
    if not os.path.exists(train_path) or not os.path.exists(synth_path):
        console.print("[red]Files not found![/red]")
        return

    console.print("[yellow]Injecting Synthetic Threats...[/yellow]")
    
    df_train = pd.read_csv(train_path)
    df_synth = pd.read_csv(synth_path)
    
    # Merge
    df_final = pd.concat([df_train, df_synth], ignore_index=True)
    
    # Shuffle
    df_final = df_final.sample(frac=1, random_state=42).reset_index(drop=True)
    
    df_final.to_csv(train_path, index=False)
    
    console.print(f"[bold green]✔ Injection Complete! New Training Size: {len(df_final)}[/bold green]")
    console.print("Now run 'training.py' again.")

if __name__ == "__main__":
    inject_data()