"""
SentriZK ML Evaluation & Chart Generator
=========================================
Loads the trained PC (Bi-LSTM) and Mobile (Conv1D) models,
evaluates them on the validation split, and generates
publication-ready charts for poster / report / slides.

Output:  ML/charts/  (all PNG files)
"""

import os
import pickle
import json
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report, confusion_matrix,
    roc_curve, auc, precision_recall_curve, average_precision_score
)
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend for file output
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import seaborn as sns

# ─── Configuration ────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
DATA_PATH  = os.path.join(BASE_DIR, "DataSet", "train_ready.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models", "production")
CHARTS_DIR = os.path.join(BASE_DIR, "charts")
os.makedirs(CHARTS_DIR, exist_ok=True)

VOCAB_SIZE = 10000
MAX_LEN    = 120
OOV_TOK    = "<OOV>"

# ─── Style ────────────────────────────────────────────────
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")

# SentriZK brand colors
BRAND_PRIMARY   = '#2563eb'   # Blue
BRAND_SECONDARY = '#10b981'   # Green
BRAND_ACCENT    = '#f59e0b'   # Amber
BRAND_DANGER    = '#ef4444'   # Red
BRAND_BG        = '#0f172a'   # Dark
BRAND_TEXT       = '#e2e8f0'

# Modern dark theme for all charts
DARK_PARAMS = {
    'figure.facecolor': '#0f172a',
    'axes.facecolor':   '#1e293b',
    'axes.edgecolor':   '#334155',
    'axes.labelcolor':  '#e2e8f0',
    'text.color':       '#e2e8f0',
    'xtick.color':      '#94a3b8',
    'ytick.color':      '#94a3b8',
    'grid.color':       '#334155',
    'legend.facecolor': '#1e293b',
    'legend.edgecolor': '#334155',
    'font.family':      'sans-serif',
    'font.size':        12,
}
plt.rcParams.update(DARK_PARAMS)


def load_data_and_models():
    """Load dataset, tokenizer, and both trained models."""
    print("📂 Loading dataset...")
    df = pd.read_csv(DATA_PATH)
    texts  = df['text'].fillna("").astype(str).values
    labels = df['label'].values

    # Same split as training (random_state=42)
    _, val_texts, _, val_labels = train_test_split(
        texts, labels, test_size=0.2, random_state=42
    )

    print("📂 Loading tokenizer...")
    tokenizer_path = os.path.join(MODELS_DIR, 'sentrizk_tokenizer.pickle')
    with open(tokenizer_path, 'rb') as f:
        tokenizer = pickle.load(f)

    from tensorflow.keras.preprocessing.sequence import pad_sequences
    val_seq    = tokenizer.texts_to_sequences(val_texts)
    val_padded = pad_sequences(val_seq, maxlen=MAX_LEN, padding='post', truncating='post')

    print("📂 Loading PC Research Model (Bi-LSTM)...")
    pc_model = tf.keras.models.load_model(
        os.path.join(MODELS_DIR, 'sentrizk_research_model.keras')
    )

    print("📂 Loading Mobile Production Model (Conv1D)...")
    mobile_model = tf.keras.models.load_model(
        os.path.join(MODELS_DIR, 'sentrizk_production_model.keras')
    )

    return val_padded, val_labels, val_texts, pc_model, mobile_model, tokenizer, texts, labels


