import os
import pickle
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# CRITICAL FIX: Go up two levels (../../) to reach the main ML/models folder
MODELS_DIR = os.path.abspath(os.path.join(BASE_DIR, "../../models"))

# Load the Python Tokenizer
with open(os.path.join(MODELS_DIR, 'sentrizk_tokenizer.pickle'), 'rb') as f:
    tokenizer = pickle.load(f)

# Save just the word dictionary as a JSON file
with open(os.path.join(MODELS_DIR, 'vocab.json'), 'w') as f:
    json.dump(tokenizer.word_index, f)

print(f"✅ vocab.json successfully created in:\n{MODELS_DIR}")

