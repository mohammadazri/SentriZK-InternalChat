import pandas as pd
import os
from rich.console import Console
from rich.table import Table

console = Console()

def check_counts():
    # 1. Setup Path
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    spam_path = os.path.join(BASE_DIR, "../DataSet", "spam.csv")

    if not os.path.exists(spam_path):
        console.print(f"[bold red]Error:[/bold red] File not found at {spam_path}")
        return

    # 2. Load Data (spam.csv usually requires 'latin-1' encoding)
    try:
        df = pd.read_csv(spam_path, encoding='latin-1')
    except Exception as e:
        console.print(f"[red]Error reading CSV:[/red] {e}")
        return

    # 3. Count the labels in column 'v1'
    # 'v1' is the standard label column in the SMS Spam Collection dataset
    counts = df['v1'].value_counts()
    total = len(df)

    # 4. Display Results
    table = Table(title="Spam.csv Data Distribution")
    table.add_column("Label", style="cyan", justify="center")
    table.add_column("Count", style="green", justify="right")
    table.add_column("Percentage", style="magenta", justify="right")

    for label, count in counts.items():
        percentage = (count / total) * 100
        table.add_row(label.upper(), f"{count:,}", f"{percentage:.2f}%")

    table.add_section()
    table.add_row("TOTAL", f"{total:,}", "100.00%")

    console.print(table)

if __name__ == "__main__":
    check_counts()