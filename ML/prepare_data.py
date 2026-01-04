import pandas as pd
import json
import os
from rich.console import Console

console = Console()

def prepare_sentrizk_dataset():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    enron_path = os.path.join(BASE_DIR, "DataSet", "Enron", "cleaned_enron_emails.json")
    spam_path = os.path.join(BASE_DIR, "DataSet", "spam.csv")
    
    # --- 1. PROCESS ENRON (Professional Safe Data) ---
    console.print("[yellow]Processing Enron JSON...[/yellow]")
    with open(enron_path, 'r', encoding='utf-8') as f:
        enron_raw = json.load(f)
    
    enron_df = pd.DataFrame(enron_raw)
    # Only keep the Body and ensure it's not empty
    enron_df = enron_df[enron_df['Body'].str.strip() != ""]
    enron_df = enron_df[['Body']].rename(columns={'Body': 'text'})
    enron_df['label'] = 0 # Safe
    # Sample 20,000 for a robust baseline
    enron_df = enron_df.sample(n=20000, random_state=42)

    # --- 2. PROCESS SPAM.CSV (Casual Ham + Threats) ---
    console.print("[yellow]Processing Spam CSV...[/yellow]")
    spam_df = pd.read_csv(spam_path, encoding='latin-1')[['v1', 'v2']]
    spam_df.columns = ['label_raw', 'text']
    
    # Map 'ham' to 0 and 'spam' to 1
    spam_df['label'] = spam_df['label_raw'].map({'ham': 0, 'spam': 1})
    spam_df = spam_df.drop(columns=['label_raw'])

    # --- 3. MERGE & CLEAN ---
    console.print("[blue]Merging and Cleaning...[/blue]")
    final_df = pd.concat([enron_df, spam_df], ignore_index=True)
    
    # Remove newlines, tabs, and special characters to help TF-IDF
    final_df['text'] = final_df['text'].str.replace(r'\n', ' ', regex=True)
    final_df['text'] = final_df['text'].str.replace(r'\s+', ' ', regex=True).str.strip()
    
    # Save for training
    output_path = os.path.join(BASE_DIR, "DataSet", "train_ready.csv")
    final_df.to_csv(output_path, index=False)
    
    console.print(f"[bold green]✔ Success![/bold green] Cleaned data saved to {output_path}")
    console.print(f"Total Safe (0): {len(final_df[final_df['label']==0])}")
    console.print(f"Total Threats (1): {len(final_df[final_df['label']==1])}")

if __name__ == "__main__":
    prepare_sentrizk_dataset()