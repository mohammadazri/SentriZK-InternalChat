import os
import pickle
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.sequence import pad_sequences
from rich.console import Console
from rich.table import Table

console = Console()

def run_test():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    MODELS_DIR = os.path.join(BASE_DIR, "models")
    
    # Load Tokenizer
    with open(os.path.join(MODELS_DIR, 'sentrizk_tokenizer.pickle'), 'rb') as handle:
        tokenizer = pickle.load(handle)
        
    # Load Model (TFLite or Keras, here we use Interpreter to simulate Mobile)
    interpreter = tf.lite.Interpreter(model_path=os.path.join(MODELS_DIR, 'sentrizk_model.tflite'))
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    # Test Cases
    test_cases = [
        "Hey bro, lunch at 1pm?",
        "Please send the report by EOD.",
        "URGENT: Payroll suspended. Login to verify: bit.ly/fake",
        "Your account password expires today. Click here to reset.",
        "I will be late for the meeting, traffic is bad."
    ]

    table = Table(title="SentriZK Supervised Classification Audit")
    table.add_column("Message", style="dim", width=50)
    table.add_column("Threat Probability", justify="right")
    table.add_column("Verdict", justify="center")

    for msg in test_cases:
        # Preprocess exactly like training
        seq = tokenizer.texts_to_sequences([msg])
        padded = pad_sequences(seq, maxlen=100, padding='post', truncating='post').astype(np.float32)
        
        # Run Inference
        interpreter.set_tensor(input_details[0]['index'], padded)
        interpreter.invoke()
        output_data = interpreter.get_tensor(output_details[0]['index'])
        
        score = output_data[0][0]
        
        # High Accuracy Threshold strategy
        # If probability > 80%, it is a threat.
        is_threat = score > 0.8
        status = "[bold red]⚠️ THREAT[/bold red]" if is_threat else "[bold green]✅ SAFE[/bold green]"
        
        table.add_row(msg, f"{score:.4f}", status)

    console.print(table)

if __name__ == "__main__":
    run_test()