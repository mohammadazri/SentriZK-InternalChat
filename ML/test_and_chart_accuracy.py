import os
import pickle
import pandas as pd
import numpy as np
import tensorflow as tf
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix, classification_report
from tensorflow.keras.preprocessing.sequence import pad_sequences
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich import box

console = Console()

def run_test_and_generate_chart():
    # --- 1. SETUP PATHS ---
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_PATH = os.path.join(BASE_DIR, "DataSet", "train_ready.csv") 
    MODELS_DIR = os.path.join(BASE_DIR, "models", "production")
    CHARTS_DIR = os.path.join(BASE_DIR, "charts")
    os.makedirs(CHARTS_DIR, exist_ok=True)
    
    TOKENIZER_PATH = os.path.join(MODELS_DIR, 'sentrizk_tokenizer.pickle')
    MODEL_PATH = os.path.join(MODELS_DIR, 'sentrizk_production_model.keras')

    console.print(Panel.fit("[bold cyan]🔍 SentriZK ML Evaluator & Chart Generator[/bold cyan]\n[dim]Testing Mobile Conv1D & Generating Light Mode Poster Chart[/dim]", border_style="cyan"))

    if not os.path.exists(MODEL_PATH) or not os.path.exists(TOKENIZER_PATH):
        console.print("[bold red]Error:[/bold red] Model or Tokenizer not found.")
        return

    # --- 2. LOAD & SPLIT DATA ---
    console.print("[yellow]Loading dataset and preparing the 20% validation 'exam'...[/yellow]")
    df = pd.read_csv(DATA_PATH)
    texts = df['text'].fillna("").astype(str).values
    labels = df['label'].values

    _, val_texts, _, val_labels = train_test_split(texts, labels, test_size=0.2, random_state=42)
    
    # --- 3. PREPROCESS ---
    with open(TOKENIZER_PATH, 'rb') as handle:
        tokenizer = pickle.load(handle)
        
    val_seq = tokenizer.texts_to_sequences(val_texts)
    val_padded = pad_sequences(val_seq, maxlen=120, padding='post', truncating='post')

    # --- 4. LOAD MODEL & PREDICT ---
    console.print("[yellow]Loading Mobile Model & Running Inference...[/yellow]")
    model = tf.keras.models.load_model(MODEL_PATH)
    raw_predictions = model.predict(val_padded, verbose=0)
    
    # Use 0.65 threshold to exactly match the real production app (app_config.dart)
    binary_predictions = (raw_predictions > 0.65).astype(int)
    # --- 5. CALCULATE DYNAMIC METRICS ---
    # We use average='binary' (focusing on the Threat class) to get realistic, non-blended metrics
    acc = accuracy_score(val_labels, binary_predictions) * 100
    precision, recall, f1, _ = precision_recall_fscore_support(val_labels, binary_predictions, average='binary', pos_label=1)
    cm = confusion_matrix(val_labels, binary_predictions)
    tn, fp, fn, tp = cm.ravel()
    
    precision *= 100
    recall *= 100
    f1 *= 100

    # Console Output
    acc_color = "green" if acc > 85 else "red"
    console.print(Panel(f"[bold {acc_color}]Overall Accuracy: {acc:.2f}%[/bold {acc_color}]\n[dim]Calculated on {len(val_texts)} unseen test messages.[/dim]", border_style=acc_color))
    
    # Confusion Matrix Table
    cm_table = Table(title="Confusion Matrix Breakdown", box=box.SIMPLE_HEAVY, show_header=True, header_style="bold magenta")
    cm_table.add_column("Prediction Type")
    cm_table.add_column("Count", justify="right")
    cm_table.add_column("Meaning")

    cm_table.add_row("[green]True Negatives (TN)[/green]", str(tn), "Correctly identified Safe messages")
    cm_table.add_row("[green]True Positives (TP)[/green]", str(tp), "Correctly caught Threats")
    cm_table.add_row("[red]False Positives (FP)[/red]", str(fp), "Safe messages flagged as Threat (False Alarms)")
    cm_table.add_row("[red]False Negatives (FN)[/red]", str(fn), "Threats that bypassed the AI (Misses)")

    console.print("\n")
    console.print(cm_table)
    
    console.print("\n[bold white]Detailed Scikit-Learn Report:[/bold white]")
    console.print(classification_report(val_labels, binary_predictions, target_names=["Safe (0)", "Threat (1)"]))

    # --- 6. GENERATE LIGHT MODE POSTER CHART ---
    console.print("[yellow]Generating Light Mode Poster Chart...[/yellow]")
    
    # Light theme
    plt.style.use('seaborn-v0_8-whitegrid')
    
    metrics = ['Overall Accuracy', 'Precision', 'Recall', 'F1-Score']
    scores = [acc, precision, recall, f1]
    
    fig, ax = plt.subplots(figsize=(10, 6))
    fig.patch.set_facecolor('white') 
    ax.set_facecolor('#f8fafc') # Very light slate gray for subtle contrast
    
    # Colors: Highlight Accuracy in Green, others in Blue (Light mode friendly)
    colors = ['#10b981', '#3b82f6', '#3b82f6', '#3b82f6']
    
    bars = ax.bar(metrics, scores, color=colors, width=0.5, edgecolor='#cbd5e1', linewidth=1)
    
    # Styling
    ax.set_ylim(0, 100)
    ax.set_ylabel('Performance Score (%)', color='#0f172a', fontsize=14, fontweight='bold', labelpad=15)
    ax.tick_params(axis='x', colors='#334155', labelsize=14)
    ax.tick_params(axis='y', colors='#334155', labelsize=12)
    
    # Add large percentage labels directly on top of the bars
    for bar in bars:
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height + 2,
                f'{height:.1f}%',
                ha='center', va='bottom', color='#0f172a', fontsize=16, fontweight='bold')
                
    # Big Poster Title
    plt.title('SentriZK Edge AI (Mobile Conv1D) — Performance Metrics', color='#0f172a', fontsize=18, fontweight='bold', pad=20)
    
    # Ensure grid lines are subtle
    ax.grid(axis='y', color='#e2e8f0', linestyle='-', alpha=0.8)
    ax.grid(axis='x', visible=False)
    
    # Save High-Res PNG
    out_path = os.path.join(CHARTS_DIR, 'poster_final_accuracy_light.png')
    
    plt.tight_layout()
    plt.savefig(out_path, dpi=600, facecolor=fig.get_facecolor(), edgecolor='none')
    console.print(f"[bold green]✔ Light Mode Bar Chart successfully saved to:[/bold green] {out_path}")
    plt.close()

    # --- 7. GENERATE CONFUSION MATRIX CHART ---
    console.print("[yellow]Generating Light Mode Confusion Matrix...[/yellow]")
    fig_cm, ax_cm = plt.subplots(figsize=(8, 6))
    fig_cm.patch.set_facecolor('white')
    ax_cm.set_facecolor('white')

    # Create the heatmap using seaborn
    import seaborn as sns
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', cbar=False,
                annot_kws={'size': 18, 'weight': 'bold'},
                xticklabels=['Safe', 'Threat'],
                yticklabels=['Safe', 'Threat'], ax=ax_cm)

    ax_cm.set_xlabel('Predicted Label', color='#0f172a', fontsize=14, fontweight='bold', labelpad=10)
    ax_cm.set_ylabel('True Label', color='#0f172a', fontsize=14, fontweight='bold', labelpad=10)
    ax_cm.tick_params(axis='both', colors='#334155', labelsize=12)
    plt.title('SentriZK — Confusion Matrix (0.65 Threshold)', color='#0f172a', fontsize=16, fontweight='bold', pad=20)

    # Save High-Res PNG
    cm_out_path = os.path.join(CHARTS_DIR, 'poster_confusion_matrix_light.png')
    plt.tight_layout()
    plt.savefig(cm_out_path, dpi=600, facecolor=fig_cm.get_facecolor(), edgecolor='none')
    console.print(f"[bold green]✔ Light Mode Confusion Matrix successfully saved to:[/bold green] {cm_out_path}")

if __name__ == "__main__":
    run_test_and_generate_chart()