def retrain_and_get_history(texts, labels, tokenizer):
    """Quick retrain to capture training history for accuracy/loss curves."""
    from tensorflow.keras.preprocessing.sequence import pad_sequences
    from sklearn.utils import class_weight
    from tensorflow.keras.callbacks import EarlyStopping

    train_texts, val_texts, train_labels, val_labels = train_test_split(
        texts, labels, test_size=0.2, random_state=42
    )

    train_seq   = tokenizer.texts_to_sequences(train_texts)
    val_seq     = tokenizer.texts_to_sequences(val_texts)
    train_padded = pad_sequences(train_seq, maxlen=MAX_LEN, padding='post', truncating='post')
    val_padded   = pad_sequences(val_seq, maxlen=MAX_LEN, padding='post', truncating='post')

    weights = class_weight.compute_class_weight(
        class_weight='balanced', classes=np.unique(train_labels), y=train_labels
    )
    class_weights_dict = {0: weights[0], 1: weights[1] * 1.5}

    # PC Model (Bi-LSTM)
    print("\n🔄 Retraining PC Model for history curves...")
    pc_model = tf.keras.Sequential([
        tf.keras.layers.Embedding(VOCAB_SIZE, 64, input_length=MAX_LEN),
        tf.keras.layers.Bidirectional(tf.keras.layers.LSTM(32, return_sequences=True)),
        tf.keras.layers.GlobalMaxPooling1D(),
        tf.keras.layers.Dense(32, activation='relu'),
        tf.keras.layers.Dropout(0.5),
        tf.keras.layers.Dense(1, activation='sigmoid')
    ])
    pc_model.compile(loss='binary_crossentropy', optimizer='adam', metrics=['accuracy'])
    early_stop = EarlyStopping(monitor='val_loss', patience=3, restore_best_weights=True)
    pc_history = pc_model.fit(
        train_padded, train_labels, epochs=20,
        validation_data=(val_padded, val_labels),
        class_weight=class_weights_dict, batch_size=32,
        callbacks=[early_stop], verbose=1
    )

    # Mobile Model (Conv1D)
    print("\n🔄 Retraining Mobile Model for history curves...")
    mobile_model = tf.keras.Sequential([
        tf.keras.layers.Embedding(VOCAB_SIZE, 64, input_length=MAX_LEN),
        tf.keras.layers.Conv1D(128, 5, activation='relu'),
        tf.keras.layers.GlobalMaxPooling1D(),
        tf.keras.layers.Dense(64, activation='relu'),
        tf.keras.layers.Dropout(0.4),
        tf.keras.layers.Dense(1, activation='sigmoid')
    ])
    mobile_model.compile(loss='binary_crossentropy', optimizer='adam', metrics=['accuracy'])
    mobile_history = mobile_model.fit(
        train_padded, train_labels, epochs=15,
        validation_data=(val_padded, val_labels),
        class_weight=class_weights_dict, batch_size=32, verbose=1
    )

    return pc_history, mobile_history, pc_model, mobile_model, val_padded, val_labels


# ═══════════════════════════════════════════════════════════
#  CHART 1: Confusion Matrices (Side by Side)
# ═══════════════════════════════════════════════════════════
def plot_confusion_matrices(val_padded, val_labels, pc_model, mobile_model):
    print("📊 Generating Confusion Matrices...")
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    fig.suptitle('SentriZK — Confusion Matrices', fontsize=18, fontweight='bold', color=BRAND_TEXT, y=1.02)

    models = [
        (pc_model,     'PC Research Model\n(Bi-LSTM)',  BRAND_PRIMARY, axes[0]),
        (mobile_model, 'Mobile Production\n(Conv1D)',   BRAND_SECONDARY, axes[1]),
    ]

    for model, title, color, ax in models:
        preds = (model.predict(val_padded, verbose=0) > 0.5).astype(int).flatten()
        cm = confusion_matrix(val_labels, preds)

        sns.heatmap(
            cm, annot=True, fmt='d', cmap='Blues' if color == BRAND_PRIMARY else 'Greens',
            xticklabels=['Safe', 'Threat'], yticklabels=['Safe', 'Threat'],
            ax=ax, cbar=False, annot_kws={'size': 20, 'weight': 'bold'},
            linewidths=2, linecolor='#334155'
        )
        ax.set_title(title, fontsize=14, fontweight='bold', pad=12)
        ax.set_xlabel('Predicted Label', fontsize=12)
        ax.set_ylabel('True Label', fontsize=12)

    plt.tight_layout()
    path = os.path.join(CHARTS_DIR, 'confusion_matrices.png')
    fig.savefig(path, dpi=200, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"   ✅ Saved: {path}")


