import os
import time
import pickle
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.sequence import pad_sequences
from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich.prompt import Prompt

console = Console()

class SentriZKTester:
    def __init__(self):
        self.BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        # CRITICAL FIX: Go up two levels (../../) to reach the main ML folder
        # STABLE PATH: Pointing to the new production subfolder
        self.MODELS_DIR = os.path.abspath(os.path.join(self.BASE_DIR, "../../models/production")) 
        self.tokenizer = None
        self.model = None 
        self.model_label = "Unknown"
        self.MAX_LEN = 120
        
    def load_engine(self, model_choice):
        """Loads the selected Keras model and Tokenizer"""
        try:
            # Model Selection Logic
            if model_choice == "1":
                model_name = 'sentrizk_research_model.keras'
                self.model_label = "RESEARCH (Bi-LSTM)"
                style = "bold yellow"
            else:
                model_name = 'sentrizk_production_model.keras'
                self.model_label = "PRODUCTION (Conv1D)"
                style = "bold cyan"

            with console.status(f"[bold white]Initializing {self.model_label} Engine..."):
                # 1. Load Tokenizer
                token_path = os.path.join(self.MODELS_DIR, 'sentrizk_tokenizer.pickle')
                if not os.path.exists(token_path):
                    raise FileNotFoundError(f"Tokenizer not found at {token_path}")
                with open(token_path, 'rb') as handle:
                    self.tokenizer = pickle.load(handle)
                
                # 2. Load Native Keras Model (Bypasses Windows TFLite Flex Delegate Error)
                model_path = os.path.join(self.MODELS_DIR, model_name)
                if not os.path.exists(model_path):
                    raise FileNotFoundError(f"Model not found at {model_path}")
                self.model = tf.keras.models.load_model(model_path)
                
                # 3. Warmup inference
                self._predict("warmup")
                
            console.print(Panel(f"[bold green]✔ {self.model_label} Online[/bold green]\nReady for interactive testing.", border_style="green"))
            return True
            
        except Exception as e:
            console.print(Panel(f"[bold red]System Failure[/bold red]\n{str(e)}", border_style="red"))
            return False

    def _predict(self, text):
        """Internal prediction logic using Native Keras"""
        seq = self.tokenizer.texts_to_sequences([str(text)])
        padded = pad_sequences(seq, maxlen=self.MAX_LEN, padding='post', truncating='post').astype(np.float32)
        
        # Simple prediction call
        score = self.model.predict(padded, verbose=0)[0][0]
        return score

    def start_session(self):
        """Main Interactive Loop"""
        console.clear()
        console.print(Panel.fit(
            f"[bold white]SentriZK Interactive Sandbox ({self.model_label})[/bold white]\n"
            "[dim]Type any message to scan it. Type 'exit' to quit.[/dim]",
            style="blue"
        ))

        while True:
            # 1. Get User Input
            console.print(f"\n[bold cyan]┌──({self.model_label})[/bold cyan]")
            user_input = Prompt.ask("[bold cyan]└─>[/bold cyan] Enter message")

            if user_input.lower() in ['exit', 'quit', 'q']:
                console.print("[yellow]Shutting down SentriZK...[/yellow]")
                break
            
            if not user_input.strip():
                continue

            # 2. Run Scan with Animation
            with console.status("[bold magenta]Scanning content...[/bold magenta]", spinner="dots"):
                time.sleep(0.4) # Artificial delay for "effect"
                score = self._predict(user_input)

            # 3. Display Results
            self.display_result(score)

    def display_result(self, score):
        """Visualizes the threat score"""
        percentage = score * 100
        
        # Determine Status
        if score > 0.5:
            status = "⚠️ THREAT DETECTED"
            style = "bold red"
            bar_color = "red"
        else:
            status = "✅ MESSAGE SAFE"
            style = "bold green"
            bar_color = "green"

        # Create a visual bar
        bar_length = 40
        filled_length = int(bar_length * score)
        bar = "█" * filled_length + "░" * (bar_length - filled_length)

        # Build the output panel
        content = Text()
        content.append(f"\n{status}\n", style=f"{style} underline")
        content.append(f"Confidence: {percentage:.2f}%\n", style="white")
        content.append(f"Risk Level: [{bar}]", style=bar_color)
        
        console.print(Panel(content, border_style=bar_color, title=f"Scan Result ({self.model_label})"))

if __name__ == "__main__":
    console.clear()
    console.print(Panel.fit(
        "[bold cyan]SentriZK Machine Learning Sandbox[/bold cyan]\n"
        "[1] Research Engine (Bi-LSTM)\n"
        "[2] Production Engine (Conv1D)",
        title="Engine Selector"
    ))
    
    choice = Prompt.ask("Choose engine", choices=["1", "2"], default="2")
    
    tester = SentriZKTester()
    if tester.load_engine(choice):
        tester.start_session()