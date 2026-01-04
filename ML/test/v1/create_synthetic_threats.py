import pandas as pd
import os
from rich.console import Console

console = Console()

def generate_synthetic_data():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    OUTPUT_DIR = os.path.join(BASE_DIR, "../../DataSet")
    
    # These are specific "Spear Phishing" examples missing from standard SMS spam lists
    synthetic_threats = [
        "URGENT: Your payroll has been suspended. Login to verify: bit.ly/fake",
        "IT ALERT: Unusual login detected. Click here to secure your account.",
        "HR Notice: Please update your direct deposit information immediately.",
        "Final Warning: Your email password expires in 2 hours. Reset now.",
        "Security Alert: A new device signed in to your work account.",
        "Review the attached invoice #9923 immediately.",
        "Your office 365 account will be locked. Verify credentials.",
        "Employee Benefits: Open enrollment ends today. Sign up here.",
        "Confidential: Salary adjustment letter attached. Please review.",
        "Admin: Storage limit reached. Upgrade your quota to avoid data loss."
    ]
    
    # We create a DataFrame
    df = pd.DataFrame(synthetic_threats, columns=['text'])
    df['label'] = 1 # Mark as THREAT
    
    # BOOSTING: Repeat these 50 times so the model REALLY learns them
    # This outweighs the thousands of safe "payroll" emails in Enron
    df_boosted = pd.concat([df] * 50, ignore_index=True)
    
    output_path = os.path.join(OUTPUT_DIR, "synthetic_threats.csv")
    df_boosted.to_csv(output_path, index=False)
    
    console.print(f"[bold green]✔ Generated {len(df_boosted)} synthetic corporate threats![/bold green]")
    console.print(f"Saved to: {output_path}")

if __name__ == "__main__":
    generate_synthetic_data()