# ═══════════════════════════════════════════════════════════
#  CHART 2: Training Accuracy & Loss Curves
# ═══════════════════════════════════════════════════════════
def plot_training_curves(pc_history, mobile_history):
    print("📊 Generating Training Curves...")
    fig, axes = plt.subplots(2, 2, figsize=(16, 10))
    fig.suptitle('SentriZK — Training & Validation Curves', fontsize=18, fontweight='bold', color=BRAND_TEXT, y=1.02)

    # PC Accuracy
    ax = axes[0, 0]
    ax.plot(pc_history.history['accuracy'],     label='Train Accuracy', color=BRAND_PRIMARY, linewidth=2.5)
    ax.plot(pc_history.history['val_accuracy'],  label='Val Accuracy',   color=BRAND_ACCENT,  linewidth=2.5, linestyle='--')
    ax.set_title('PC Model (Bi-LSTM) — Accuracy', fontweight='bold')
    ax.set_xlabel('Epoch')
    ax.set_ylabel('Accuracy')
    ax.legend(framealpha=0.8)
    ax.set_ylim([0.5, 1.0])

    # PC Loss
    ax = axes[0, 1]
    ax.plot(pc_history.history['loss'],     label='Train Loss', color=BRAND_DANGER,    linewidth=2.5)
    ax.plot(pc_history.history['val_loss'],  label='Val Loss',   color=BRAND_ACCENT,    linewidth=2.5, linestyle='--')
    ax.set_title('PC Model (Bi-LSTM) — Loss', fontweight='bold')
    ax.set_xlabel('Epoch')
    ax.set_ylabel('Loss')
    ax.legend(framealpha=0.8)

    # Mobile Accuracy
    ax = axes[1, 0]
    ax.plot(mobile_history.history['accuracy'],    label='Train Accuracy', color=BRAND_SECONDARY, linewidth=2.5)
    ax.plot(mobile_history.history['val_accuracy'], label='Val Accuracy',   color=BRAND_ACCENT,    linewidth=2.5, linestyle='--')
    ax.set_title('Mobile Model (Conv1D) — Accuracy', fontweight='bold')
    ax.set_xlabel('Epoch')
    ax.set_ylabel('Accuracy')
    ax.legend(framealpha=0.8)
    ax.set_ylim([0.5, 1.0])

    # Mobile Loss
    ax = axes[1, 1]
    ax.plot(mobile_history.history['loss'],     label='Train Loss', color=BRAND_DANGER,    linewidth=2.5)
    ax.plot(mobile_history.history['val_loss'],  label='Val Loss',   color=BRAND_ACCENT,    linewidth=2.5, linestyle='--')
    ax.set_title('Mobile Model (Conv1D) — Loss', fontweight='bold')
    ax.set_xlabel('Epoch')
    ax.set_ylabel('Loss')
    ax.legend(framealpha=0.8)

    plt.tight_layout()
    path = os.path.join(CHARTS_DIR, 'training_curves.png')
    fig.savefig(path, dpi=200, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"   ✅ Saved: {path}")


# ═══════════════════════════════════════════════════════════
#  CHART 3: ROC Curves (Both models overlaid)
# ═══════════════════════════════════════════════════════════
def plot_roc_curves(val_padded, val_labels, pc_model, mobile_model):
    print("📊 Generating ROC Curves...")
    fig, ax = plt.subplots(figsize=(8, 8))
    ax.set_title('SentriZK — ROC Curve Comparison', fontsize=16, fontweight='bold', pad=12)

    for model, name, color, ls in [
        (pc_model,     'PC Bi-LSTM',      BRAND_PRIMARY,   '-'),
        (mobile_model, 'Mobile Conv1D',   BRAND_SECONDARY, '--'),
    ]:
        scores = model.predict(val_padded, verbose=0).flatten()
        fpr, tpr, _ = roc_curve(val_labels, scores)
        roc_auc = auc(fpr, tpr)
        ax.plot(fpr, tpr, color=color, linewidth=2.5, linestyle=ls,
                label=f'{name} (AUC = {roc_auc:.4f})')

    ax.plot([0, 1], [0, 1], 'w--', alpha=0.3, linewidth=1)
    ax.set_xlabel('False Positive Rate', fontsize=13)
    ax.set_ylabel('True Positive Rate', fontsize=13)
    ax.legend(loc='lower right', fontsize=12, framealpha=0.8)
    ax.set_xlim([0, 1])
    ax.set_ylim([0, 1.02])

    plt.tight_layout()
    path = os.path.join(CHARTS_DIR, 'roc_curves.png')
    fig.savefig(path, dpi=200, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"   ✅ Saved: {path}")


