import pandas as pd
import os
import glob
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

console = Console()

def process_exais_fixed():
    # --- SETUP PATHS ---
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    # Assuming script is in ML/, data is in ML/DataSet/ExAIS_SMS
    DATA_DIR = os.path.join(BASE_DIR, "../DataSet", "ExAIS_SMS")
    OUTPUT_DIR = os.path.join(BASE_DIR, "../DataSet")
    
    spam_output = os.path.join(OUTPUT_DIR, "exais_spam.csv")
    safe_output = os.path.join(OUTPUT_DIR, "exais_safe.csv")

    console.print(Panel("[bold cyan]ExAIS SMS Extractor (Fixed Structure)[/bold cyan]\n[dim]Targeting Column 6 (Label) and Column 7 (Text)[/dim]"))

    search_path = os.path.join(DATA_DIR, "USER *.csv")
    files = glob.glob(search_path)
    
    if not files:
        console.print(f"[bold red]Error:[/bold red] No 'USER *.csv' files found in {DATA_DIR}")
        return

    all_data = []

    with console.status(f"[bold yellow]Processing {len(files)} user files...[/bold yellow]"):
        for file_path in files:
            try:
                # 1. Read without header (header=None)
                # 2. Use error_bad_lines=False/on_bad_lines='skip' to ignore broken rows
                df = pd.read_csv(file_path, header=None, encoding='latin-1', on_bad_lines='skip')
                
                # Check if file has enough columns (at least 8: 0 to 7)
                if len(df.columns) < 8:
                    continue

                # Extract specific columns: 6 is Label, 7 is Text
                temp_df = df.iloc[:, [6, 7]].copy()
                temp_df.columns = ['label_raw', 'text']
                
                # Filter out garbage rows (where label isn't SPAM or HAM)
                temp_df = temp_df[temp_df['label_raw'].astype(str).str.upper().isin(['SPAM', 'HAM'])]
                
                all_data.append(temp_df)
            
            except Exception as e:
                console.print(f"[red]Skipping {os.path.basename(file_path)}:[/red] {e}")

    # --- MERGE ---
    if not all_data:
        console.print("[red]No valid data extracted.[/red]")
        return

    full_df = pd.concat(all_data, ignore_index=True)
    
    # Clean Text
    full_df['text'] = full_df['text'].astype(str)
    full_df['text'] = full_df['text'].str.replace(r'\n', ' ', regex=True)
    full_df['text'] = full_df['text'].str.replace(r'\s+', ' ', regex=True).str.strip()
    
    # Normalize Labels (1 = SPAM, 0 = HAM)
    full_df['label'] = full_df['label_raw'].str.upper().apply(lambda x: 1 if 'SPAM' in x else 0)

    # Separate
    spam_df = full_df[full_df['label'] == 1][['text']]
    safe_df = full_df[full_df['label'] == 0][['text']]

    # Save
    spam_df.to_csv(spam_output, index=False)
    safe_df.to_csv(safe_output, index=False)
    
    # --- SUMMARY ---
    table = Table(title="ExAIS Extraction Summary (Fixed)")
    table.add_column("Category", style="cyan")
    table.add_column("Count", justify="right", style="green")
    
    table.add_row("SPAM (Threats)", f"{len(spam_df):,}")
    table.add_row("SAFE (Ham)", f"{len(safe_df):,}")
    
    console.print(table)
    console.print(f"[bold green]✔ Extraction Complete![/bold green] check {spam_output}")

if __name__ == "__main__":
    process_exais_fixed()