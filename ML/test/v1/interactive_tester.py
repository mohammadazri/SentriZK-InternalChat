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
from rich.layout import Layout

console = Console()

class SentriZKTester:
    def __init__(self):
        self.BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        self.MODELS_DIR = os.path.join(self.BASE_DIR, "../../models")
        self.tokenizer = None
        self.interpreter = None
        self.input_details = None
        self.output_details = None
        self.MAX_LEN = 100
        
    def load_engine(self):
        """Loads the TFLite model and Tokenizer"""
        try:
            with console.status("[bold cyan]Initializing SentriZK Engine..."):
                # Load Tokenizer
                token_path = os.path.join(self.MODELS_DIR, 'sentrizk_tokenizer.pickle')
                with open(token_path, 'rb') as handle:
                    self.tokenizer = pickle.load(handle)
                
                # Load Model
                model_path = os.path.join(self.MODELS_DIR, 'sentrizk_model.tflite')
                self.interpreter = tf.lite.Interpreter(model_path=model_path)
                self.interpreter.allocate_tensors()
                
                self.input_details = self.interpreter.get_input_details()
                self.output_details = self.interpreter.get_output_details()
                
                # Warmup inference
                self._predict("warmup")
                
            console.print(Panel("[bold green]✔ System Online[/bold green]\nReady for interactive testing.", border_style="green"))
            return True
            
        except Exception as e:
            console.print(Panel(f"[bold red]System Failure[/bold red]\n{str(e)}", border_style="red"))
            return False

    def _predict(self, text):
        """Internal prediction logic"""
        seq = self.tokenizer.texts_to_sequences([str(text)])
        padded = pad_sequences(seq, maxlen=self.MAX_LEN, padding='post', truncating='post').astype(np.float32)
        
        self.interpreter.set_tensor(self.input_details[0]['index'], padded)
        self.interpreter.invoke()
        output_data = self.interpreter.get_tensor(self.output_details[0]['index'])
        return output_data[0][0]

    def start_session(self):
        """Main Interactive Loop"""
        console.clear()
        console.print(Panel.fit(
            "[bold white]SentriZK Interactive Sandbox[/bold white]\n"
            "[dim]Type any message to scan it. Type 'exit' to quit.[/dim]",
            style="blue"
        ))

        while True:
            # 1. Get User Input
            console.print("\n[bold cyan]┌──(Tester)[/bold cyan]")
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
        
        console.print(Panel(content, border_style=bar_color, title="Scan Result"))

if __name__ == "__main__":
    tester = SentriZKTester()
    if tester.load_engine():
        tester.start_session()