# ═══════════════════════════════════════════════════════════
#  CHART 4: Precision-Recall Curves
# ═══════════════════════════════════════════════════════════
def plot_pr_curves(val_padded, val_labels, pc_model, mobile_model):
    print("📊 Generating Precision-Recall Curves...")
    fig, ax = plt.subplots(figsize=(8, 8))
    ax.set_title('SentriZK — Precision-Recall Curve', fontsize=16, fontweight='bold', pad=12)

    for model, name, color, ls in [
        (pc_model,     'PC Bi-LSTM',      BRAND_PRIMARY,   '-'),
        (mobile_model, 'Mobile Conv1D',   BRAND_SECONDARY, '--'),
    ]:
        scores = model.predict(val_padded, verbose=0).flatten()
        precision, recall, _ = precision_recall_curve(val_labels, scores)
        ap = average_precision_score(val_labels, scores)
        ax.plot(recall, precision, color=color, linewidth=2.5, linestyle=ls,
                label=f'{name} (AP = {ap:.4f})')

    ax.set_xlabel('Recall', fontsize=13)
    ax.set_ylabel('Precision', fontsize=13)
    ax.legend(loc='lower left', fontsize=12, framealpha=0.8)
    ax.set_xlim([0, 1])
    ax.set_ylim([0, 1.02])

    plt.tight_layout()
    path = os.path.join(CHARTS_DIR, 'precision_recall_curves.png')
    fig.savefig(path, dpi=200, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"   ✅ Saved: {path}")


# ═══════════════════════════════════════════════════════════
#  CHART 5: Classification Report Bar Chart
# ═══════════════════════════════════════════════════════════
def plot_classification_report_chart(val_padded, val_labels, pc_model, mobile_model):
    print("📊 Generating Classification Report Chart...")

    fig, axes = plt.subplots(1, 2, figsize=(16, 6))
    fig.suptitle('SentriZK — Classification Report (Per-Class Metrics)',
                 fontsize=16, fontweight='bold', color=BRAND_TEXT, y=1.02)

    for idx, (model, name, palette) in enumerate([
        (pc_model,     'PC Research (Bi-LSTM)',     [BRAND_PRIMARY, '#60a5fa', '#93c5fd']),
        (mobile_model, 'Mobile Production (Conv1D)', [BRAND_SECONDARY, '#34d399', '#6ee7b7']),
    ]):
        preds = (model.predict(val_padded, verbose=0) > 0.5).astype(int).flatten()
        report = classification_report(val_labels, preds,
                                       target_names=['Safe', 'Threat'],
                                       output_dict=True)

        classes = ['Safe', 'Threat']
        metrics = ['precision', 'recall', 'f1-score']
        x = np.arange(len(classes))
        width = 0.25

        ax = axes[idx]
        for i, metric in enumerate(metrics):
            values = [report[cls][metric] for cls in classes]
            bars = ax.bar(x + i * width, values, width, label=metric.capitalize(),
                         color=palette[i], edgecolor='white', linewidth=0.5)
            # Add value labels on bars
            for bar, val in zip(bars, values):
                ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.01,
                       f'{val:.2f}', ha='center', va='bottom', fontsize=10,
                       fontweight='bold', color=BRAND_TEXT)

        ax.set_title(name, fontsize=13, fontweight='bold', pad=10)
        ax.set_xticks(x + width)
        ax.set_xticklabels(classes, fontsize=12)
        ax.set_ylabel('Score')
        ax.set_ylim([0, 1.15])
        ax.legend(fontsize=10, framealpha=0.8)

        # Add overall accuracy annotation
        acc = report['accuracy']
        ax.text(0.98, 0.05, f'Overall Accuracy: {acc:.2%}',
               transform=ax.transAxes, ha='right', va='bottom',
               fontsize=11, fontweight='bold',
               bbox=dict(boxstyle='round,pad=0.4', facecolor=palette[0], alpha=0.3))

    plt.tight_layout()
    path = os.path.join(CHARTS_DIR, 'classification_report.png')
    fig.savefig(path, dpi=200, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"   ✅ Saved: {path}")


