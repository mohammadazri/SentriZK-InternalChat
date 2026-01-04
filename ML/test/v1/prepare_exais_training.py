import pandas as pd
import os
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

console = Console()

def prepare_exais_training_set():
    # --- SETUP PATHS ---
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR = os.path.join(BASE_DIR, "../../DataSet")
    
    # Inputs (The files you just created)
    spam_path = os.path.join(DATA_DIR, "exais_spam.csv")
    safe_path = os.path.join(DATA_DIR, "exais_safe.csv")
    
    # Output (The file ML will read)
    output_path = os.path.join(DATA_DIR, "train_ready.csv")

    console.print(Panel("[bold cyan]SentriZK Data Merger[/bold cyan]\n[dim]Preparing ExAIS Data for Training...[/dim]"))

    # --- 1. LOAD AND LABEL ---
    try:
        # Load Safe Data -> Label 0
        df_safe = pd.read_csv(safe_path)
        df_safe['label'] = 0
        console.print(f"[green]✔ Loaded {len(df_safe)} Safe messages.[/green]")

        # Load Spam Data -> Label 1
        df_spam = pd.read_csv(spam_path)
        df_spam['label'] = 1
        console.print(f"[red]✔ Loaded {len(df_spam)} Threat messages.[/red]")

    except FileNotFoundError as e:
        console.print(f"[bold red]Error:[/bold red] Could not find input files. {e}")
        return

    # --- 2. MERGE AND SHUFFLE ---
    with console.status("[bold yellow]Merging and Cleaning...[/bold yellow]"):
        # Combine
        final_df = pd.concat([df_safe, df_spam], ignore_index=True)
        
        # Shuffle (Randomize order so ML learns better)
        final_df = final_df.sample(frac=1, random_state=42).reset_index(drop=True)
        
        # Clean Text (Remove newlines and extra spaces)
        final_df['text'] = final_df['text'].astype(str)
        final_df['text'] = final_df['text'].str.replace(r'\n', ' ', regex=True)
        final_df['text'] = final_df['text'].str.replace(r'\s+', ' ', regex=True).str.strip()

        # Save to CSV
        final_df.to_csv(output_path, index=False)

    # --- 3. FINAL SUMMARY ---
    table = Table(title="Final Training Data Structure")
    table.add_column("Label", justify="center", style="cyan")
    table.add_column("Meaning", style="magenta")
    table.add_column("Count", justify="right", style="green")

    table.add_row("0", "SAFE (Ham)", f"{len(df_safe):,}")
    table.add_row("1", "THREAT (Spam)", f"{len(df_spam):,}")
    table.add_section()
    table.add_row("ALL", "Total Training Set", f"[bold]{len(final_df):,}[/bold]")

    console.print(table)
    console.print(f"[bold green]✔ Success![/bold green] Ready to train. File saved to: [underline]{output_path}[/underline]")

if __name__ == "__main__":
    prepare_exais_training_set()