# ═══════════════════════════════════════════════════════════
#  CHART 6: Model Comparison Dashboard (Single Summary)
# ═══════════════════════════════════════════════════════════
def plot_model_comparison(val_padded, val_labels, pc_model, mobile_model):
    print("📊 Generating Model Comparison Dashboard...")

    # Get metrics
    metrics_data = {}
    for model, name in [(pc_model, 'PC (Bi-LSTM)'), (mobile_model, 'Mobile (Conv1D)')]:
        scores = model.predict(val_padded, verbose=0).flatten()
        preds  = (scores > 0.5).astype(int)
        report = classification_report(val_labels, preds, output_dict=True)
        fpr, tpr, _ = roc_curve(val_labels, scores)

        metrics_data[name] = {
            'Accuracy':        report['accuracy'],
            'Precision\n(Threat)': report['1']['precision'],
            'Recall\n(Threat)':    report['1']['recall'],
            'F1-Score\n(Threat)':  report['1']['f1-score'],
            'AUC-ROC':          auc(fpr, tpr),
        }

    fig, ax = plt.subplots(figsize=(12, 6))
    fig.suptitle('SentriZK — Model Performance Comparison',
                 fontsize=18, fontweight='bold', color=BRAND_TEXT, y=1.02)

    metric_names = list(metrics_data['PC (Bi-LSTM)'].keys())
    x = np.arange(len(metric_names))
    width = 0.35

    pc_vals     = [metrics_data['PC (Bi-LSTM)'][m]     for m in metric_names]
    mobile_vals = [metrics_data['Mobile (Conv1D)'][m]  for m in metric_names]

    bars1 = ax.bar(x - width/2, pc_vals,     width, label='PC (Bi-LSTM)',      color=BRAND_PRIMARY,   edgecolor='white', linewidth=0.5)
    bars2 = ax.bar(x + width/2, mobile_vals, width, label='Mobile (Conv1D)',   color=BRAND_SECONDARY, edgecolor='white', linewidth=0.5)

    # Value labels
    for bars in [bars1, bars2]:
        for bar in bars:
            h = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2, h + 0.008,
                   f'{h:.2%}', ha='center', va='bottom', fontsize=10,
                   fontweight='bold', color=BRAND_TEXT)

    ax.set_xticks(x)
    ax.set_xticklabels(metric_names, fontsize=11)
    ax.set_ylabel('Score', fontsize=12)
    ax.set_ylim([0, 1.15])
    ax.legend(fontsize=12, framealpha=0.8, loc='upper left')

    # Threshold line at 90%
    ax.axhline(y=0.90, color=BRAND_ACCENT, linestyle=':', linewidth=1.5, alpha=0.6)
    ax.text(len(metric_names) - 0.5, 0.91, '90% Target', fontsize=9, color=BRAND_ACCENT, ha='right')

    plt.tight_layout()
    path = os.path.join(CHARTS_DIR, 'model_comparison.png')
    fig.savefig(path, dpi=200, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"   ✅ Saved: {path}")


# ═══════════════════════════════════════════════════════════
#  CHART 7: Dataset Distribution
# ═══════════════════════════════════════════════════════════
def plot_dataset_distribution(labels):
    print("📊 Generating Dataset Distribution Chart...")

    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    fig.suptitle('SentriZK — Dataset Distribution', fontsize=16, fontweight='bold', color=BRAND_TEXT, y=1.02)

    counts = pd.Series(labels).value_counts().sort_index()
    class_names = ['Safe (0)', 'Threat (1)']
    colors = [BRAND_SECONDARY, BRAND_DANGER]

    # Bar chart
    bars = axes[0].bar(class_names, counts.values, color=colors, edgecolor='white', linewidth=1)
    for bar, val in zip(bars, counts.values):
        axes[0].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 20,
                    str(val), ha='center', va='bottom', fontsize=14, fontweight='bold', color=BRAND_TEXT)
    axes[0].set_ylabel('Number of Samples', fontsize=12)
    axes[0].set_title('Class Distribution', fontweight='bold')

    # Pie chart
    wedges, texts, autotexts = axes[1].pie(
        counts.values, labels=class_names, colors=colors,
        autopct='%1.1f%%', startangle=90, textprops={'fontsize': 12, 'color': BRAND_TEXT},
        wedgeprops={'edgecolor': '#1e293b', 'linewidth': 2}
    )
    for autotext in autotexts:
        autotext.set_fontweight('bold')
    axes[1].set_title(f'Total: {len(labels)} samples', fontweight='bold')

    plt.tight_layout()
    path = os.path.join(CHARTS_DIR, 'dataset_distribution.png')
    fig.savefig(path, dpi=200, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"   ✅ Saved: {path}")


# ═══════════════════════════════════════════════════════════
#  CHART 8: Score Distribution Histogram
# ═══════════════════════════════════════════════════════════
def plot_score_distributions(val_padded, val_labels, mobile_model):
    print("📊 Generating Threat Score Distribution...")

    scores = mobile_model.predict(val_padded, verbose=0).flatten()
    safe_scores   = scores[val_labels == 0]
    threat_scores = scores[val_labels == 1]

    fig, ax = plt.subplots(figsize=(10, 6))
    ax.set_title('Mobile Model — Threat Score Distribution by True Class',
                fontsize=15, fontweight='bold', pad=12)

    ax.hist(safe_scores,   bins=50, alpha=0.7, color=BRAND_SECONDARY, label='True Safe',   edgecolor='white', linewidth=0.3)
    ax.hist(threat_scores, bins=50, alpha=0.7, color=BRAND_DANGER,    label='True Threat',  edgecolor='white', linewidth=0.3)

    # Threshold line
    ax.axvline(x=0.65, color=BRAND_ACCENT, linestyle='--', linewidth=2.5,
              label='Threshold (0.65)')
    ax.text(0.66, ax.get_ylim()[1] * 0.9, '← Safe  |  Threat →',
           fontsize=10, color=BRAND_ACCENT, fontweight='bold')

    ax.set_xlabel('Predicted Threat Score', fontsize=13)
    ax.set_ylabel('Count', fontsize=13)
    ax.legend(fontsize=12, framealpha=0.8)

    plt.tight_layout()
    path = os.path.join(CHARTS_DIR, 'score_distribution.png')
    fig.savefig(path, dpi=200, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"   ✅ Saved: {path}")


# ═══════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════
if __name__ == '__main__':
    print("=" * 60)
    print("🛡️  SentriZK ML Chart Generator")
    print("=" * 60)

    val_padded, val_labels, val_texts, pc_model, mobile_model, tokenizer, all_texts, all_labels = load_data_and_models()

    # Retrain to capture history curves
    pc_history, mobile_history, pc_retrained, mobile_retrained, val_pad2, val_lab2 = \
        retrain_and_get_history(all_texts, all_labels, tokenizer)

    # Generate all charts
    plot_confusion_matrices(val_padded, val_labels, pc_model, mobile_model)
    plot_training_curves(pc_history, mobile_history)
    plot_roc_curves(val_padded, val_labels, pc_model, mobile_model)
    plot_pr_curves(val_padded, val_labels, pc_model, mobile_model)
    plot_classification_report_chart(val_padded, val_labels, pc_model, mobile_model)
    plot_model_comparison(val_padded, val_labels, pc_model, mobile_model)
    plot_dataset_distribution(all_labels)
    plot_score_distributions(val_padded, val_labels, mobile_model)

    print("\n" + "=" * 60)
    print(f"✅ All charts saved to: {CHARTS_DIR}")
    print("=" * 60)
    print("\nGenerated files:")
    for f in sorted(os.listdir(CHARTS_DIR)):
        fpath = os.path.join(CHARTS_DIR, f)
        print(f"   📈 {f}  ({os.path.getsize(fpath)/1024:.1f} KB)")
